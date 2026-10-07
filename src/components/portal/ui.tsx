"use client";

import { expRange } from "@/lib/portal-types";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Briefcase, Check, Clock, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PORTAL_STEPS, type CandidateJob } from "@/lib/portal-types";
import { cn, friendlyError } from "@/lib/utils";

/** Horizontal tracker: Applied → Under review → Shared with employer → Interview → Offer → Joined */
export function StageTracker({ step, label, compact }: { step: number; label: string; compact?: boolean }) {
  const closed = step < 0;
  return (
    <div>
      <ol className="flex items-center" aria-label={`Application status: ${label}`}>
        {PORTAL_STEPS.map((s, i) => {
          const done = !closed && i < step;
          const current = !closed && i === step;
          return (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold transition-colors",
                  done ? "bg-jade text-white" : current ? "bg-jade text-white ring-4 ring-jade/20" : "bg-surface-3 text-ink-400"
                )}
                aria-current={current ? "step" : undefined}
                title={s}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              {i < PORTAL_STEPS.length - 1 && <span className={cn("mx-1 h-0.5 flex-1 rounded-full", done ? "bg-jade" : "bg-surface-3")} aria-hidden />}
            </li>
          );
        })}
      </ol>
      {!compact && (
        <div className="mt-2 hidden grid-cols-6 text-[11px] text-ink-400 sm:grid">
          {PORTAL_STEPS.map((s, i) => (
            <span key={s} className={cn("pr-1", i === step && "font-semibold text-ink-800", i === PORTAL_STEPS.length - 1 && "text-right")}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function MatchBadge({ value, size = "md" }: { value: number | null | undefined; size?: "sm" | "md" }) {
  if (value === null || value === undefined) return null;
  const tone = value >= 75 ? "bg-jade-50 text-jade-700 ring-jade/20" : value >= 50 ? "bg-saffron-50 text-saffron-800 ring-saffron/25" : "bg-surface-3 text-ink-500 ring-line";
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full font-semibold tabular ring-1 ring-inset", tone, size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]")}>
      <Sparkles className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden /> {value}% match
    </span>
  );
}

export function SaveJobButton({ jobId, saved: initial, className }: { jobId: string; saved: boolean; className?: string }) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    const { data, error } = await createClient().rpc("candidate_toggle_saved_job", { p_job: jobId });
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    setSaved(!!data);
    toast.success(data ? "Job saved" : "Removed from saved jobs");
  };
  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved jobs" : "Save job"}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-500 transition-colors hover:border-jade/40 hover:text-jade-700 disabled:opacity-50", saved && "border-jade/40 text-jade-700", className)}
    >
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
    </button>
  );
}

export function JobCard({ job }: { job: CandidateJob }) {
  const exp = expRange(job.exp_min, job.exp_max);
  return (
    <article className="card-premium lift group relative flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold leading-snug text-ink-900">
            <Link href={`/portal/jobs/${job.id}`} className="after:absolute after:inset-0 hover:text-jade-700">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-500">{job.company}</p>
        </div>
        <MatchBadge value={job.match} size="sm" />
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-500">
        {(job.locations.length > 0 || job.work_mode) && (
          <li className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {[job.locations.slice(0, 2).join(", "), job.work_mode].filter(Boolean).join(" · ")}
          </li>
        )}
        {exp && (
          <li className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden /> {exp}
          </li>
        )}
        {job.employment_type && (
          <li className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" aria-hidden /> {job.employment_type}
          </li>
        )}
      </ul>
      {job.matched_skills.length > 0 && (
        <p className="mt-3 text-[12.5px] text-ink-600">
          <span className="font-medium text-jade-700">Why you match:</span> {job.matched_skills.slice(0, 4).join(", ")}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        {job.applied ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-jade-50 px-2.5 py-1 text-[12px] font-semibold text-jade-700">
            <Check className="h-3.5 w-3.5" aria-hidden /> Applied
          </span>
        ) : (
          <span className="text-[12px] text-ink-400">{job.openings > 1 ? `${job.openings} openings` : "1 opening"}</span>
        )}
        <SaveJobButton jobId={job.id} saved={job.saved} className="relative z-10" />
      </div>
    </article>
  );
}

/** Refresh helper for client components after an RPC */
export function useRefresh() {
  const router = useRouter();
  return () => router.refresh();
}
