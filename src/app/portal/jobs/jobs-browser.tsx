"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EMPLOYMENT_TYPES, WORK_MODES } from "@/lib/constants";
import type { CandidateJob } from "@/lib/portal-types";
import { JobCard } from "@/components/portal/ui";
import { cn } from "@/lib/utils";

type Filters = {
  q: string;
  location: string;
  work_mode: string;
  employment_type: string;
  experience: string;
  salary_min: string;
  my_skills: boolean;
  saved_only: boolean;
};

const EMPTY: Filters = { q: "", location: "", work_mode: "", employment_type: "", experience: "", salary_min: "", my_skills: false, saved_only: false };

export function JobsBrowser({ initial, mySkillIds, myExperience }: { initial: CandidateJob[]; mySkillIds: string[]; myExperience: number | null }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [jobs, setJobs] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await createClient().rpc("candidate_jobs", {
        f: {
          q: f.q,
          location: f.location,
          work_mode: f.work_mode,
          employment_type: f.employment_type,
          experience: f.experience,
          salary_min: f.salary_min,
          skills: f.my_skills ? mySkillIds : [],
          saved_only: f.saved_only,
          limit: 60,
        },
      });
      setJobs((data ?? []) as CandidateJob[]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [f, mySkillIds]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));
  const active = Object.entries(f).filter(([k, v]) => k !== "q" && v !== "" && v !== false).length;

  const chip = (on: boolean) =>
    cn("rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors", on ? "border-jade bg-jade text-white" : "border-line bg-surface text-ink-600 hover:border-line-strong");

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            value={f.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Job title or department"
            className="field-input h-12 pl-10 text-[15px]"
            aria-label="Search jobs"
          />
        </div>
        <input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="City" className="field-input h-12 sm:w-48" aria-label="Location" />
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-[14px] font-medium text-ink-700 hover:border-line-strong"
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
          {active > 0 && <span className="rounded-full bg-jade px-1.5 text-[11px] font-semibold text-white">{active}</span>}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => set("my_skills", !f.my_skills)} aria-pressed={f.my_skills} className={chip(f.my_skills)}>
          Matches my skills
        </button>
        {myExperience !== null && (
          <button onClick={() => set("experience", f.experience ? "" : String(myExperience))} aria-pressed={!!f.experience} className={chip(!!f.experience)}>
            Fits my experience
          </button>
        )}
        <button onClick={() => set("saved_only", !f.saved_only)} aria-pressed={f.saved_only} className={chip(f.saved_only)}>
          Saved jobs
        </button>
        {(active > 0 || f.q) && (
          <button onClick={() => setF(EMPTY)} className="inline-flex items-center gap-1 px-2 text-[13px] font-medium text-ink-500 hover:text-ink-900">
            <X className="h-3.5 w-3.5" aria-hidden /> Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-3 grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[13px] font-medium text-ink-700">
            Work mode
            <select value={f.work_mode} onChange={(e) => set("work_mode", e.target.value)} className="field-input mt-1.5">
              <option value="">Any</option>
              {WORK_MODES.filter((w) => w !== "Any").map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-medium text-ink-700">
            Job type
            <select value={f.employment_type} onChange={(e) => set("employment_type", e.target.value)} className="field-input mt-1.5">
              <option value="">Any</option>
              {EMPLOYMENT_TYPES.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-medium text-ink-700">
            Experience (years)
            <input value={f.experience} onChange={(e) => set("experience", e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="field-input mt-1.5" placeholder="e.g. 4" />
          </label>
          <label className="text-[13px] font-medium text-ink-700">
            Minimum salary (LPA)
            <input value={f.salary_min} onChange={(e) => set("salary_min", e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="field-input mt-1.5" placeholder="e.g. 12" />
          </label>
        </div>
      )}

      <div className="mb-3 mt-5 flex items-center gap-2 text-sm text-ink-500" aria-live="polite">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        <span>
          {jobs.length} job{jobs.length === 1 ? "" : "s"}
        </span>
      </div>

      {jobs.length ? (
        <div className={cn("grid gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3", loading && "opacity-60")}>
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-line-strong p-10 text-center">
          <p className="text-[15px] font-medium text-ink-800">{f.saved_only ? "You haven't saved any jobs yet" : "No jobs match these filters"}</p>
          <p className="mt-1 text-sm text-ink-500">Try fewer filters — new roles are added every week.</p>
        </div>
      )}
    </div>
  );
}
