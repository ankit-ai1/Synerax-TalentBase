"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, Briefcase, Clock, IndianRupee, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type BoardJob = { href: string; title: string; company: string | null; cities: string[]; mode: string | null; type: string | null; experience: string; salary: string | null; skills: string[]; posted: string | null };

/** live jobs on a landing page, with quick filters (work mode, type, keyword) */
export function JobBoardList({ jobs }: { jobs: BoardJob[] }) {
  const modes = useMemo(() => Array.from(new Set(jobs.map((j) => j.mode).filter((m): m is string => !!m))), [jobs]);
  const types = useMemo(() => Array.from(new Set(jobs.map((j) => j.type).filter((t): t is string => !!t))), [jobs]);
  const [mode, setMode] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const list = jobs.filter((j) => (!mode || j.mode === mode) && (!type || j.type === type) && (!ql || `${j.title} ${j.skills.join(" ")} ${j.cities.join(" ")}`.toLowerCase().includes(ql)));
  const chip = (active: boolean) => cn("rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors", active ? "border-jade bg-jade text-white" : "border-line bg-surface text-ink-600 hover:border-line-strong hover:text-ink-900");

  return (
    <div>
      {jobs.length > 3 && (
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6" role="group" aria-label="Filter jobs">
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by title or skill" aria-label="Filter by title or skill" className="h-10 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-[14px] text-ink-900 outline-none focus:border-jade" />
          </div>
          {modes.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <button className={chip(!mode)} onClick={() => setMode(null)} aria-pressed={!mode}>
                Any mode
              </button>
              {modes.map((m) => (
                <button key={m} className={chip(mode === m)} onClick={() => setMode(mode === m ? null : m)} aria-pressed={mode === m}>
                  {m}
                </button>
              ))}
            </div>
          )}
          {types.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              {types.map((t) => (
                <button key={t} className={chip(type === t)} onClick={() => setType(type === t ? null : t)} aria-pressed={type === t}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {list.length} jobs shown
      </p>
      <ul className="grid gap-4 md:grid-cols-2" data-testid="landing-jobs">
        {list.map((j) => (
          <li key={j.href}>
            <article className="card-premium lift group relative flex h-full flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[17px] font-semibold text-ink-900">
                  <Link href={j.href} className="after:absolute after:inset-0">
                    {j.title}
                  </Link>
                </h3>
                {j.type && <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium", j.type === "Contract" ? "bg-saffron-50 text-saffron-800" : "bg-jade-50 text-jade-700")}>{j.type}</span>}
              </div>
              {j.company && <p className="mt-1 text-[13.5px] text-ink-500">{j.company}</p>}
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-500">
                {(j.cities.length > 0 || j.mode) && (
                  <li className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" aria-hidden /> {[j.cities.join(" / "), j.mode].filter(Boolean).join(" · ")}
                  </li>
                )}
                {j.experience && (
                  <li className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" aria-hidden /> {j.experience}
                  </li>
                )}
                {j.salary && (
                  <li className="flex items-center gap-1.5">
                    {j.salary.startsWith("₹") ? <IndianRupee className="h-4 w-4" aria-hidden /> : <Banknote className="h-4 w-4" aria-hidden />} {j.salary.replace(/^₹/, "")}
                  </li>
                )}
              </ul>
              {j.skills.length > 0 && <p className="mt-3 line-clamp-1 text-[13px] text-ink-400">{j.skills.slice(0, 6).join(" · ")}</p>}
              <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-semibold text-jade-700">
                <Briefcase className="h-4 w-4" aria-hidden /> View & apply
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </article>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-ink-500">No jobs match these filters.</p>}
    </div>
  );
}
