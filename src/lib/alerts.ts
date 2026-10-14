import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/server";
import { renderEmail, type EmailContent } from "@/lib/email/layout";
import { notify } from "@/lib/email/send";

/** Bearer CRON_SECRET — for cron endpoints and the GitHub Actions workflows */
export function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

export function alertSmtpConfigured() {
  return !!(process.env.ALERT_SMTP_HOST && process.env.ALERT_SMTP_USER && process.env.ALERT_SMTP_PASS);
}

/** active admins: ids for in-app notifications, emails for alert mails */
export async function adminRecipients() {
  const { data } = await createAdminClient().from("profiles").select("id, email").eq("role", "admin").eq("is_active", true);
  return { ids: (data ?? []).map((p) => p.id as string), emails: (data ?? []).map((p) => p.email as string).filter(Boolean) };
}

/**
 * System alerts (backup failed, email quota, repeated send failures). In-app notification to every admin + an email.
 * The email goes through ALERT_SMTP_* when configured — the main account may be the thing that's blocked —
 * otherwise through the main SMTP account, directly (never queued behind the quota).
 */
export async function alertAdmins(a: { type: string; title: string; body: string; link?: string; extraEmails?: string[]; facts?: EmailContent["facts"] }) {
  const { ids, emails } = await adminRecipients();
  await notify(ids, { type: a.type, title: a.title, body: a.body, link: a.link });

  const to = [...new Set([...emails, ...(a.extraEmails ?? [])].map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!to.length) return { emailed: false, reason: "no recipients" };
  const alt = alertSmtpConfigured();
  const host = alt ? process.env.ALERT_SMTP_HOST : process.env.SMTP_HOST;
  const user = alt ? process.env.ALERT_SMTP_USER : process.env.SMTP_USER;
  const pass = alt ? process.env.ALERT_SMTP_PASS : process.env.SMTP_PASS;
  if (!host || !user || !pass) return { emailed: false, reason: "SMTP is not configured" };
  const port = Number((alt ? process.env.ALERT_SMTP_PORT : process.env.SMTP_PORT) || 587);
  const from = (alt ? process.env.ALERT_MAIL_FROM : process.env.MAIL_FROM) || user;
  const { html, text } = renderEmail({ heading: a.title, body: [a.body], facts: a.facts, cta: a.link ? { label: "Open", url: a.link } : undefined }, "Synerax TalentBase alerts");
  let status: "sent" | "failed" = "sent";
  let error: string | null = null;
  try {
    await nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }).sendMail({ from, to: to.join(", "), subject: `[Alert] ${a.title}`, html, text });
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message.slice(0, 500) : "Unknown error";
    console.error("alert email failed", error);
  }
  // logged with the other emails, but never counted against the main account's quota when sent through ALERT_SMTP
  await createAdminClient()
    .from("emails")
    .insert(to.map((to_email) => ({ to_email, template: "system_alert", subject: `[Alert] ${a.title}`, status, last_error: error, attempts: 1, provider: alt ? "alert_smtp" : "smtp", sent_at: status === "sent" ? new Date().toISOString() : null })))
    .then(({ error: e }) => e && console.error("alert log failed", e.message));
  return { emailed: status === "sent", reason: error ?? undefined };
}
