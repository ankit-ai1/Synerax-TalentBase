import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { AvatarStack, JobStatusBadge, Priority } from "@/components/ui/misc";
import { ACTIVE_STAGES, STAGE_STYLE } from "@/lib/constants";
import { cn, daysUntil, formatDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const JOB_LIST_SELECT =
  "id, job_code, title, status, priority, openings, locations, work_mode, exp_min, exp_max, ctc_min, ctc_max, target_date, opened_at, created_at, client:clients(id, name), applications(stage), job_assignees(user:profiles(full_name))";

export function stageCounts(apps: { stage: string }[]) {
  const c: Record<string, number> = {};
  for (const a of apps ?? []) c[a.stage] = (c[a.stage] ?? 0) + 1;
  return c;
}

export function range(min: any, max: any, unit: string) {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${Number(min)}–${Number(max)} ${unit}`;
  if (min != null) return `${Number(min)}+ ${unit}`;
  return `upto ${Number(max)} ${unit}`;
}

export function PipelineBar({ counts, className }: { counts: Record<string, number>; className?: string }) {
  const total = ACTIVE_STAGES.reduce((s, st) => s + (counts[st] ?? 0), 0);
  return (
    <div className={cn("flex h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      {total > 0 &&
        ACTIVE_STAGES.map((st) =>
          counts[st] ? (
            <div key={st} className={STAGE_STYLE[st].dot} style={{ width: `${(counts[st] / total) * 100}%` }} title={`${st}: ${counts[st]}`} />
          ) : null
        )}
    </div>
  );
}

export function JobRow({ job }: { job: any }) {
  const counts = stageCounts(job.applications);
  const active = ACTIVE_STAGES.filter((s) => s !== "Joined").reduce((s, st) => s + (counts[st] ?? 0), 0);
  const joined = counts.Joined ?? 0;
  const days = daysUntil(job.target_date);
  const recruiters = (job.job_assignees ?? []).map((a: any) => a.user?.full_name).filter(Boolean);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group grid gap-4 rounded-xl border border-line bg-surface p-4 shadow-card transition-all hover:border-line-strong hover:shadow-pop sm:p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Priority value={job.priority} showLabel={false} />
          <p className="truncate text-[15px] font-semibold text-ink-900 group-hover:text-jade-700">{job.title}</p>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
          <span className="font-medium text-ink-700">{job.client?.name ?? "Internal"}</span>
          <span className="font-mono text-xs text-ink-400">{job.job_code}</span>
          {(job.locations ?? []).length > 0 && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-ink-400" />
              {job.locations.slice(0, 2).join(", ")}
              {job.locations.length > 2 && ` +${job.locations.length - 2}`}
            </span>
          )}
          {job.work_mode && <span>{job.work_mode}</span>}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
          {range(job.exp_min, job.exp_max, "yrs") && <span>{range(job.exp_min, job.exp_max, "yrs")}</span>}
          {range(job.ctc_min, job.ctc_max, "LPA") && <span>₹{range(job.ctc_min, job.ctc_max, "LPA")}</span>}
        </p>
      </div>

      <div className="min-w-0 self-center">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-ink-500">
            <b className="font-semibold tabular text-ink-900">{active}</b> in pipeline
          </span>
          <span className={cn("tabular", joined ? "font-medium text-jade-700" : "text-ink-400")}>
            {joined}/{job.openings} filled
          </span>
        </div>
        <PipelineBar counts={counts} />
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-400">
          {["Submitted", "Interview", "Offered"].map((st) => (
            <span key={st}>
              {st} <b className="font-semibold tabular text-ink-700">{counts[st] ?? 0}</b>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end lg:justify-center">
        {recruiters.length > 0 ? <AvatarStack names={recruiters} /> : <Users className="h-4 w-4 text-ink-300" />}
        {job.target_date && job.status === "Open" ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              days !== null && days < 0 ? "text-red-600 dark:text-red-400" : days !== null && days <= 7 ? "text-saffron-600" : "text-ink-400"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {days !== null && days < 0 ? `${-days}d overdue` : days === 0 ? "Due today" : `${days}d left`}
          </span>
        ) : (
          <span className="text-xs text-ink-400">Opened {formatDate(job.opened_at, { day: "numeric", month: "short" })}</span>
        )}
      </div>
    </Link>
  );
}
