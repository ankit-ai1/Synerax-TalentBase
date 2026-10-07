"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Briefcase, Clock, LayoutGrid, List, MapPin, Search, Users } from "lucide-react";
import type { ClientJob } from "@/lib/client-types";
import { Bar, Chip, EmptyState, JOB_STATUS_TONE, SkillChip, istDate } from "@/components/portal-ui/kit";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "all", label: "All", match: () => true },
  { id: "review", label: "Pending review", match: (j: ClientJob) => j.status === "Pending review" },
  { id: "open", label: "Open", match: (j: ClientJob) => j.status === "Open" },
  { id: "hold", label: "On hold", match: (j: ClientJob) => j.status === "On Hold" || j.status === "Draft" },
  { id: "closed", label: "Closed", match: (j: ClientJob) => j.status === "Closed" || j.status === "Filled" },
] as const;

function MiniFunnel({ j }: { j: ClientJob }) {
  const steps = [
    { label: "Shared", v: j.shared, c: "bg-sky-500" },
    { label: "Approved", v: j.approved + (j.offered ?? 0), c: "bg-jade" },
    { label: "Interviews", v: j.interviews ?? 0, c: "bg-violet-500" },
    { label: "Hired", v: j.joined, c: "bg-emerald-500" },
  ];
  const max = Math.max(1, ...steps.map((s) => s.v));
  return (
    <div className="grid grid-cols-4 gap-2">
      {steps.map((s) => (
        <div key={s.label} className="min-w-0">
          <div className="flex h-10 items-end overflow-hidden rounded-lg bg-surface-3">
            <div className={cn("w-full rounded-lg transition-[height] duration-700", s.c)} style={{ height: `${s.v ? Math.max(14, (s.v / max) * 100) : 0}%` }} />
          </div>
          <p className="mt-1 text-[15px] font-semibold leading-none tabular text-ink-900">{s.v}</p>
          <p className="truncate text-[10.5px] text-ink-400">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function JobsExplorer({ jobs, initialTab }: { jobs: ClientJob[]; initialTab?: string }) {
  const [tab, setTab] = useState<string>(TABS.some((t) => t.id === initialTab) ? initialTab! : "all");
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");
  const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

  const modes = useMemo(() => Array.from(new Set(jobs.map((j) => j.work_mode).filter(Boolean))) as string[], [jobs]);
  const def = TABS.find((t) => t.id === tab) ?? TABS[0];
  const list = jobs.filter((j) => def.match(j)).filter((j) => (!mode || j.work_mode === mode) && (!q || `${j.title} ${j.job_code} ${j.locations.join(" ")} ${(j.skills ?? []).join(" ")}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Job status">
          {TABS.map((t) => {
            const n = jobs.filter((j) => t.match(j)).length;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                  tab === t.id ? "bg-ink-900 text-surface shadow-card dark:bg-surface-3 dark:text-ink-900" : "text-ink-500 hover:bg-surface-3 hover:text-ink-900"
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular", tab === t.id ? "bg-white/15 dark:bg-surface" : "bg-surface-3")}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, code, skill…" className="field-input h-10 pl-9" aria-label="Search jobs" />
          </div>
          {modes.length > 1 && (
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="field-input h-10 w-auto pr-8 text-[13px]" aria-label="Work mode">
              <option value="">All work modes</option>
              {modes.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          )}
          <div className="flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="View">
            {(
              [
                ["cards", LayoutGrid],
                ["table", List],
              ] as const
            ).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} aria-label={`${v} view`} className={cn("rounded-lg p-1.5", view === v ? "bg-surface-3 text-ink-900" : "text-ink-400 hover:text-ink-700")}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        jobs.length === 0 ? (
          <EmptyState icon={Briefcase} title="No jobs yet" text="Post your first requirement — Synerax reviews it and starts sourcing within one working day." action={{ href: "/client/jobs/new", label: "Post your first job" }} />
        ) : (
          <EmptyState icon={Search} title="No jobs in this view" text="Try another tab or clear the search." compact />
        )
      ) : view === "cards" ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((j) => {
            const overdue = j.target_date && j.target_date < today && j.status === "Open";
            return (
              <li key={j.id}>
                <Link href={`/client/jobs/${j.id}`} className="portal-card interactive flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-ink-400">{j.job_code}</p>
                      <h3 className="mt-0.5 truncate text-[16px] font-semibold text-ink-900">{j.title}</h3>
                    </div>
                    <Chip tone={JOB_STATUS_TONE[j.status] ?? "ink"} pulse={j.status === "Pending review"}>
                      {j.status}
                    </Chip>
                  </div>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-ink-500">
                    {(j.locations.length > 0 || j.work_mode) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden /> {[j.locations.slice(0, 2).join(", "), j.work_mode].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden /> {j.openings} opening{j.openings === 1 ? "" : "s"}
                    </span>
                    {j.days_open != null && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden /> {j.days_open} days open
                      </span>
                    )}
                  </p>
                  {!!j.skills?.length && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {j.skills.slice(0, 4).map((s) => (
                        <SkillChip key={s} name={s} />
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <MiniFunnel j={j} />
                  </div>
                  <div className="mt-auto pt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="text-ink-500">
                        Filled <b className="font-semibold tabular text-ink-900">{j.joined}</b> of {j.openings}
                      </span>
                      {j.pending_decision > 0 ? (
                        <span className="font-semibold text-saffron-600">{j.pending_decision} to review</span>
                      ) : j.target_date ? (
                        <span className={cn("inline-flex items-center gap-1", overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-ink-400")}>
                          {overdue && <AlertTriangle className="h-3 w-3" aria-hidden />}Target {istDate(j.target_date, { day: "numeric", month: "short" })}
                        </span>
                      ) : null}
                    </div>
                    <Bar value={j.joined} max={j.openings} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="portal-card overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11.5px] uppercase tracking-wider text-ink-400">
                <th className="px-5 py-3 font-medium">Job</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Filled</th>
                <th className="px-3 py-3 text-center font-medium">Shared</th>
                <th className="px-3 py-3 text-center font-medium">To review</th>
                <th className="px-3 py-3 text-center font-medium">Interviews</th>
                <th className="px-3 py-3 font-medium">Open for</th>
                <th className="px-5 py-3 font-medium">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((j) => {
                const overdue = j.target_date && j.target_date < today && j.status === "Open";
                return (
                  <tr key={j.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <Link href={`/client/jobs/${j.id}`} className="font-semibold text-ink-900 hover:text-jade-700">
                        {j.title}
                      </Link>
                      <p className="text-[11.5px] text-ink-400">
                        {j.job_code} · {[j.locations.slice(0, 2).join(", "), j.work_mode].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Chip tone={JOB_STATUS_TONE[j.status] ?? "ink"}>{j.status}</Chip>
                    </td>
                    <td className="w-36 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Bar value={j.joined} max={j.openings} className="w-16" />
                        <span className="tabular">
                          {j.joined}/{j.openings}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold tabular">{j.shared}</td>
                    <td className="px-3 py-3 text-center tabular">{j.pending_decision ? <b className="text-saffron-600">{j.pending_decision}</b> : 0}</td>
                    <td className="px-3 py-3 text-center tabular">{j.interviews ?? 0}</td>
                    <td className="px-3 py-3 tabular text-ink-600">{j.days_open != null ? `${j.days_open} days` : "—"}</td>
                    <td className={cn("px-5 py-3 tabular", overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-ink-600")}>{j.target_date ? istDate(j.target_date, { day: "numeric", month: "short" }) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
