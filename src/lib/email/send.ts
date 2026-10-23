import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { renderEmail, type EmailContent } from "./layout";
import type { EmailEventKey } from "./events";
import { deliverNow, smtpConfigured, trackingBase } from "./queue";
import { addTracking, addUnsubscribe, newTrackToken, unsubscribeUrl } from "./tracking";

export { smtpConfigured };

/**
 * Provider-agnostic email over SMTP (Gmail app password, Resend SMTP, …).
 * sendEmail() never throws — a failed email must never break the user's action.
 * Every email goes through the queue (public.emails): it is sent right away when the quota allows,
 * otherwise the cron worker (/api/cron/email) sends it later with retries. Opens/clicks are tracked per recipient.
 */

export type EmailSettings = { sender_name: string; notify_emails: string[]; events: Record<string, boolean> };

export async function getEmailSettings(): Promise<EmailSettings> {
  const { data } = await createAdminClient().from("email_settings").select("sender_name, notify_emails, events").eq("id", 1).maybeSingle();
  const envInbox = (process.env.SYNERAX_NOTIFY_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    sender_name: data?.sender_name || "Synerax TalentBase",
    notify_emails: data?.notify_emails?.length ? data.notify_emails : envInbox,
    events: (data?.events as Record<string, boolean>) ?? {},
  };
}

export const eventEnabled = (s: EmailSettings, key: EmailEventKey) => s.events[key] !== false;

type Related = { user_id?: string | null; candidate_id?: string | null; client_id?: string | null; job_id?: string | null; application_id?: string | null };

export async function sendEmail(opts: {
  to: string | string[];
  event: EmailEventKey;
  subject: string;
  content: EmailContent;
  related?: Related;
  attachments?: { filename: string; content: string | Buffer; contentType?: string }[];
  settings?: EmailSettings;
  /** bypass the per-event switch (used by the test button) */
  force?: boolean;
  /** send at most once per key (see alreadySent) */
  dedupeKey?: string;
  /** don't send now — leave it for the queue worker (steady rate, e.g. bulk invites) */
  queueOnly?: boolean;
}): Promise<{ status: "sent" | "queued" | "failed" | "skipped"; error?: string }> {
  const recipients = [...new Set((Array.isArray(opts.to) ? opts.to : [opts.to]).map((x) => x.trim()).filter(Boolean))];
  if (!recipients.length) return { status: "skipped", error: "No recipient" };
  try {
    if (opts.dedupeKey && (await alreadySent(opts.dedupeKey))) return { status: "skipped", error: "Already sent" };
    const admin = createAdminClient();
    const settings = opts.settings ?? (await getEmailSettings());
    const skip = !opts.force && !eventEnabled(settings, opts.event) ? "Turned off in email settings" : !smtpConfigured() ? "SMTP is not configured" : null;

    const { html, text } = renderEmail(opts.content, settings.sender_name);
    const attachments = opts.attachments?.map((a) => ({ filename: a.filename, contentType: a.contentType, content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : Buffer.from(a.content).toString("base64") }));
    const base = trackingBase();
    // suppression list (hard bounces, repeated soft bounces, opt-outs, manual) — never emailed again
    const { data: sup } = await admin.from("email_suppressions").select("email, reason").in("email", recipients.map((r) => r.toLowerCase()));
    const suppressed = new Map((sup ?? []).map((s) => [s.email as string, s.reason as string]));
    const rows = recipients.map((to_email) => {
      const token = newTrackToken();
      const blocked = suppressed.get(to_email.toLowerCase());
      const why = skip ?? (blocked ? `Suppressed (${blocked.replace(/_/g, " ")})` : null);
      // invites / password links / alerts (force) are transactional — no unsubscribe line
      const body = opts.force ? html : addUnsubscribe(html, unsubscribeUrl(base, to_email));
      return {
        to_email,
        template: opts.event,
        subject: opts.subject,
        html: why ? null : addTracking(body, base, token),
        text_body: why ? null : text,
        attachments: why ? null : attachments ?? null,
        track_token: token,
        status: why ? "skipped" : "queued",
        last_error: why,
        dedupe_key: opts.dedupeKey ?? null,
        ...opts.related,
      };
    });
    const { data, error } = await admin.from("emails").insert(rows).select("id");
    if (error) throw new Error(error.message);
    if (skip) return { status: "skipped", error: skip };
    const live = (data ?? []).filter((_, i) => rows[i].status === "queued").map((x) => x.id as string);
    if (!live.length) return { status: "skipped", error: "Suppressed" };
    if (opts.queueOnly) return { status: "queued" };

    const r = await deliverNow(live, settings.sender_name);
    if (r.sent === live.length) return { status: "sent" };
    return { status: "queued", error: r.error };
  } catch (e) {
    const error = e instanceof Error ? e.message.slice(0, 500) : "Unknown error";
    console.error("sendEmail failed", opts.event, error);
    return { status: "failed", error };
  }
}

/** Has an email with this key already gone out, or been queued / deliberately skipped? Failed sends may be retried. */
export async function alreadySent(key: string, prefix = false) {
  const q = createAdminClient().from("emails").select("id", { head: true, count: "exact" }).neq("status", "failed");
  const { count } = await (prefix ? q.like("dedupe_key", `${key.replace(/[%_]/g, "")}%`) : q.eq("dedupe_key", key));
  return (count ?? 0) > 0;
}

/** In-app notification (service role — bypasses RLS on purpose; recipients are chosen server-side) */
export async function notify(userIds: (string | null | undefined)[], n: { type: string; title: string; body?: string; link?: string }) {
  const ids = [...new Set(userIds.filter(Boolean) as string[])];
  if (!ids.length) return;
  const { error } = await createAdminClient()
    .from("notifications")
    .insert(ids.map((user_id) => ({ user_id, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null })));
  if (error) console.error("notify failed", error.message);
}
