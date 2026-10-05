"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Download } from "lucide-react";
import { Avatar, Card, CardHeader, EmptyState } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/interactive";
import { ACTIVE_STAGES, STAGE_STYLE } from "@/lib/constants";
import { cn, formatDate, inr } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function RangePicker({ range, from, to }: { range: string; from: string; to: string }) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        size="sm"
        value={range}
        onChange={(v) => router.push(`/reports?range=${v}`)}
        options={[
          { value: "7", label: "7 days" },
          { value: "30", label: "30 days" },
          { value: "month", label: "This month" },
          { value: "90", label: "90 days" },
          { value: "year", label: "This year" },
          { value: "custom", label: "Custom" },
        ]}
      />
      {range === "custom" && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={f} onChange={(e) => setF(e.target.value)} className="field-input h-8 w-auto text-xs" aria-label="From" />
          <span className="text-ink-300">–</span>
          <input type="date" value={t} onChange={(e) => setT(e.target.value)} className="field-input h-8 w-auto text-xs" aria-label="To" />
          <button onClick={() => router.push(`/reports?range=custom&from=${f}&to=${t}`)} className="h-8 rounded-md bg-ink-900 px-3 text-xs font-medium text-surface">
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString("en-IN");

function ChartTip({ active, payload, label, unit = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-medium text-ink-900">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink-600">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color || p.fill }} />
          {p.name}: <b className="font-semibold tabular text-ink-900">{fmt(p.value)}{unit}</b>
        </p>
      ))}
    </div>
  );
}

export function Reports({ data, isAdmin }: { data: any; isAdmin: boolean }) {
  const k = data.kpis;
  const funnel = ACTIVE_STAGES.map((s) => ({ stage: s, n: data.funnel?.[s] ?? 0 }));
  const top = Math.max(1, funnel[0].n);
  const monthly = data.monthly ?? [];
  const sources = (data.sources ?? []).slice(0, 10);
  const recruiters = (data.recruiters ?? []) as any[];
  const maxRec = Math.max(1, ...recruiters.map((r) => r.added + r.submitted + r.interviews));
  const results = data.interview_results ?? {};
  const totalResults = Object.values(results).reduce((a: number, b: any) => a + Number(b), 0) as number;

  const kpis = [
    { label: "Candidates added", value: k.candidates_added },
    { label: "Profiles submitted", value: k.submissions },
    { label: "Interviews", value: k.interviews },
    { label: "Offers", value: k.offers },
    { label: "Joined", value: k.joined, accent: true },
    { label: "Est. revenue", value: inr(k.revenue_estimate), hint: "From client fee terms" },
  ];

  const csv = () => {
    const rows = [["Recruiter", "Candidates added", "Pipelined", "Submitted", "Interviews", "Joined"], ...recruiters.map((r) => [r.name, r.added, r.pipelined, r.submitted, r.interviews, r.joined])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + rows.map((r) => r.join(",")).join("\r\n")], { type: "text/csv" }));
    a.download = `team-report-${data.range.from}-to-${data.range.to}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-400">
        {formatDate(data.range.from)} – {formatDate(data.range.to)}
      </p>

      {/* KPI strip */}
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-card sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((x, i) => (
          <div key={x.label} className={cn("px-5 py-4", i > 0 && "border-l border-line", i >= 2 && "max-sm:border-t", i >= 3 && "sm:max-xl:border-t", i === 3 && "sm:max-xl:border-l-0")}>
            <p className="text-[12.5px] text-ink-500">{x.label}</p>
            <p className={cn("mt-1 text-[26px] font-semibold leading-none tracking-tight", x.accent ? "text-jade-700" : "text-ink-900")}>{typeof x.value === "number" ? fmt(x.value) : x.value}</p>
            {x.hint && <p className="mt-1 text-[11px] text-ink-400">{x.hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        {/* funnel */}
        <Card>
          <CardHeader title="Hiring funnel" description="Candidates who entered the pipeline in this period — and how far they got" />
          <div className="space-y-2.5 p-5">
            {funnel.map((f, i) => {
              const prev = i > 0 ? funnel[i - 1].n : null;
              const conv = prev ? Math.round((f.n / prev) * 100) : null;
              return (
                <div key={f.stage} className="grid grid-cols-[88px_1fr_70px] items-center gap-3">
                  <span className="text-[13px] text-ink-600">{f.stage}</span>
                  <div className="h-7 overflow-hidden rounded-md bg-surface-3">
                    <div
                      className="flex h-full items-center rounded-r-md px-2 text-xs font-semibold text-white transition-[width] duration-700"
                      style={{ width: `${Math.max(f.n ? 6 : 0, (f.n / top) * 100)}%`, background: STAGE_STYLE[f.stage].hex }}
                    >
                      {f.n / top > 0.12 ? fmt(f.n) : ""}
                    </div>
                  </div>
                  <span className="text-right text-xs tabular text-ink-500">
                    {f.n / top <= 0.12 && <b className="mr-1.5 font-semibold text-ink-900">{fmt(f.n)}</b>}
                    {conv !== null ? `${conv}%` : ""}
                  </span>
                </div>
              );
            })}
            <p className="pt-2 text-xs text-ink-400">The % on the right = conversion from the previous stage.</p>
          </div>
        </Card>

        {/* monthly small multiples */}
        <Card>
          <CardHeader title="Last 12 months" description="Each metric has its own scale — for spotting trends" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-5">
            {[
              { key: "added", label: "Candidates added", color: "#64748B" },
              { key: "submitted", label: "Submitted", color: "#6366F1" },
              { key: "interviews", label: "Interviews", color: "#8B5CF6" },
              { key: "joined", label: "Joined", color: "#0F766E" },
            ].map((m) => {
              const total = monthly.reduce((s: number, r: any) => s + r[m.key], 0);
              return (
                <div key={m.key}>
                  <div className="flex items-baseline justify-between">
                    <p className="text-[12.5px] text-ink-500">{m.label}</p>
                    <p className="text-sm font-semibold tabular text-ink-900">{fmt(total)}</p>
                  </div>
                  <div className="mt-1 h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthly} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 9, fill: "rgb(var(--ink-400))" }} tickLine={false} axisLine={{ stroke: "rgb(var(--line))" }} interval={2} padding={{ left: 10, right: 4 }} />
                        <Tooltip cursor={{ fill: "rgb(var(--ink-800) / 0.05)" }} content={<ChartTip />} />
                        <Bar dataKey={m.key} name={m.label} fill={m.color} radius={[3, 3, 0, 0]} maxBarSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* sources */}
        <Card>
          <CardHeader title="Source performance" description="Where candidates came from and how many were placed" />
          {sources.length === 0 ? (
            <EmptyState compact title="No data for this period" />
          ) : (
            <div className="space-y-3.5 p-5">
              {sources.map((r: any) => {
                const max = Math.max(1, ...sources.map((x: any) => x.added));
                return (
                  <div key={r.source} className="grid grid-cols-[110px_1fr_56px] items-center gap-3">
                    <span className="truncate text-[13px] text-ink-600">{r.source}</span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-r bg-[#94A3B8]" style={{ width: `${Math.max(2, (r.added / max) * 100)}%` }} title={`Added: ${r.added}`} />
                        <span className="text-[11px] tabular text-ink-500">{r.added}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-r bg-jade" style={{ width: `${r.placed ? Math.max(2, (r.placed / max) * 100) : 0}%` }} title={`Placed: ${r.placed}`} />
                        <span className="text-[11px] tabular text-ink-500">{r.placed}</span>
                      </div>
                    </div>
                    <span className="text-right text-xs tabular text-ink-500" title="Placement rate">
                      {r.added ? Math.round((r.placed / r.added) * 100) : 0}%
                    </span>
                  </div>
                );
              })}
              <div className="flex gap-4 pt-1 text-xs text-ink-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#94A3B8]" /> Added
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-jade" /> Placed
                </span>
                <span className="ml-auto">% = placement rate</span>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {/* interview outcomes */}
          <Card>
            <CardHeader title="Interview results" description={`${totalResults} interviews`} />
            <div className="p-5">
              {totalResults === 0 ? (
                <p className="text-sm text-ink-400">No interviews in this period.</p>
              ) : (
                <>
                  <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
                    {[
                      ["Selected", "#059669"],
                      ["On Hold", "#F59E0B"],
                      ["Rejected", "#EF4444"],
                      ["Pending", "#94A3B8"],
                    ].map(([r, c]) =>
                      results[r] ? <div key={r} style={{ width: `${(results[r] / totalResults) * 100}%`, background: c }} title={`${r}: ${results[r]}`} /> : null
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["Selected", "#059669"],
                      ["On Hold", "#F59E0B"],
                      ["Rejected", "#EF4444"],
                      ["Pending", "#94A3B8"],
                    ].map(([r, c]) => (
                      <div key={r} className="flex items-center gap-2 text-xs text-ink-600">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                        {r} <b className="ml-auto font-semibold tabular text-ink-900">{results[r] ?? 0}</b>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* rejection reasons */}
          <Card>
            <CardHeader title="Rejection / drop reasons" />
            <div className="space-y-2 p-5">
              {(data.rejection_reasons ?? []).length === 0 && <p className="text-sm text-ink-400">No rejections.</p>}
              {(data.rejection_reasons ?? []).map((r: any) => {
                const max = Math.max(...data.rejection_reasons.map((x: any) => x.count));
                return (
                  <div key={r.reason} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[13px]">
                    <div>
                      <p className="text-ink-700">{r.reason}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-red-400" style={{ width: `${(r.count / max) * 100}%` }} />
                      </div>
                    </div>
                    <span className="font-semibold tabular text-ink-900">{r.count}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* team */}
      <Card>
        <CardHeader
          title="Team performance"
          description="Who did how much — in this period"
          action={
            isAdmin && (
              <button onClick={csv} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-600 hover:bg-surface-3">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            )
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-400">
                <th className="px-5 py-3 font-medium">Recruiter</th>
                <th className="px-3 py-3 text-right font-medium">Added</th>
                <th className="px-3 py-3 text-right font-medium">Pipelined</th>
                <th className="px-3 py-3 text-right font-medium">Submitted</th>
                <th className="px-3 py-3 text-right font-medium">Interviews</th>
                <th className="px-3 py-3 text-right font-medium">Joined</th>
                <th className="w-[28%] px-5 py-3 font-medium">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...recruiters]
                .sort((a, b) => b.joined - a.joined || b.submitted - a.submitted || b.added - a.added)
                .map((r) => {
                  const total = r.added + r.submitted + r.interviews;
                  return (
                    <tr key={r.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.name} size="sm" />
                          <div>
                            <p className="font-medium text-ink-900">{r.name}</p>
                            <p className="text-xs text-ink-400">{r.role === "admin" ? "Admin" : "HR"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular">
                        <Link href={`/candidates?added_by=${r.id}&added_from=${data.range.from}&sort=recent`} className="hover:text-jade-700 hover:underline">
                          {r.added}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right tabular">{r.pipelined}</td>
                      <td className="px-3 py-3 text-right tabular">{r.submitted}</td>
                      <td className="px-3 py-3 text-right tabular">{r.interviews}</td>
                      <td className={cn("px-3 py-3 text-right font-semibold tabular", r.joined ? "text-jade-700" : "text-ink-400")}>{r.joined}</td>
                      <td className="px-5 py-3">
                        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-3" style={{ width: `${Math.max(4, (total / maxRec) * 100)}%` }} title={`${total} actions`}>
                          {r.added > 0 && <div className="bg-slate-400" style={{ flex: r.added }} />}
                          {r.submitted > 0 && <div className="bg-indigo-500" style={{ flex: r.submitted }} />}
                          {r.interviews > 0 && <div className="bg-violet-500" style={{ flex: r.interviews }} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 border-t border-line px-5 py-2.5 text-[11px] text-ink-400">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-slate-400" /> Added</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-indigo-500" /> Submitted</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-violet-500" /> Interviews</span>
        </div>
      </Card>

      {/* clients */}
      <Card>
        <CardHeader title="Top clients" description="Open jobs, submissions and placements" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-400">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-3 py-3 text-right font-medium">Open jobs</th>
                <th className="px-3 py-3 text-right font-medium">Submissions</th>
                <th className="px-5 py-3 text-right font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(data.clients ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-ink-400">
                    No clients
                  </td>
                </tr>
              )}
              {(data.clients ?? []).map((c: any) => (
                <tr key={c.id}>
                  <td className="px-5 py-3">
                    <Link href={`/clients/${c.id}`} className="flex items-center gap-2.5 font-medium text-ink-900 hover:text-jade-700">
                      <Avatar name={c.name} size="xs" square />
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right tabular">{c.open_jobs}</td>
                  <td className="px-3 py-3 text-right tabular">{c.submissions}</td>
                  <td className={cn("px-5 py-3 text-right font-semibold tabular", c.joined ? "text-jade-700" : "text-ink-400")}>{c.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-3 text-xs text-ink-400 sm:grid-cols-2">
        <p>Jobs opened: {k.jobs_opened} · closed: {k.jobs_closed}</p>
        <p className="sm:text-right">Avg time to fill: {k.avg_days_to_fill != null ? `${k.avg_days_to_fill} days` : "—"}</p>
      </div>
    </div>
  );
}
