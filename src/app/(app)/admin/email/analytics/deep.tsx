import { ArrowDownRight, ArrowUpRight, Download, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState } from "@/components/ui/misc";
import { DAYS, bestWindow, bestWorst, domains, heatmap, linkClicks, neverOpened, templateStats, trend, type Heat, type TemplateRow } from "@/lib/email/analytics";
import { LABEL, audienceOf, loadAnalytics, recentHistory } from "@/lib/email/insights";
import { cn, formatDateTime } from "@/lib/utils";
import { SuppressionManager } from "./suppression-manager";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

function Csv({ table, from, to }: { table: string; from: string; to: string }) {
  return (
    <a href={`/api/admin/email/export?table=${table}&from=${from}&to=${to}`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-jade-700 hover:underline">
      <Download className="h-3.5 w-3.5" aria-hidden /> CSV
    </a>
  );
}

function Delta({ v, unit = "pts", invert }: { v: number | null; unit?: string; invert?: boolean }) {
  if (v == null) return <span className="text-[11.5px] text-ink-400">—</span>;
  const good = invert ? v < 0 : v > 0;
  const Icon = v === 0 ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11.5px] font-semibold tabular", v === 0 ? "text-ink-400" : good ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400")}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {v > 0 ? "+" : ""}
      {v}
      {unit}
    </span>
  );
}

function HeatGrid({ h, label }: { h: Heat; label: string }) {
  const v = (d: number, hr: number) => h.opens[d][hr] + 2 * h.clicks[d][hr];
  const max = Math.max(1, ...DAYS.flatMap((_, d) => Array.from({ length: 24 }, (_, hr) => v(d, hr))));
  const best = bestWindow(h);
  return (
    <div className="min-w-0" data-testid={`heatmap-${label}`}>
      <p className="mb-1 text-[13px] font-semibold text-ink-800">{label}</p>
      <p className="mb-2 text-[12.5px] text-ink-500">{best ? <>Best window: <b className="font-semibold text-jade-700">{best.label}</b></> : "Not enough opens yet to suggest a window."}</p>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-[2px] text-[10px] text-ink-400">
          <thead>
            <tr>
              <th />
              {Array.from({ length: 24 }, (_, hr) => (
                <th key={hr} className="w-5 font-normal tabular">
                  {hr % 3 === 0 ? hr : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d, di) => (
              <tr key={d}>
                <th className="pr-1 text-right font-normal">{d}</th>
                {Array.from({ length: 24 }, (_, hr) => {
                  const x = v(di, hr);
                  return <td key={hr} title={`${d} ${hr}:00 IST — ${h.opens[di][hr]} opens, ${h.clicks[di][hr]} clicks`} className="h-4 w-5 rounded-[3px]" style={{ background: x ? `rgb(var(--p-500) / ${0.12 + (0.88 * x) / max})` : "rgb(var(--surface-3, 240 240 240))" }} />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** the deeper analytics below the main dashboard — all for the same date range, compared with the previous one */
export async function DeepAnalytics({ from, to, fromIso, toIso }: { from: string; to: string; fromIso: string; toIso: string }) {
  const { cur, prev, events, actions, prevActions } = await loadAnalytics(fromIso, toIso);
  const rows = templateStats(cur, audienceOf, actions);
  const prevRows = templateStats(prev, audienceOf, prevActions);
  const prevBy = new Map(prevRows.map((r) => [r.template, r]));
  const { best, worst } = bestWorst(rows);
  const total = (rs: TemplateRow[]) => {
    const s = rs.reduce((a, r) => ({ sent: a.sent + r.sent, opened: a.opened + r.opened, clicked: a.clicked + r.clicked, bounced: a.bounced + r.bounced, act: a.act + (r.actions ?? 0), actBase: a.actBase + (r.actions == null ? 0 : r.sent) }), { sent: 0, opened: 0, clicked: 0, bounced: 0, act: 0, actBase: 0 });
    return { ...s, openRate: pct(s.opened, s.sent), ctr: pct(s.clicked, s.sent), bounceRate: pct(s.bounced, s.sent), actionRate: pct(s.act, s.actBase) };
  };
  const t = total(rows);
  const p = total(prevRows);
  const d = (a: number, b: number) => (p.sent ? Math.round((a - b) * 10) / 10 : null);
  const candEmails = cur.filter((e) => audienceOf(e.template) === "candidate");
  const clientEmails = cur.filter((e) => audienceOf(e.template) === "client");
  const evOf = (list: typeof cur) => {
    const ids = new Set(list.map((e) => e.id));
    return events.filter((e) => ids.has(e.email_id));
  };
  const links = linkClicks(cur, events);
  const doms = domains(cur);
  const history = await recentHistory();
  const cold = neverOpened(history);
  const { data: sup } = await (await createClient()).from("email_suppressions").select("email, reason, details, created_at").order("created_at", { ascending: false }).limit(500);

  return (
    <div className="space-y-6" id="deep">
      {/* this period vs previous */}
      <Card>
        <CardHeader title="This period vs the previous one" description={`Compared with the ${Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86400e3)} days before ${from}`} />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-5" data-testid="compare">
          {[
            { label: "Delivered", v: String(t.sent), delta: p.sent ? t.sent - p.sent : null, unit: "" },
            { label: "Open rate", v: `${t.openRate}%`, delta: d(t.openRate, p.openRate), unit: " pts" },
            { label: "Click rate", v: `${t.ctr}%`, delta: d(t.ctr, p.ctr), unit: " pts" },
            { label: "Bounce rate", v: `${t.bounceRate}%`, delta: d(t.bounceRate, p.bounceRate), unit: " pts", invert: true },
            { label: "Action rate", v: `${t.actionRate}%`, delta: d(t.actionRate, p.actionRate), unit: " pts" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-line p-3.5">
              <p className="text-[12px] text-ink-500">{c.label}</p>
              <p className="mt-0.5 text-[20px] font-semibold tabular text-ink-900">{c.v}</p>
              <Delta v={c.delta} unit={c.unit} invert={c.invert} />
            </div>
          ))}
        </div>
      </Card>

      {/* funnel */}
      <Card>
        <CardHeader title="Engagement funnel" description="Sent → opened → clicked → action, per email. Action = applied or updated their profile (candidates), approved or rejected a profile (clients), within 7 days." action={<Csv table="funnel" from={from} to={to} />} />
        {rows.length === 0 ? (
          <EmptyState title="No emails in this range" compact />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]" data-testid="funnel">
              <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Email</th>
                  {["Sent", "Opened", "Clicked", "Action"].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const steps = [
                    { n: r.sent, of: r.sent },
                    { n: r.opened, of: r.sent },
                    { n: r.clicked, of: r.opened },
                    { n: r.actions, of: r.sent },
                  ];
                  return (
                    <tr key={r.template}>
                      <td className="px-5 py-2 text-ink-800">
                        {LABEL[r.template] ?? r.template}
                        <span className="block text-[11.5px] capitalize text-ink-400">{r.audience}</span>
                      </td>
                      {steps.map((s, i) => (
                        <td key={i} className="w-40 px-3 py-2">
                          {s.n == null ? (
                            <span className="text-ink-400">—</span>
                          ) : (
                            <>
                              <span className="tabular font-semibold text-ink-900">{s.n}</span>
                              {i > 0 && <span className="ml-1 text-[11.5px] text-ink-400">{pct(s.n, s.of)}%</span>}
                              <div className="mt-1 h-1.5 rounded-full bg-surface-3">
                                <div className="h-full rounded-full bg-jade" style={{ width: `${r.sent ? Math.min(100, (s.n / r.sent) * 100) : 0}%` }} />
                              </div>
                            </>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* best time */}
      <Card>
        <CardHeader title="Best time to send" description="Opens and clicks by weekday and hour (IST). Clicks count double." action={<Csv table="heatmap" from={from} to={to} />} />
        <div className="grid gap-6 p-5 xl:grid-cols-2">
          <HeatGrid h={heatmap(candEmails, evOf(candEmails))} label="Candidates" />
          <HeatGrid h={heatmap(clientEmails, evOf(clientEmails))} label="Clients" />
        </div>
      </Card>

      {/* template performance */}
      <Card>
        <CardHeader title="Template performance" description="Trend = change in open rate vs the previous period. Best / weakest among templates with 5+ sends." action={<Csv table="templates" from={from} to={to} />} />
        {rows.length === 0 ? (
          <EmptyState title="No emails in this range" compact />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-[13px]" data-testid="template-performance">
              <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Template</th>
                  <th className="px-3 py-2.5 text-right font-medium">Sent</th>
                  <th className="px-3 py-2.5 text-right font-medium">Open rate</th>
                  <th className="px-3 py-2.5 text-right font-medium">CTR</th>
                  <th className="px-3 py-2.5 text-right font-medium">Bounce rate</th>
                  <th className="px-3 py-2.5 text-right font-medium">Action rate</th>
                  <th className="px-5 py-2.5 text-right font-medium">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line tabular">
                {rows.map((r) => (
                  <tr key={r.template} className={cn(r.template === best && "bg-emerald-50/60 dark:bg-emerald-400/5", r.template === worst && "bg-red-50/60 dark:bg-red-500/5")}>
                    <td className="px-5 py-2 text-ink-800">
                      {LABEL[r.template] ?? r.template}
                      {r.template === best && <span className="ml-2 rounded-full bg-emerald-100 px-1.5 text-[10.5px] font-semibold text-emerald-800">Best</span>}
                      {r.template === worst && <span className="ml-2 rounded-full bg-red-100 px-1.5 text-[10.5px] font-semibold text-red-700">Weakest</span>}
                    </td>
                    <td className="px-3 py-2 text-right">{r.sent}</td>
                    <td className="px-3 py-2 text-right">{r.openRate}%</td>
                    <td className="px-3 py-2 text-right">{r.ctr}%</td>
                    <td className={cn("px-3 py-2 text-right", r.bounceRate >= 5 && "font-semibold text-red-600")}>{r.bounceRate}%</td>
                    <td className="px-3 py-2 text-right">{r.actionRate == null ? "—" : `${r.actionRate}%`}</td>
                    <td className="px-5 py-2 text-right">
                      <Delta v={trend(r, prevBy.get(r.template))} unit=" pts" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* links */}
      <Card>
        <CardHeader title="Link clicks" description="Which links inside each email get clicked (recorded from today onwards)." action={<Csv table="links" from={from} to={to} />} />
        {links.length === 0 ? (
          <EmptyState title="No tracked link clicks yet" description="New emails record every click with its link." compact />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]" data-testid="links">
              <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Email</th>
                  <th className="px-3 py-2.5 font-medium">Link</th>
                  <th className="px-3 py-2.5 text-right font-medium">Clicks</th>
                  <th className="px-5 py-2.5 text-right font-medium">Unique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {links.slice(0, 100).map((l) => (
                  <tr key={l.template + l.url}>
                    <td className="px-5 py-2 text-ink-700">{LABEL[l.template] ?? l.template}</td>
                    <td className="max-w-[360px] truncate px-3 py-2 font-mono text-[12px] text-ink-600" title={l.url}>
                      {l.url}
                    </td>
                    <td className="px-3 py-2 text-right tabular">{l.clicks}</td>
                    <td className="px-5 py-2 text-right tabular">{l.unique}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* domains */}
      <Card>
        <CardHeader title="Mailbox providers" description="Delivery and open rates per provider — a low open rate at one provider can mean the spam folder." action={<Csv table="domains" from={from} to={to} />} />
        {doms.length === 0 ? (
          <EmptyState title="No emails in this range" compact />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]" data-testid="domains">
              <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Provider</th>
                  <th className="px-3 py-2.5 text-right font-medium">Emails</th>
                  <th className="px-3 py-2.5 text-right font-medium">Delivered</th>
                  <th className="px-3 py-2.5 text-right font-medium">Bounced</th>
                  <th className="px-3 py-2.5 text-right font-medium">Delivery rate</th>
                  <th className="px-5 py-2.5 text-right font-medium">Open rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line tabular">
                {doms.map((r) => (
                  <tr key={r.group}>
                    <td className="px-5 py-2 text-ink-800">
                      {r.group}
                      {r.group === "Corporate / other" && <span className="ml-1 text-[11.5px] text-ink-400">({r.domains} domains)</span>}
                    </td>
                    <td className="px-3 py-2 text-right">{r.total}</td>
                    <td className="px-3 py-2 text-right">{r.delivered}</td>
                    <td className="px-3 py-2 text-right">{r.bounced}</td>
                    <td className={cn("px-3 py-2 text-right", r.deliveryRate < 95 && "font-semibold text-red-600")}>{r.deliveryRate}%</td>
                    <td className="px-5 py-2 text-right">{r.openRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* recipient health */}
      <Card id="health">
        <CardHeader title="Recipient health" description="Suppressed addresses are never emailed again (hard bounces, 3 soft bounces in 30 days, unsubscribes, manual)." action={<Csv table="suppressions" from={from} to={to} />} />
        <div className="p-5">
          <SuppressionManager rows={(sup ?? []) as { email: string; reason: string; details: string | null; created_at: string }[]} />
        </div>
        <div className="border-t border-line p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[13.5px] font-semibold text-ink-900">
              Never opened their last 5 emails <span className="tabular text-ink-400">· {cold.length}</span>
            </p>
            <Csv table="never_opened" from={from} to={to} />
          </div>
          {cold.length === 0 ? (
            <p className="text-[13px] text-ink-500">Nobody in this segment.</p>
          ) : (
            <ul className="grid gap-x-6 gap-y-1 text-[12.5px] text-ink-600 sm:grid-cols-2 lg:grid-cols-3" data-testid="never-opened">
              {cold.slice(0, 60).map((c) => (
                <li key={c.email} className="truncate" title={`Last email ${formatDateTime(c.last_sent)} · ${c.count} emails in 6 months`}>
                  {c.email}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
