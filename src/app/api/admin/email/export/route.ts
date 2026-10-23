import { apiAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DAYS, domains, heatmap, linkClicks, neverOpened, templateStats, trend } from "@/lib/email/analytics";
import { LABEL, audienceOf, loadAnalytics, recentHistory } from "@/lib/email/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = ["queued_at", "sent_at", "status", "template", "to_email", "subject", "attempts", "opened_at", "open_count", "clicked_at", "click_count", "bounced_at", "bounce_reason", "last_error", "provider_message_id"] as const;
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // keep spreadsheets from treating values as formulas
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const csv = (name: string, head: string[], rows: unknown[][]) =>
  new Response("﻿" + [head.join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}.csv"`, "cache-control": "no-store" },
  });
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

/**
 * Admin: CSV of the emails in a date range (IST days) — same filter as /admin/email/analytics.
 * ?table=funnel|templates|heatmap|links|domains|suppressions|never_opened exports that analytics table instead.
 */
export async function GET(req: Request) {
  const a = await apiAdmin();
  if ("error" in a) return a.error;
  const sp = new URL(req.url).searchParams;
  const ok = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const to = ok(sp.get("to")) ?? new Date().toISOString().slice(0, 10);
  const from = ok(sp.get("from")) ?? new Date(Date.now() - 29 * 86400_000).toISOString().slice(0, 10);
  const fromIso = new Date(`${from}T00:00:00+05:30`).toISOString();
  const toIso = new Date(`${to}T23:59:59.999+05:30`).toISOString();
  const table = sp.get("table");
  const supabase = await createClient();
  const tag = `${from}-to-${to}`;

  if (table === "suppressions") {
    const { data } = await supabase.from("email_suppressions").select("email, reason, details, created_at").order("created_at", { ascending: false });
    return csv("email-suppressions", ["email", "reason", "details", "added_at"], (data ?? []).map((r) => [r.email, r.reason, r.details, r.created_at]));
  }
  if (table === "never_opened") {
    const rows = neverOpened(await recentHistory());
    return csv("never-opened-last-5", ["email", "last_email_sent", "emails_in_6_months"], rows.map((r) => [r.email, r.last_sent, r.count]));
  }
  if (table) {
    const { cur, prev, events, actions, prevActions } = await loadAnalytics(fromIso, toIso);
    if (table === "funnel" || table === "templates") {
      const rows = templateStats(cur, audienceOf, actions);
      const prevBy = new Map(templateStats(prev, audienceOf, prevActions).map((r) => [r.template, r]));
      if (table === "funnel")
        return csv(`email-funnel-${tag}`, ["email", "audience", "sent", "opened", "open_%", "clicked", "click_of_opened_%", "actions", "action_%"], rows.map((r) => [LABEL[r.template] ?? r.template, r.audience, r.sent, r.opened, r.openRate, r.clicked, pct(r.clicked, r.opened), r.actions ?? "", r.actionRate ?? ""]));
      return csv(`email-templates-${tag}`, ["template", "audience", "sent", "open_rate_%", "ctr_%", "bounce_rate_%", "action_rate_%", "open_rate_change_pts"], rows.map((r) => [LABEL[r.template] ?? r.template, r.audience, r.sent, r.openRate, r.ctr, r.bounceRate, r.actionRate ?? "", trend(r, prevBy.get(r.template)) ?? ""]));
    }
    if (table === "heatmap") {
      const out: unknown[][] = [];
      for (const aud of ["candidate", "client"] as const) {
        const list = cur.filter((e) => audienceOf(e.template) === aud);
        const ids = new Set(list.map((e) => e.id));
        const h = heatmap(list, events.filter((e) => ids.has(e.email_id)));
        DAYS.forEach((d, di) => { for (let hr = 0; hr < 24; hr++) if (h.sends[di][hr] || h.opens[di][hr] || h.clicks[di][hr]) out.push([aud, d, hr, h.sends[di][hr], h.opens[di][hr], h.clicks[di][hr]]); });
      }
      return csv(`email-send-times-${tag}`, ["audience", "weekday", "hour_ist", "sent", "opens", "clicks"], out);
    }
    if (table === "links") return csv(`email-link-clicks-${tag}`, ["email", "link", "clicks", "unique_recipients"], linkClicks(cur, events).map((l) => [LABEL[l.template] ?? l.template, l.url, l.clicks, l.unique]));
    if (table === "domains") return csv(`email-providers-${tag}`, ["provider", "emails", "delivered", "bounced", "failed", "delivery_rate_%", "open_rate_%", "domains"], domains(cur).map((r) => [r.group, r.total, r.delivered, r.bounced, r.failed, r.deliveryRate, r.openRate, r.domains]));
    return Response.json({ error: "Unknown table" }, { status: 400 });
  }

  const lines = [COLS.join(",")];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await supabase.from("emails").select(COLS.join(", ")).gte("queued_at", fromIso).lte("queued_at", toIso).order("queued_at", { ascending: false }).range(page * 1000, page * 1000 + 999);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) lines.push(COLS.map((c) => cell(r[c])).join(","));
    if (!data || data.length < 1000) break;
  }
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="emails-${tag}.csv"`, "cache-control": "no-store" },
  });
}
