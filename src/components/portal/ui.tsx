"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Briefcase, Building2, Check, Clock, IndianRupee, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PORTAL_STEPS, expRange, salaryLabel, type CandidateJob, type Completion, type MyApplication } from "@/lib/portal-types";
import { MatchRing, SkillChip, istDate, relTime } from "@/components/portal-ui/kit";
import { ApplyButton } from "./apply-button";
import { cn, friendlyError } from "@/lib/utils";

/** "What happens next" copy for each friendly step */
export const NEXT_STEP: Record<number, string> = {
  0: "Our recruiters are reviewing your application — usually within 2 working days.",
  1: "A Synerax recruiter is screening your profile and may call you to confirm details.",
  2: "The employer is reviewing your profile — usually 2–3 days.",
  3: "You're in the interview stage. Check the details below and prepare well.",
  4: "Congratulations! Your recruiter will walk you through the offer and joining.",
  5: "You've joined — all the best in your new role!",
};

/** Labelled stepper: Applied → Under review → Shared with employer → Interview → Offer → Joined (with dates) */
export function StageTracker({ step, label, compact, history }: { step: number; label: string; compact?: boolean; history?: { step: number; at: string }[] }) {
  const closed = step < 0;
  const dateOf = (i: number) => history?.find((h) => h.step === i)?.at;
  return (
    <ol className="grid grid-cols-6" aria-label={`Application status: ${label}`}>
      {PORTAL_STEPS.map((s, i) => {
        const done = !closed && i < step;
        const current = !closed && i === step;
        const at = done || current ? dateOf(i) : undefined;
        return (
          <li key={s} className="relative flex flex-col items-center text-center" aria-current={current ? "step" : undefined}>
            {i > 0 && <span className={cn("absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2", done || current ? "bg-jade" : "bg-surface-3")} aria-hidden />}
            <span className="relative z-10 flex h-6 w-6 items-center justify-center">
              {current && <span className="absolute inset-0 animate-ping rounded-full bg-jade/40" aria-hidden />}
              <span
                className={cn(
                  "relative flex h-6 w-6 items-center justify-center rounded-full text-[10.5px] font-semibold ring-4 ring-surface transition-colors",
                  done ? "bg-jade text-white" : current ? "bg-jade text-white" : "bg-surface-3 text-ink-400"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
            </span>
            {!compact && (
              <>
                <span className={cn("mt-1.5 px-0.5 text-[10.5px] leading-tight sm:text-[11.5px]", current ? "font-semibold text-ink-900" : done ? "text-ink-700" : "text-ink-400")}>{s}</span>
                <span className="text-[10px] tabular text-ink-400 sm:text-[10.5px]" suppressHydrationWarning>
                  {at ? istDate(at, { day: "numeric", month: "short" }) : " "}
                </span>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Stepper + what's-next line for one application */
export function ApplicationProgress({ app }: { app: MyApplication }) {
  if (app.withdrawn || app.step < 0) return null;
  return (
    <div>
      <StageTracker step={app.step} label={app.status_label} history={app.history} />
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-jade-50/60 px-3 py-2 text-[12.5px] text-ink-700">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jade-700" aria-hidden />
        <span>
          <b className="font-semibold text-ink-900">What&apos;s next:</b> {NEXT_STEP[app.step]}
        </span>
      </p>
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
      title={saved ? "Saved" : "Save for later"}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-500 transition-colors hover:border-jade/40 hover:text-jade-700 disabled:opacity-50",
        saved && "border-jade/40 bg-jade-50 text-jade-700",
        className
      )}
    >
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
    </button>
  );
}


/** Rich job card: match ring, facts, matched vs missing skills, Apply + Save */
export function JobCard({ job, completion, className }: { job: CandidateJob; completion?: Completion; className?: string }) {
  const exp = expRange(job.exp_min, job.exp_max);
  const salary = salaryLabel(job.salary_min, job.salary_max);
  const missing = (job.missing_skills ?? job.skills.filter((s) => !job.matched_skills.includes(s.name)).map((s) => s.name)).slice(0, 3);
  return (
    <article className={cn("portal-card interactive group relative flex h-full flex-col p-5", className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-jade-50 to-surface-3 text-jade-700 ring-1 ring-inset ring-line">
          <Building2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[15.5px] font-semibold leading-snug text-ink-900">
            <Link href={`/portal/jobs/${job.id}`} className="after:absolute after:inset-0 after:rounded-[1.25rem] group-hover:text-jade-700">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-500">{job.company}</p>
        </div>
        <MatchRing value={job.match} size={50} label={null} />
      </div>

      <ul className="mt-3.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] text-ink-600">
        {(job.locations.length > 0 || job.work_mode) && (
          <li className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-ink-400" aria-hidden /> {[job.locations.slice(0, 2).join(", "), job.work_mode].filter(Boolean).join(" · ")}
          </li>
        )}
        {exp && (
          <li className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5 text-ink-400" aria-hidden /> {exp}
          </li>
        )}
        {salary && (
          <li className="flex items-center gap-1 font-medium text-ink-800">
            <IndianRupee className="h-3.5 w-3.5 text-ink-400" aria-hidden /> {salary.replace("₹", "")}
          </li>
        )}
        {job.published_at && (
          <li className="flex items-center gap-1 text-ink-400" suppressHydrationWarning>
            <Clock className="h-3.5 w-3.5" aria-hidden /> {relTime(job.published_at)}
          </li>
        )}
      </ul>

      {(job.matched_skills.length > 0 || missing.length > 0) && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {job.matched_skills.slice(0, 4).map((s) => (
            <SkillChip key={s} name={`✓ ${s}`} tone="jade" />
          ))}
          {missing.map((s) => (
            <SkillChip key={s} name={s} tone="missing" />
          ))}
        </div>
      )}

      <div className="relative z-10 mt-auto flex items-center gap-2 pt-4">
        {job.applied ? (
          <span className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-jade-50 text-[13px] font-semibold text-jade-700">
            <Check className="h-4 w-4" aria-hidden /> Applied
          </span>
        ) : completion ? (
          <ApplyButton jobId={job.id} applied={false} completion={completion} className="h-10 flex-1 rounded-xl px-4 text-[13.5px]" />
        ) : (
          <Link href={`/portal/jobs/${job.id}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-jade text-[13.5px] font-semibold text-white shadow-glow hover:brightness-110">
            View & apply
          </Link>
        )}
        <SaveJobButton jobId={job.id} saved={job.saved} />
      </div>
    </article>
  );
}

/** Refresh helper for client components after an RPC */
export function useRefresh() {
  const router = useRouter();
  return () => router.refresh();
}
