"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EMPLOYMENT_TYPES, WORK_MODES } from "@/lib/constants";
import type { CandidateJob, Completion } from "@/lib/portal-types";
import { JobCard } from "@/components/portal/ui";
import { EmptyState } from "@/components/portal-ui/kit";
import { cn } from "@/lib/utils";

type Filters = {
  q: string;
  location: string;
  work_mode: string;
  employment_type: string;
  experience: string;
  salary_min: string;
  posted_within: string;
  skills: string[];
  saved_only: boolean;
  sort: "match" | "newest";
};

const EMPTY: Filters = { q: "", location: "", work_mode: "", employment_type: "", experience: "", salary_min: "", posted_within: "", skills: [], saved_only: false, sort: "match" };
const PAGE = 12;

export function JobsBrowser({ initial, mySkills, myExperience, completion }: { initial: CandidateJob[]; mySkills: { id: string; name: string }[]; myExperience: number | null; completion: Completion }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [jobs, setJobs] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [panel, setPanel] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await createClient().rpc("candidate_jobs", {
        f: {
          q: f.q,
          location: f.location,
          work_mode: f.work_mode,
          employment_type: f.employment_type,
          experience: f.experience,
          salary_min: f.salary_min,
          posted_within: f.posted_within,
          skills: f.skills,
          saved_only: f.saved_only,
          sort: f.sort,
          limit: 100,
        },
      });
      setJobs((data ?? []) as CandidateJob[]);
      setShown(PAGE);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [f]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));
  const chips: { label: string; clear: () => void }[] = [
    ...(f.location ? [{ label: `📍 ${f.location}`, clear: () => set("location", "") }] : []),
    ...(f.work_mode ? [{ label: f.work_mode, clear: () => set("work_mode", "") }] : []),
    ...(f.employment_type ? [{ label: f.employment_type, clear: () => set("employment_type", "") }] : []),
    ...(f.experience ? [{ label: `${f.experience} yrs exp`, clear: () => set("experience", "") }] : []),
    ...(f.salary_min ? [{ label: `₹${f.salary_min}+ LPA`, clear: () => set("salary_min", "") }] : []),
    ...(f.posted_within ? [{ label: `Last ${f.posted_within} days`, clear: () => set("posted_within", "") }] : []),
    ...f.skills.map((id) => ({ label: mySkills.find((s) => s.id === id)?.name ?? "Skill", clear: () => set("skills", f.skills.filter((x) => x !== id)) })),
    ...(f.saved_only ? [{ label: "Saved jobs", clear: () => set("saved_only", false) }] : []),
  ];

  const pill = (on: boolean) => cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors", on ? "border-jade bg-jade-50 text-jade-700" : "border-line bg-surface text-ink-600 hover:border-line-strong");

  const sidebar = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-400">Your skills</p>
        {mySkills.length ? (
          <div className="flex flex-wrap gap-1.5">
            {mySkills.slice(0, 14).map((s) => {
              const on = f.skills.includes(s.id);
              return (
                <button key={s.id} onClick={() => set("skills", on ? f.skills.filter((x) => x !== s.id) : [...f.skills, s.id])} aria-pressed={on} className={pill(on)}>
                  {s.name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-500">Add skills to your profile to filter by them.</p>
        )}
      </div>
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-400">Work mode</p>
        <div className="flex flex-wrap gap-1.5">
          {WORK_MODES.filter((w) => w !== "Any").map((w) => (
            <button key={w} onClick={() => set("work_mode", f.work_mode === w ? "" : w)} aria-pressed={f.work_mode === w} className={pill(f.work_mode === w)}>
              {w}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-ink-400">Experience</span>
        <div className="flex items-center gap-2">
          <input value={f.experience} onChange={(e) => set("experience", e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="field-input h-10" placeholder="Years, e.g. 4" />
          {myExperience !== null && (
            <button onClick={() => set("experience", f.experience ? "" : String(myExperience))} className={pill(!!f.experience)}>
              Mine
            </button>
          )}
        </div>
      </label>
      <label className="block">
        <span className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-ink-400">Minimum salary</span>
        <input value={f.salary_min} onChange={(e) => set("salary_min", e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="field-input h-10" placeholder="LPA, e.g. 12" />
      </label>
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-400">Job type</p>
        <select value={f.employment_type} onChange={(e) => set("employment_type", e.target.value)} className="field-input h-10" aria-label="Job type">
          <option value="">Any</option>
          {EMPLOYMENT_TYPES.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </div>
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-400">Posted</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            ["1", "24 hrs"],
            ["7", "7 days"],
            ["30", "30 days"],
          ].map(([v, l]) => (
            <button key={v} onClick={() => set("posted_within", f.posted_within === v ? "" : v)} aria-pressed={f.posted_within === v} className={pill(f.posted_within === v)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => set("saved_only", !f.saved_only)} aria-pressed={f.saved_only} className={cn(pill(f.saved_only), "inline-flex items-center gap-1.5")}>
        <Bookmark className="h-3.5 w-3.5" aria-hidden /> Saved jobs only
      </button>
    </div>
  );

  return (
    <div>
      {/* sticky search */}
      <div className="sticky top-16 z-20 -mx-4 mb-5 border-b border-line/70 bg-canvas/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Job title, skill or department" className="field-input h-12 pl-10 text-[15px]" aria-label="Search jobs" />
          </div>
          <div className="relative sm:w-56">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="City" className="field-input h-12 pl-10" aria-label="Location" />
          </div>
          <button onClick={() => setPanel(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-[14px] font-medium text-ink-700 lg:hidden">
            <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
            {chips.length > 0 && <span className="rounded-full bg-jade px-1.5 text-[11px] font-semibold text-white">{chips.length}</span>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="portal-card sticky top-[148px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
                <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
              </p>
              {chips.length > 0 && (
                <button onClick={() => setF({ ...EMPTY, q: f.q, sort: f.sort })} className="text-[12px] font-medium text-jade-700 hover:underline">
                  Reset
                </button>
              )}
            </div>
            {sidebar}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="text-[14px] text-ink-600" aria-live="polite">
              <b className="font-semibold tabular text-ink-900">{loading ? "…" : jobs.length}</b> job{jobs.length === 1 ? "" : "s"}
              {f.q ? ` for “${f.q}”` : ""}
            </p>
            <div className="ml-auto flex rounded-xl border border-line bg-surface p-1 text-[12.5px]" role="group" aria-label="Sort">
              {(
                [
                  ["match", "Best match"],
                  ["newest", "Newest"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} onClick={() => set("sort", v)} aria-pressed={f.sort === v} className={cn("rounded-lg px-3 py-1.5 font-medium", f.sort === v ? "bg-surface-3 text-ink-900" : "text-ink-500 hover:text-ink-800")}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button key={c.label} onClick={c.clear} className="inline-flex items-center gap-1 rounded-full bg-jade-50 px-2.5 py-1 text-[12px] font-medium text-jade-700 hover:bg-jade-100">
                  {c.label} <X className="h-3 w-3" aria-label="Remove filter" />
                </button>
              ))}
              <button onClick={() => setF({ ...EMPTY, q: f.q, sort: f.sort })} className="px-2 text-[12px] font-medium text-ink-500 hover:text-ink-900">
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="portal-card space-y-3 p-5">
                  <div className="flex gap-3">
                    <div className="skeleton h-11 w-11" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-3/4" />
                      <div className="skeleton h-3 w-1/2" />
                    </div>
                    <div className="skeleton h-12 w-12 rounded-full" />
                  </div>
                  <div className="skeleton h-3 w-2/3" />
                  <div className="flex gap-1.5">
                    <div className="skeleton h-6 w-16" />
                    <div className="skeleton h-6 w-20" />
                    <div className="skeleton h-6 w-14" />
                  </div>
                  <div className="skeleton h-10 w-full" />
                </div>
              ))}
            </div>
          ) : jobs.length ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {jobs.slice(0, shown).map((j) => (
                  <JobCard key={j.id} job={j} completion={completion} />
                ))}
              </div>
              {shown < jobs.length && (
                <div className="mt-6 text-center">
                  <button onClick={() => setShown((s) => s + PAGE)} className="inline-flex h-11 items-center rounded-xl border border-line bg-surface px-5 text-[14px] font-medium text-ink-700 hover:border-line-strong">
                    Show more jobs ({jobs.length - shown} left)
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={f.saved_only ? Bookmark : Search}
              title={f.saved_only ? "You haven't saved any jobs yet" : "No jobs match these filters"}
              text={f.saved_only ? "Tap the bookmark on any job to save it for later." : "Try fewer filters — new roles are added every week."}
              action={
                chips.length ? (
                  <button onClick={() => setF(EMPTY)} className="mt-4 inline-flex h-10 items-center rounded-xl bg-jade px-4 text-[13.5px] font-semibold text-white">
                    Clear filters
                  </button>
                ) : undefined
              }
            />
          )}
        </div>
      </div>

      {/* mobile filter sheet */}
      {panel && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" onClick={() => setPanel(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-pop">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[16px] font-semibold text-ink-900">Filters</p>
              <button onClick={() => setPanel(false)} className="rounded-lg p-1.5 text-ink-500 hover:bg-surface-3" aria-label="Close filters">
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebar}
            <button onClick={() => setPanel(false)} className="mt-6 h-12 w-full rounded-xl bg-jade text-[15px] font-semibold text-white">
              Show {jobs.length} job{jobs.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
