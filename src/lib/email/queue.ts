import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { createAdminClient } from "@/lib/supabase/server";
import { alertAdmins } from "@/lib/alerts";
import { siteUrl } from "./layout";
import { QUOTA_DEFAULTS, afterFailure, dueQuotaAlerts, failureAlertDue, quotaStatus, sendCapacity, type QuotaSettings, type QuotaUsage } from "./quota-logic";

/**
 * Email queue worker. Every email is a row in public.emails:
 *   queued → sending → sent  (or → queued again with exponential backoff → failed after max_attempts)
 *   sent → bounced (bounce reader) · skipped = event turned off / SMTP not configured
 * Nothing is sent past the provider's rolling limit: rows simply stay queued and go out when capacity frees up.
 */

export type QueuedEmail = {
  id: string;
  to_email: string;
  subject: string | null;
  html: string | null;
  text_body: string | null;
  attachments: { filename: string; content: string; contentType?: string }[] | null;
  attempts: number;
  max_attempts: number;
};

// ---------------------------------------------------------------- sender accounts
/**
 * Where an email is sent from. Today there is one account (SMTP_*).
 * TODO(alternate sender): add a second SenderAccount (e.g. ALT_SMTP_*) and return it from pickSender() when the
 * primary is paused or over its limit — quota is tracked per `provider`, so give it its own name and email_quota row.
 */
export interface SenderAccount {
  name: string; // stored in emails.provider
  from: string;
  transport: Transporter;
}

let primary: SenderAccount | null = null;
export function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
function pickSender(senderName: string): SenderAccount {
  if (!primary) {
    const port = Number(process.env.SMTP_PORT || 587);
    primary = {
      name: "smtp",
      from: "",
      transport: nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }),
    };
  }
  const fromAddr = process.env.MAIL_FROM || process.env.SMTP_USER!;
  return { ...primary, from: fromAddr.includes("<") ? fromAddr : `"${senderName.replace(/"/g, "")}" <${fromAddr}>` };
}

// ---------------------------------------------------------------- quota
export async function loadQuota(): Promise<{ settings: QuotaSettings; usage: QuotaUsage }> {
  const admin = createAdminClient();
  const [{ data: q }, { data: u }] = await Promise.all([admin.from("email_quota").select("*").eq("id", 1).maybeSingle(), admin.rpc("email_quota_usage")]);
  return {
    settings: { ...QUOTA_DEFAULTS, ...(q ?? {}), alerts_state: (q?.alerts_state as Record<string, string>) ?? {} },
    usage: { used: 0, oldest_in_window: null, last_hour: 0, queued: 0, ...((u ?? {}) as Partial<QuotaUsage>) },
  };
}

const fmt = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

/** threshold (80/90 %) and limit-reached alerts — each once per rolling window */
export async function checkQuotaAlerts() {
  const { settings, usage } = await loadQuota();
  const st = quotaStatus(settings, usage);
  const { due, state } = dueQuotaAlerts(settings, st.pct);
  if (!due.length) return [];
  await createAdminClient().from("email_quota").update({ alerts_state: state }).eq("id", 1);
  const top = Math.max(...due);
  const facts = [
    { label: "Provider", value: settings.provider_name },
    { label: `Used (last ${settings.window_hours}h)`, value: `${st.used} of ${st.limit} (${st.pct}%)` },
    { label: "Waiting in queue", value: String(st.queued) },
    { label: top >= 100 ? "Sending resumes" : "Projected to hit the limit", value: fmt(top >= 100 ? st.resumeAt : st.projectedLimitAt) },
  ];
  await alertAdmins({
    type: "email_quota",
    title: top >= 100 ? `Email limit reached — sending paused (${settings.provider_name})` : `Email quota ${top}% used`,
    body:
      top >= 100
        ? "No emails are lost: new emails stay in the queue and go out automatically as soon as the rolling window frees up capacity."
        : `${st.used} of ${st.limit} emails used in the last ${settings.window_hours} hours.`,
    link: "/admin/email/analytics",
    extraEmails: settings.alert_emails,
    facts,
  });
  return due;
}

async function recordResult(ok: boolean, quotaError: boolean, error?: string) {
  const admin = createAdminClient();
  const { data: q } = await admin.from("email_quota").select("*").eq("id", 1).maybeSingle();
  if (!q) return;
  if (ok) {
    if (q.consecutive_failures) await admin.from("email_quota").update({ consecutive_failures: 0 }).eq("id", 1);
    return;
  }
  const s: QuotaSettings = { ...QUOTA_DEFAULTS, ...q, consecutive_failures: q.consecutive_failures + 1, alerts_state: (q.alerts_state as Record<string, string>) ?? {} };
  const patch: Record<string, unknown> = { consecutive_failures: s.consecutive_failures };
  if (quotaError) patch.paused_until = new Date(Date.now() + 30 * 60_000).toISOString(); // provider said "limit" → pause 30 min
  const alert = failureAlertDue(s, Date.now(), quotaError);
  if (alert) patch.alerts_state = { ...s.alerts_state, failures: new Date().toISOString() };
  await admin.from("email_quota").update(patch).eq("id", 1);
  if (alert) {
    await alertAdmins({
      type: "email_failures",
      title: quotaError ? `Mail server reported a sending limit (${s.provider_name})` : `${s.consecutive_failures} email sends failed in a row`,
      body: `${quotaError ? "Sending is paused for 30 minutes; emails stay queued and are retried automatically." : "Emails are being retried with backoff."} Last error: ${error ?? "unknown"}`.slice(0, 600),
      link: "/admin/email/analytics",
      extraEmails: s.alert_emails,
    });
  }
}

// ---------------------------------------------------------------- delivery
async function deliverOne(row: QueuedEmail, sender: SenderAccount) {
  const admin = createAdminClient();
  try {
    const info = await sender.transport.sendMail({
      from: sender.from,
      to: row.to_email,
      subject: row.subject ?? "",
      html: row.html ?? undefined,
      text: row.text_body ?? undefined,
      attachments: row.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content, "base64"), contentType: a.contentType })),
    });
    await admin
      .from("emails")
      .update({ status: "sent", sent_at: new Date().toISOString(), provider: sender.name, provider_message_id: info.messageId ?? null, last_error: null })
      .eq("id", row.id);
    await recordResult(true, false);
    return { ok: true as const };
  } catch (e) {
    const error = e instanceof Error ? e.message.slice(0, 500) : "Unknown error";
    const next = afterFailure(row.attempts, row.max_attempts, error);
    const quota = next.quota;
    await admin
      .from("emails")
      .update(next.update)
      .eq("id", row.id);
    console.error("email send failed", row.id, error);
    await recordResult(false, quota, error);
    return { ok: false as const, quota, error };
  }
}

/** send these freshly queued rows right away (if the quota allows) — used by sendEmail() */
export async function deliverNow(ids: string[], senderName: string) {
  if (!ids.length || !smtpConfigured()) return { sent: 0, queued: ids.length };
  const { settings, usage } = await loadQuota();
  let capacity = sendCapacity(settings, usage);
  const admin = createAdminClient();
  let sent = 0;
  let lastError: string | undefined;
  for (const id of ids) {
    if (capacity <= 0) break;
    // claim it (the cron worker might be looking at the same row)
    const { data: row } = await admin
      .from("emails")
      .update({ status: "sending", attempts: 1, next_attempt_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "queued")
      .select("id, to_email, subject, html, text_body, attachments, attempts, max_attempts")
      .maybeSingle();
    if (!row) continue;
    const r = await deliverOne(row as QueuedEmail, pickSender(senderName));
    if (r.ok) {
      sent++;
      capacity--;
    } else {
      lastError = r.error;
      if (r.quota) break;
    }
  }
  if (capacity <= 0 || usage.used + sent >= settings.daily_limit * 0.8) await checkQuotaAlerts().catch(() => {});
  return { sent, queued: ids.length - sent, error: lastError };
}

/** cron: send what's due, oldest first, never past the limit */
export async function processQueue(limit = 50, senderName = "Synerax TalentBase") {
  if (!smtpConfigured()) return { sent: 0, failed: 0, skipped: "SMTP is not configured" };
  const { settings, usage } = await loadQuota();
  const capacity = Math.min(limit, sendCapacity(settings, usage));
  const alerts = await checkQuotaAlerts().catch(() => []);
  if (capacity <= 0) return { sent: 0, failed: 0, paused: true, alerts };
  const { data, error } = await createAdminClient().rpc("claim_emails", { p_limit: capacity });
  if (error) throw new Error(error.message);
  const sender = pickSender(senderName);
  let sent = 0;
  let failed = 0;
  const rows = (data ?? []) as QueuedEmail[];
  for (let i = 0; i < rows.length; i++) {
    const r = await deliverOne(rows[i], sender);
    if (r.ok) sent++;
    else {
      failed++;
      if (r.quota) {
        // provider says stop: put the rest of this batch back untouched
        for (const x of rows.slice(i + 1)) {
          await createAdminClient().from("emails").update({ status: "queued", attempts: Math.max(0, x.attempts - 1) }).eq("id", x.id);
        }
        break;
      }
    }
  }
  return { sent, failed, claimed: rows.length, alerts };
}

export const trackingBase = () => siteUrl();
