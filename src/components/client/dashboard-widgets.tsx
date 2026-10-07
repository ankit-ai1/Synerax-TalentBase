"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Filter } from "lucide-react";
import type { ClientDashboard } from "@/lib/client-types";
import { CHART, Donut, WeeklyArea } from "@/components/portal-ui/charts";
import { EmptyState } from "@/components/portal-ui/kit";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "shared", label: "Shared", color: "bg-sky-500", text: "text-sky-600 dark:text-sky-300" },
  { key: "approved", label: "Approved", color: "bg-jade", text: "text-jade-700" },
  { key: "interview", label: "Interview", color: "bg-violet-500", text: "text-violet-600 dark:text-violet-300" },
  { key: "offered", label: "Offered", color: "bg-saffron", text: "text-saffron-600" },
  { key: "joined", label: "Joined", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
] as const;

/** Shared → Approved → Interview → Offered → Joined, for one job or all jobs */
export function HiringFunnel({ funnel }: { funnel: NonNullable<ClientDashboard["funnel"]> }) {
  const [job, setJob] = useState<string>("all");
  if (!funnel.length) {
    return <EmptyState icon={Filter} title="No pipeline yet" text="Once Synerax shares profiles, you'll see how they move from shared to joined." compact />;
  }
  const rows = job === "all" ? funnel : funnel.filter((f) => f.job_id === job);
  const sum = (k: (typeof STEPS)[number]["key"]) => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
  const values = STEPS.map((s) => ({ ...s, value: sum(s.key) }));
  const max = Math.max(1, values[0].value);
  const selected = funnel.find((f) => f.job_id === job);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select value={job} onChange={(e) => setJob(e.target.value)} className="field-input h-9 w-auto max-w-full pr-8 text-[13px]" aria-label="Choose a job">
          <option value="all">All jobs ({funnel.length})</option>
          {funnel.map((f) => (
            <option key={f.job_id} value={f.job_id}>
              {f.title}
            </option>
          ))}
        </select>
        {selected && (
          <Link href={`/client/jobs/${selected.job_id}?tab=profiles`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-jade-700 hover:underline">
            Open job <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <ol className="space-y-2.5">
        {values.map((s, i) => {
          const prev = i ? values[i - 1].value : null;
          const conv = prev ? Math.round((s.value / prev) * 100) : null;
          return (
            <li key={s.key} className="grid grid-cols-[84px_minmax(0,1fr)_64px] items-center gap-3 sm:grid-cols-[96px_minmax(0,1fr)_76px]">
              <span className="text-[13px] font-medium text-ink-700">{s.label}</span>
              <div className="relative h-9 overflow-hidden rounded-xl bg-surface-3">
                <div
                  className={cn("flex h-full items-center rounded-xl px-3 text-[13px] font-semibold text-white transition-[width] duration-700", s.color)}
                  style={{ width: `${Math.max(s.value ? 10 : 0, (s.value / max) * 100)}%` }}
                >
                  {s.value > 0 && <span className="tabular drop-shadow-sm">{s.value}</span>}
                </div>
                {s.value === 0 && <span className="absolute inset-y-0 left-3 flex items-center text-[13px] font-semibold text-ink-400">0</span>}
              </div>
              <span className={cn("text-right text-[12px] font-medium tabular", conv === null ? "text-ink-400" : s.text)}>{conv === null ? "—" : `${conv}%`}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[11.5px] text-ink-400">Percentages show conversion from the previous step.</p>
    </div>
  );
}

/** Approval-rate donut + key averages + weekly activity */
export function Insights({ d }: { d: ClientDashboard }) {
  const approved = (d.funnel ?? []).reduce((s, f) => s + f.approved, 0);
  const decided = d.decided ?? 0;
  const rejected = Math.max(0, decided - Math.round(((d.approval_rate ?? 0) / 100) * decided));
  const accepted = decided - rejected;
  const series = (d.series ?? []).map((w) => ({
    ...w,
    label: new Date(`${w.week}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
  }));
  const stats = [
    { label: "Avg. time to first shortlist", value: d.avg_shortlist_days != null ? `${d.avg_shortlist_days} days` : "—" },
    { label: "Avg. time you take to decide", value: d.avg_decision_hours != null ? (d.avg_decision_hours < 48 ? `${d.avg_decision_hours} hrs` : `${Math.round(d.avg_decision_hours / 24)} days`) : "—" },
    { label: "Avg. time to fill", value: d.avg_fill_days != null ? `${d.avg_fill_days} days` : "—" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <Donut
          size={140}
          center={d.approval_rate != null ? `${d.approval_rate}%` : "—"}
          sub="approval"
          data={[
            { name: "Approved", value: accepted, color: CHART.jade },
            { name: "Rejected", value: rejected, color: CHART.ink },
          ]}
        />
        <dl className="w-full flex-1 divide-y divide-line">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
              <dt className="text-[13px] text-ink-500">{s.label}</dt>
              <dd className="text-[14px] font-semibold tabular text-ink-900">{s.value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-[13px] text-ink-500">Profiles approved so far</dt>
            <dd className="text-[14px] font-semibold tabular text-ink-900">{approved}</dd>
          </div>
        </dl>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[12.5px] font-medium text-ink-600">Last 8 weeks</p>
          <div className="flex gap-3 text-[11px] text-ink-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Shared
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-violet-500" /> Interviews
            </span>
          </div>
        </div>
        <WeeklyArea
          data={series}
          keys={[
            { key: "shared", name: "Profiles shared", color: CHART.sky },
            { key: "interviews", name: "Interviews", color: CHART.violet },
          ]}
        />
      </div>
    </div>
  );
}
