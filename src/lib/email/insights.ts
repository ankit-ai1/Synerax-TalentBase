import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { alertAdmins, adminRecipients } from "@/lib/alerts";
import { EMAIL_EVENTS } from "./events";
import { sendEmail } from "./send";
import { loadQuota } from "./queue";
import { quotaStatus } from "./quota-logic";
import { bestWorst, endOfIstDay, spike, templateStats, type AEmail, type AEvent, type Audience } from "./analytics";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const audienceOf = (t: string): Audience => (EMAIL_EVENTS.find((e) => e.key === t)?.audience as Audience) ?? (t === "system_alert" ? "system" : "synerax");
export const LABEL: Record<string, string> = { ...Object.fromEntries(EMAIL_EVENTS.map((e) => [e.key, e.label])), system_alert: "System alert" };

export type XEmail = AEmail & { candidate_id: string | null; client_id: string | null; job_id: string | null; application_id: string | null; last_error?: string | null; bounce_reason?: string | null; attempts?: number; subject?: string | null };
const COLS = "id, template, to_email, status, queued_at, sent_at, opened_at, clicked_at, bounced_at, candidate_id, client_id, job_id, application_id, last_error, bounce_reason, attempts, subject";

async function emailsBetween(fromIso: string, toIso: string) {
  const db = createAdminClient();
  const out: XEmail[] = [];
  for (let page = 0; page < 30; page++) {
    const { data } = await db.from("emails").select(COLS).gte("queued_at", fromIso).lte("queued_at", toIso).order("queued_at", { ascending: false }).range(page * 1000, page * 1000 + 999);
    out.push(...((data ?? []) as XEmail[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function eventsFor(ids: string[]) {
  const db = createAdminClient();
  const out: AEvent[] = [];
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from("email_events").select("email_id, kind, at, url").in("email_id", ids.slice(i, i + 300)).in("kind", ["open", "click"]);
    out.push(...((data ?? []) as AEvent[]));
  }
  return out;
}

/** which sent emails were followed by a real action within 7 days (see analytics.ts for the definition) */
async function actionsFor(emails: XEmail[]) {
  const db = createAdminClient();
  const done = new Set<string>();
  const WEEK = 7 * 86400e3;
  const within = (sent: string, at: string | null | undefined) => !!at && new Date(at).getTime() >= new Date(sent).getTime() && new Date(at).getTime() <= new Date(sent).getTime() + WEEK;
  const sent = emails.filter((e) => e.sent_at);
  const cand = sent.filter((e) => audienceOf(e.template) === "candidate" && e.candidate_id);
  const cl = sent.filter((e) => audienceOf(e.template) === "client" && (e.application_id || e.job_id));
  const candIds = [...new Set(cand.map((e) => e.candidate_id!))];
  for (let i = 0; i < candIds.length; i += 200) {
    const ids = candIds.slice(i, i + 200);
    const [{ data: apps }, { data: cands }] = await Promise.all([
      db.from("applications").select("candidate_id, created_at").in("candidate_id", ids).eq("origin", "Candidate applied"),
      db.from("candidates").select("id, updated_at").in("id", ids),
    ]);
    for (const e of cand.filter((x) => ids.includes(x.candidate_id!))) {
      const applied = (apps ?? []).some((a: any) => a.candidate_id === e.candidate_id && within(e.sent_at!, a.created_at));
      const updated = (cands ?? []).some((c: any) => c.id === e.candidate_id && within(e.sent_at!, c.updated_at));
      if (applied || updated) done.add(e.id);
    }
  }
  const appIds = [...new Set(cl.map((e) => e.application_id).filter(Boolean))] as string[];
  const jobIds = [...new Set(cl.map((e) => e.job_id).filter(Boolean))] as string[];
  const decisions: any[] = [];
  for (let i = 0; i < appIds.length; i += 200) decisions.push(...(((await db.from("applications").select("id, job_id, client_decision_at").in("id", appIds.slice(i, i + 200)).not("client_decision_at", "is", null)).data ?? []) as any[]));
  for (let i = 0; i < jobIds.length; i += 200) decisions.push(...(((await db.from("applications").select("id, job_id, client_decision_at").in("job_id", jobIds.slice(i, i + 200)).not("client_decision_at", "is", null)).data ?? []) as any[]));
  for (const e of cl) {
    if (decisions.some((d) => (d.id === e.application_id || d.job_id === e.job_id) && within(e.sent_at!, d.client_decision_at))) done.add(e.id);
  }
  return done;
}

export async function loadAnalytics(fromIso: string, toIso: string) {
  const span = new Date(toIso).getTime() - new Date(fromIso).getTime();
  const prevFrom = new Date(new Date(fromIso).getTime() - span - 1).toISOString();
  const prevTo = new Date(new Date(fromIso).getTime() - 1).toISOString();
  const [cur, prev] = await Promise.all([emailsBetween(fromIso, toIso), emailsBetween(prevFrom, prevTo)]);
  const [events, actions, prevActions] = await Promise.all([eventsFor(cur.map((e) => e.id)), actionsFor(cur), actionsFor(prev)]);
  return { cur, prev, events, actions, prevActions, prevFrom, prevTo };
}

/** recipients' recent history (for "never opened in the last 5 emails") */
export async function recentHistory(days = 180) {
  return emailsBetween(new Date(Date.now() - days * 86400e3).toISOString(), new Date().toISOString());
}

// ---------------------------------------------------------------- anomaly alerts (cron, every 10 min)
const HOUR = 3600e3;
const istDay = (t = Date.now()) => new Date(t + 5.5 * HOUR).toISOString().slice(0, 10);
const istTime = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });

export async function checkAnomalies() {
  const db = createAdminClient();
  const { settings, usage } = await loadQuota();
  const state = { ...settings.alerts_state };
  const fired: string[] = [];
  // 1) failure / bounce spike: last hour ≥ 3× the 7-day average
  const { data: rows } = await db.from("emails").select("status, queued_at").gte("queued_at", new Date(Date.now() - 7 * 24 * HOUR).toISOString()).neq("status", "skipped").limit(20000);
  const bad = (r: any) => r.status === "failed" || r.status === "bounced";
  const lastHour = (rows ?? []).filter((r: any) => new Date(r.queued_at).getTime() > Date.now() - HOUR);
  const s = spike({ total: lastHour.length, bad: lastHour.filter(bad).length }, { total: (rows ?? []).length, bad: (rows ?? []).filter(bad).length });
  const lastSpike = state.spike ? new Date(state.spike).getTime() : 0;
  if (s && Date.now() - lastSpike > HOUR) {
    state.spike = new Date().toISOString();
    fired.push("spike");
    await alertAdmins({
      type: "email_anomaly",
      title: `Email failures spiking: ${s.rate}% in the last hour`,
      body: `Failures + bounces in the last hour are ${s.factor ? `${s.factor}× ` : "far above "}the 7-day average (${s.avg}%). Check the mail account and the failure list.`,
      link: "/admin/email/analytics#health",
      extraEmails: settings.alert_emails,
    });
  }
  // 2) quota projected to run out before the end of today (IST)
  const st = quotaStatus(settings, usage);
  const key = `runout:${istDay()}`;
  if (st.projectedLimitAt && st.projectedLimitAt < endOfIstDay() && !state[key]) {
    state[key] = new Date().toISOString();
    fired.push("runout");
    await alertAdmins({
      type: "email_quota",
      title: `Email limit will run out today at about ${istTime(st.projectedLimitAt)} IST`,
      body: `${st.used} of ${st.limit} used in the rolling window, ~${st.perHour}/hour. After that, emails wait in the queue until capacity frees up.`,
      link: "/admin/email/analytics",
      extraEmails: settings.alert_emails,
    });
  }
  if (fired.length) {
    for (const k of Object.keys(state)) if (k.startsWith("runout:") && k !== key) delete state[k];
    await db.from("email_quota").update({ alerts_state: state }).eq("id", 1);
  }
  return fired;
}

// ---------------------------------------------------------------- weekly summary (Monday 09:00 IST, from the daily cron)
export async function weeklySummary(force = false) {
  const istNow = new Date(Date.now() + 5.5 * HOUR);
  if (!force && istNow.getUTCDay() !== 1) return { skipped: "not Monday" };
  const to = new Date().toISOString();
  const from = new Date(Date.now() - 7 * 24 * HOUR).toISOString();
  const { cur, prev, actions, prevActions } = await loadAnalytics(from, to);
  const rows = templateStats(cur, audienceOf, actions);
  const prevRows = templateStats(prev, audienceOf, prevActions);
  const sum = (rs: typeof rows, k: "sent" | "opened" | "clicked" | "bounced") => rs.reduce((a, r) => a + r[k], 0);
  const sent = sum(rows, "sent"), opened = sum(rows, "opened"), clicked = sum(rows, "clicked"), bounced = sum(rows, "bounced");
  const failed = cur.filter((e) => e.status === "failed").length;
  const prevSent = sum(prevRows, "sent");
  const { best, worst } = bestWorst(rows);
  const { count: newSup } = await createAdminClient().from("email_suppressions").select("email", { count: "exact", head: true }).gte("created_at", from);
  const p = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "—");
  const issues = [
    failed && `${failed} email${failed === 1 ? "" : "s"} failed`,
    bounced && `${bounced} bounced`,
    newSup && `${newSup} address${newSup === 1 ? "" : "es"} added to the suppression list`,
  ].filter(Boolean) as string[];
  const { emails } = await adminRecipients();
  if (!emails.length) return { skipped: "no admins" };
  await sendEmail({
    to: emails,
    event: "admin_weekly_summary",
    force: true,
    dedupeKey: `weekly-summary:${istDay()}`,
    subject: `Email summary: ${sent} sent last week · ${p(opened, sent)} opened`,
    content: {
      heading: "Your weekly email summary",
      body: [
        `Last 7 days: ${sent} emails delivered${prevSent ? ` (${sent >= prevSent ? "+" : ""}${sent - prevSent} vs the week before)` : ""}. Opens are approximate.`,
        issues.length ? `Needs a look: ${issues.join(" · ")}.` : "No delivery issues this week.",
      ],
      facts: [
        { label: "Delivered", value: String(sent) },
        { label: "Opened", value: `${opened} (${p(opened, sent)})` },
        { label: "Clicked", value: `${clicked} (${p(clicked, sent)})` },
        { label: "Bounced / failed", value: `${bounced} / ${failed}` },
        ...(best ? [{ label: "Best template", value: LABEL[best] ?? best }] : []),
        ...(worst ? [{ label: "Weakest template", value: LABEL[worst] ?? worst }] : []),
      ],
      cta: { label: "Open email analytics", url: "/admin/email/analytics" },
    },
  });
  return { sent: true };
}
