import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { createAdminClient } from "@/lib/supabase/server";
import { renderEmail, type EmailContent } from "./layout";
import type { EmailEventKey } from "./events";

/**
 * Provider-agnostic email over SMTP (Gmail app password, Resend SMTP, …).
 * sendEmail() never throws — a failed email must never break the user's action.
 * Every attempt is written to email_log.
 */

let transport: Transporter | null = null;

export function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (transport) return transport;
  const port = Number(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

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
}): Promise<{ status: "sent" | "failed" | "skipped"; error?: string }> {
  const recipients = (Array.isArray(opts.to) ? opts.to : [opts.to]).map((x) => x.trim()).filter(Boolean);
  if (!recipients.length) return { status: "skipped", error: "No recipient" };
  const admin = createAdminClient();
  if (opts.dedupeKey && (await alreadySent(opts.dedupeKey))) return { status: "skipped", error: "Already sent" };

  let status: "sent" | "failed" | "skipped" = "sent";
  let error: string | undefined;
  try {
    const settings = opts.settings ?? (await getEmailSettings());
    if (!opts.force && !eventEnabled(settings, opts.event)) {
      status = "skipped";
      error = "Turned off in email settings";
    } else if (!smtpConfigured()) {
      status = "skipped";
      error = "SMTP is not configured";
    } else {
      const { html, text } = renderEmail(opts.content, settings.sender_name);
      const fromAddr = process.env.MAIL_FROM || process.env.SMTP_USER!;
      const from = fromAddr.includes("<") ? fromAddr : `"${settings.sender_name.replace(/"/g, "")}" <${fromAddr}>`;
      await getTransport().sendMail({ from, to: recipients.join(", "), subject: opts.subject, html, text, attachments: opts.attachments });
    }
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message.slice(0, 500) : "Unknown error";
    console.error("sendEmail failed", opts.event, error);
  }

  await admin
    .from("email_log")
    .insert(
      recipients.map((to) => ({
        to_email: to,
        template: opts.event,
        subject: opts.subject,
        status,
        error: error ?? null,
        dedupe_key: opts.dedupeKey ?? null,
        ...opts.related,
      }))
    )
    .then(({ error: logErr }) => logErr && console.error("email_log insert failed", logErr.message));

  return { status, error };
}

/** Has an email with this key already gone out (or been deliberately skipped)? Failed sends may be retried. */
export async function alreadySent(key: string, prefix = false) {
  const q = createAdminClient().from("email_log").select("id", { head: true, count: "exact" }).neq("status", "failed");
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
