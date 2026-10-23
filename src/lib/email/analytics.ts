/**
 * Email analytics (pure — no I/O; unit-tested in tests/email-analytics.test.ts).
 * "Delivered" = accepted by the mail server; opens are approximate (image blocking, Apple Mail privacy).
 * "Action" = a real step after the email, within 7 days: candidates applied or updated their profile;
 * clients approved / rejected a shared profile. Internal (Synerax) emails have no action step.
 */

export type Audience = "candidate" | "client" | "synerax" | "system";

export type AEmail = {
  id: string;
  template: string;
  to_email: string;
  status: string;
  queued_at: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
};
export type AEvent = { email_id: string; kind: "open" | "click"; at: string; url?: string | null };

const IST = 5.5 * 3600e3;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const sentOf = (e: AEmail) => !!e.sent_at; // accepted by the server (incl. ones that bounced later)

/** IST weekday (0 = Monday) and hour */
export function istSlot(at: string) {
  const d = new Date(new Date(at).getTime() + IST);
  return { day: (d.getUTCDay() + 6) % 7, hour: d.getUTCHours() };
}

// ---------------------------------------------------------------- funnel + template performance
export type TemplateRow = {
  template: string;
  audience: Audience;
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  actions: number | null;
  openRate: number;
  ctr: number;
  clickToOpen: number;
  bounceRate: number;
  actionRate: number | null;
};

export function templateStats(emails: AEmail[], audienceOf: (t: string) => Audience, actioned: Set<string>): TemplateRow[] {
  const by = new Map<string, AEmail[]>();
  for (const e of emails) if (e.status !== "skipped") by.set(e.template, [...(by.get(e.template) ?? []), e]);
  return [...by.entries()]
    .map(([template, list]) => {
      const audience = audienceOf(template);
      const sent = list.filter(sentOf);
      const opened = sent.filter((e) => e.opened_at).length;
      const clicked = sent.filter((e) => e.clicked_at).length;
      const bounced = list.filter((e) => e.status === "bounced").length;
      const hasAction = audience === "candidate" || audience === "client";
      const actions = hasAction ? sent.filter((e) => actioned.has(e.id)).length : null;
      return {
        template,
        audience,
        total: list.length,
        sent: sent.length,
        opened,
        clicked,
        bounced,
        actions,
        openRate: pct(opened, sent.length),
        ctr: pct(clicked, sent.length),
        clickToOpen: pct(clicked, opened),
        bounceRate: pct(bounced, sent.length),
        actionRate: actions == null ? null : pct(actions, sent.length),
      };
    })
    .sort((a, b) => b.sent - a.sent);
}

/** engagement score used to pick the best / worst template (only templates with enough volume) */
export const score = (r: TemplateRow) => r.openRate + 2 * r.ctr + 3 * (r.actionRate ?? 0) - 2 * r.bounceRate;
export function bestWorst(rows: TemplateRow[], minSent = 5) {
  const eligible = rows.filter((r) => r.sent >= minSent);
  if (eligible.length < 2) return { best: null, worst: null };
  const sorted = [...eligible].sort((a, b) => score(b) - score(a));
  return { best: sorted[0].template, worst: sorted[sorted.length - 1].template };
}

/** trend vs the previous period: change in open rate (percentage points); null when there's no comparable data */
export function trend(cur: TemplateRow, prev: TemplateRow | undefined) {
  if (!prev || prev.sent < 3 || cur.sent < 3) return null;
  return Math.round((cur.openRate - prev.openRate) * 10) / 10;
}

// ---------------------------------------------------------------- best time to send
export type Heat = { opens: number[][]; clicks: number[][]; sends: number[][] }; // [day 0-6][hour 0-23]
const grid = () => Array.from({ length: 7 }, () => Array<number>(24).fill(0));

/** opens/clicks by IST weekday × hour — from the event log, falling back to first open/click for older emails */
export function heatmap(emails: AEmail[], events: AEvent[]): Heat {
  const h: Heat = { opens: grid(), clicks: grid(), sends: grid() };
  const withEvents = new Set(events.map((e) => e.email_id));
  for (const ev of events) {
    const s = istSlot(ev.at);
    (ev.kind === "open" ? h.opens : h.clicks)[s.day][s.hour]++;
  }
  for (const e of emails) {
    if (e.sent_at) {
      const s = istSlot(e.sent_at);
      h.sends[s.day][s.hour]++;
    }
    if (withEvents.has(e.id)) continue;
    if (e.opened_at) {
      const s = istSlot(e.opened_at);
      h.opens[s.day][s.hour]++;
    }
    if (e.clicked_at) {
      const s = istSlot(e.clicked_at);
      h.clicks[s.day][s.hour]++;
    }
  }
  return h;
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** the 2-hour window (any weekday) with the most engagement (opens + 2 × clicks); null if there's too little data */
export function bestWindow(h: Heat, minSignals = 10) {
  let best = { day: -1, hour: -1, v: 0 };
  let total = 0;
  for (let d = 0; d < 7; d++)
    for (let hr = 0; hr < 24; hr++) {
      const v = h.opens[d][hr] + 2 * h.clicks[d][hr] + h.opens[d][(hr + 1) % 24] + 2 * h.clicks[d][(hr + 1) % 24];
      total += h.opens[d][hr] + h.clicks[d][hr];
      if (v > best.v) best = { day: d, hour: hr, v };
    }
  if (total < minSignals || best.day < 0) return null;
  const hh = (n: number) => `${String(n % 24).padStart(2, "0")}:00`;
  // the strongest weekdays for that hour block
  const days = DAYS.map((name, d) => ({ name, v: h.opens[d][best.hour] + 2 * h.clicks[d][best.hour] + h.opens[d][(best.hour + 1) % 24] + 2 * h.clicks[d][(best.hour + 1) % 24] }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map((x) => x.name);
  return { label: `${days.join(", ")} · ${hh(best.hour)}–${hh(best.hour + 2)} IST`, day: best.day, hour: best.hour };
}

// ---------------------------------------------------------------- links
export function linkClicks(emails: AEmail[], events: AEvent[]) {
  const tpl = new Map(emails.map((e) => [e.id, e.template]));
  const by = new Map<string, { template: string; url: string; clicks: number; people: Set<string> }>();
  for (const ev of events) {
    if (ev.kind !== "click" || !ev.url || !tpl.has(ev.email_id)) continue;
    const template = tpl.get(ev.email_id)!;
    const url = cleanUrl(ev.url);
    const k = `${template}|${url}`;
    const r = by.get(k) ?? { template, url, clicks: 0, people: new Set<string>() };
    r.clicks++;
    r.people.add(ev.email_id);
    by.set(k, r);
  }
  return [...by.values()].map((r) => ({ template: r.template, url: r.url, clicks: r.clicks, unique: r.people.size })).sort((a, b) => b.clicks - a.clicks);
}
/** strip tracking-ish noise so the same link groups together */
export function cleanUrl(u: string) {
  try {
    const x = new URL(u);
    for (const k of [...x.searchParams.keys()]) if (/^utm_|^ref$|^token|^code$|^s$/.test(k)) x.searchParams.delete(k);
    return `${x.host}${x.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ":id")}${x.search}`;
  } catch {
    return u;
  }
}

// ---------------------------------------------------------------- domains
export function domainGroup(email: string) {
  const d = (email.split("@")[1] ?? "").toLowerCase();
  if (/^(gmail|googlemail)\.com$/.test(d)) return "Gmail";
  if (/^(outlook|hotmail|live|msn)\.(com|in|co\.uk)$/.test(d)) return "Outlook / Hotmail";
  if (/^(yahoo|ymail|rocketmail)\.(com|in|co\.in|co\.uk)$/.test(d)) return "Yahoo";
  if (/^(icloud|me|mac)\.com$/.test(d)) return "iCloud";
  if (/^(rediffmail|rediff)\.com$/.test(d)) return "Rediffmail";
  return "Corporate / other";
}
export function domains(emails: AEmail[]) {
  const by = new Map<string, { group: string; total: number; delivered: number; bounced: number; failed: number; opened: number; domains: Set<string> }>();
  for (const e of emails) {
    if (e.status === "skipped") continue;
    const group = domainGroup(e.to_email);
    const r = by.get(group) ?? { group, total: 0, delivered: 0, bounced: 0, failed: 0, opened: 0, domains: new Set<string>() };
    r.total++;
    if (e.status === "sent") r.delivered++;
    if (e.status === "bounced") r.bounced++;
    if (e.status === "failed") r.failed++;
    if (e.opened_at) r.opened++;
    r.domains.add((e.to_email.split("@")[1] ?? "").toLowerCase());
    by.set(group, r);
  }
  return [...by.values()]
    .map((r) => ({ group: r.group, total: r.total, delivered: r.delivered, bounced: r.bounced, failed: r.failed, deliveryRate: pct(r.delivered, r.total), openRate: pct(r.opened, r.delivered + r.bounced), domains: r.domains.size }))
    .sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------- recipient health
/** recipients whose last N sent emails were never opened (oldest first input not required) */
export function neverOpened(emails: AEmail[], n = 5) {
  const by = new Map<string, AEmail[]>();
  for (const e of emails) if (e.sent_at && e.status !== "bounced") by.set(e.to_email.toLowerCase(), [...(by.get(e.to_email.toLowerCase()) ?? []), e]);
  const out: { email: string; last_sent: string; count: number }[] = [];
  for (const [email, list] of by) {
    const lastN = list.sort((a, b) => b.sent_at!.localeCompare(a.sent_at!)).slice(0, n);
    if (lastN.length === n && lastN.every((e) => !e.opened_at && !e.clicked_at)) out.push({ email, last_sent: lastN[0].sent_at!, count: list.length });
  }
  return out.sort((a, b) => b.last_sent.localeCompare(a.last_sent));
}

// ---------------------------------------------------------------- anomalies
/**
 * Failure / bounce spike: rate in the last hour ≥ 3× the 7-day hourly average, with a minimum volume so one
 * failed email doesn't page anyone. Returns null when everything is normal.
 */
export function spike(lastHour: { total: number; bad: number }, week: { total: number; bad: number }, minLastHour = 5) {
  if (lastHour.total < minLastHour || lastHour.bad === 0) return null;
  const rate = lastHour.bad / lastHour.total;
  const avg = week.total ? week.bad / week.total : 0;
  const factor = avg > 0 ? rate / avg : Infinity;
  if (avg > 0 ? factor >= 3 : rate >= 0.2) return { rate: pct(lastHour.bad, lastHour.total), avg: pct(week.bad, week.total), factor: Number.isFinite(factor) ? Math.round(factor * 10) / 10 : null };
  return null;
}

/** end of today in IST, as a Date */
export function endOfIstDay(now = Date.now()) {
  const d = new Date(now + IST);
  d.setUTCHours(23, 59, 59, 999);
  return new Date(d.getTime() - IST);
}
