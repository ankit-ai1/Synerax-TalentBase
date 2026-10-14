/**
 * Pure email-queue rules (no I/O) — unit-tested in tests/backup-email.test.ts.
 * The worker (queue.ts) and the dashboard use these.
 */

export type QuotaSettings = {
  provider_name: string;
  daily_limit: number;
  window_hours: number;
  thresholds: number[];
  alert_emails: string[];
  failure_alert_after: number;
  consecutive_failures: number;
  paused_until: string | null;
  alerts_state: Record<string, string>;
};

export type QuotaUsage = { used: number; oldest_in_window: string | null; last_hour: number; queued: number };

export const QUOTA_DEFAULTS: QuotaSettings = {
  provider_name: "Gmail SMTP",
  daily_limit: 2000,
  window_hours: 24,
  thresholds: [80, 90],
  alert_emails: [],
  failure_alert_after: 5,
  consecutive_failures: 0,
  paused_until: null,
  alerts_state: {},
};

const HOUR = 3600_000;

/** limit / used / remaining / % / when capacity frees up / projected time to hit the limit at the current pace */
export function quotaStatus(s: QuotaSettings, u: QuotaUsage, now = Date.now()) {
  const limit = Math.max(1, s.daily_limit);
  const used = u.used;
  const remaining = Math.max(0, limit - used);
  const pct = Math.min(100, Math.round((used / limit) * 1000) / 10);
  const paused = !!s.paused_until && new Date(s.paused_until).getTime() > now;
  // the oldest email in the window leaves it after window_hours → one slot frees up
  const resumeAt = remaining === 0 && u.oldest_in_window ? new Date(new Date(u.oldest_in_window).getTime() + s.window_hours * HOUR) : null;
  // pace: emails in the last hour (fallback: average over the window)
  const perHour = u.last_hour > 0 ? u.last_hour : used / Math.max(1, s.window_hours);
  const projectedLimitAt = remaining > 0 && perHour > 0 ? new Date(now + (remaining / perHour) * HOUR) : null;
  return { limit, used, remaining, pct, paused, pausedUntil: paused ? s.paused_until : null, resumeAt, projectedLimitAt, perHour: Math.round(perHour * 10) / 10, queued: u.queued };
}

/** how many emails the worker may send right now */
export function sendCapacity(s: QuotaSettings, u: QuotaUsage, now = Date.now()) {
  const st = quotaStatus(s, u, now);
  return st.paused ? 0 : st.remaining;
}

/**
 * Threshold alerts (80 / 90 / … and 100 = limit reached), each at most once per rolling window.
 * Returns the levels to alert now and the new alerts_state.
 */
export function dueQuotaAlerts(s: QuotaSettings, pct: number, now = Date.now()) {
  const levels = [...new Set([...s.thresholds.filter((t) => t > 0 && t < 100), 100])].sort((a, b) => a - b);
  const windowMs = s.window_hours * HOUR;
  const state = { ...s.alerts_state };
  const due: number[] = [];
  for (const lvl of levels) {
    if (pct < lvl) continue;
    const last = state[String(lvl)] ? new Date(state[String(lvl)]).getTime() : 0;
    if (now - last >= windowMs) {
      due.push(lvl);
      state[String(lvl)] = new Date(now).toISOString();
    }
  }
  return { due, state };
}

/** N failures in a row (or a provider quota error) → alert, at most once an hour */
export function failureAlertDue(s: QuotaSettings, now = Date.now(), quotaError = false) {
  if (!quotaError && s.consecutive_failures < Math.max(1, s.failure_alert_after)) return false;
  const last = s.alerts_state.failures ? new Date(s.alerts_state.failures).getTime() : 0;
  return now - last >= HOUR;
}

/** SMTP answers that mean "you've hit the sending limit" — stop and keep the mail queued */
export function isQuotaError(msg: string | null | undefined) {
  return /daily (user )?sending (quota|limit)|sending limit exceeded|quota exceeded|rate limit|too many (messages|emails|recipients)|try again later|\b(421|450|451|452|454)\b|5\.4\.5|4\.7\.0|550[- ]5\.4\.5/i.test(msg ?? "");
}

/** retry delay: 1, 2, 4, 8 … minutes, capped at 6 hours */
export function backoffMs(attempts: number) {
  return Math.min(2 ** Math.max(0, attempts - 1) * 60_000, 6 * HOUR);
}

/**
 * What happens to an email after a failed send:
 *   provider quota error → back to the queue in 30 min without using up an attempt (not the email's fault)
 *   attempts left        → back to the queue after an exponential backoff
 *   out of attempts      → failed
 */
export function afterFailure(attempts: number, maxAttempts: number, error: string, now = Date.now()) {
  const quota = isQuotaError(error);
  if (quota) return { quota, update: { status: "queued" as const, attempts: Math.max(0, attempts - 1), next_attempt_at: new Date(now + 30 * 60_000).toISOString(), last_error: error } };
  if (attempts >= maxAttempts) return { quota, update: { status: "failed" as const, last_error: error } };
  return { quota, update: { status: "queued" as const, next_attempt_at: new Date(now + backoffMs(attempts)).toISOString(), last_error: error } };
}

export type EmailRow = {
  status: string;
  template: string;
  queued_at: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
};

/** dashboard numbers for a set of emails ("delivered" = accepted by the mail server) */
export function summarize(rows: EmailRow[]) {
  const by = (s: string) => rows.filter((r) => r.status === s).length;
  const sent = rows.filter((r) => r.sent_at).length; // includes ones that later bounced
  const opened = rows.filter((r) => r.opened_at).length;
  const clicked = rows.filter((r) => r.clicked_at).length;
  const total = rows.filter((r) => r.status !== "skipped").length;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

  const days = new Map<string, { day: string; sent: number; failed: number; bounced: number; queued: number }>();
  for (const r of rows) {
    if (r.status === "skipped") continue;
    const day = new Date(new Date(r.queued_at).getTime() + 5.5 * HOUR).toISOString().slice(0, 10); // IST day
    const d = days.get(day) ?? { day, sent: 0, failed: 0, bounced: 0, queued: 0 };
    if (r.status === "bounced") d.bounced++;
    else if (r.status === "failed") d.failed++;
    else if (r.status === "sent") d.sent++;
    else d.queued++;
    days.set(day, d);
  }
  const templates = new Map<string, { template: string; total: number; sent: number; failed: number; bounced: number; opened: number; clicked: number }>();
  for (const r of rows) {
    if (r.status === "skipped") continue;
    const t = templates.get(r.template) ?? { template: r.template, total: 0, sent: 0, failed: 0, bounced: 0, opened: 0, clicked: 0 };
    t.total++;
    if (r.sent_at) t.sent++;
    if (r.status === "failed") t.failed++;
    if (r.status === "bounced") t.bounced++;
    if (r.opened_at) t.opened++;
    if (r.clicked_at) t.clicked++;
    templates.set(r.template, t);
  }
  return {
    total,
    sent,
    failed: by("failed"),
    bounced: by("bounced"),
    queued: by("queued") + by("sending"),
    skipped: by("skipped"),
    opened,
    clicked,
    openRate: pct(opened, sent),
    ctr: pct(clicked, sent),
    daily: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
    byTemplate: [...templates.values()].sort((a, b) => b.total - a.total),
  };
}
