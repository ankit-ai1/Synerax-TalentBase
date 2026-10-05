import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CalendarDays, ChevronLeft, GraduationCap, IndianRupee, MapPin, Pencil, Timer, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { describeActivity } from "@/lib/activity";
import { APP_SELECT } from "@/lib/selects";
import { LinkButton } from "@/components/ui/button";
import { Avatar, Badge, Card, CardHeader, EmptyState, Priority } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/interactive";
import { range, stageCounts } from "@/components/jobs/job-row";
import { Pipeline } from "@/components/jobs/pipeline";
import { Matches } from "@/components/jobs/matches";
import { JobActions, JobStatusControl } from "@/components/jobs/job-actions";
import { ACTIVE_STAGES, STAGE_STYLE } from "@/lib/constants";
import { cn, daysUntil, formatDate, formatDateTime, noticeLabel, timeAgo } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("title").eq("id", id).maybeSingle();
  return { title: data?.title ?? "Job" };
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireStaff();
  const supabase = await createClient();
  const [{ data: j }, { data: apps }, { data: logs }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, client:clients(id, name, client_code), role:job_roles(name), job_skills(is_mandatory, min_years, skill:skills(id, name)), job_assignees(user:profiles(id, full_name)), creator:profiles!jobs_created_by_fkey(full_name)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("applications").select(APP_SELECT).eq("job_id", id).order("position").order("stage_changed_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("id, action, details, created_at, candidate_id, actor:profiles!activity_logs_actor_id_fkey(full_name)")
      .eq("details->>job_id", id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  if (!j) notFound();

  const counts = stageCounts((apps ?? []) as any[]);
  const joined = counts.Joined ?? 0;
  const days = daysUntil(j.target_date);
  const skills = (j.job_skills ?? []).filter((s: any) => s.skill);
  const team = (j.job_assignees ?? []).map((a: any) => a.user).filter(Boolean);
  const funnelMax = Math.max(1, ...ACTIVE_STAGES.map((s) => counts[s] ?? 0));

  const facts = [
    { icon: <MapPin className="h-4 w-4" />, label: "Location", value: [(j.locations ?? []).join(", "), j.work_mode].filter(Boolean).join(" · ") || "—" },
    { icon: <Timer className="h-4 w-4" />, label: "Experience", value: range(j.exp_min, j.exp_max, "yrs") ?? "Any" },
    { icon: <IndianRupee className="h-4 w-4" />, label: "Budget", value: range(j.ctc_min, j.ctc_max, "LPA") ?? "Open" },
    { icon: <CalendarDays className="h-4 w-4" />, label: "Notice", value: j.notice_max != null ? `Max ${noticeLabel(j.notice_max)}` : "Any" },
    { icon: <GraduationCap className="h-4 w-4" />, label: "Qualification", value: j.qualification ?? "Any" },
    { icon: <Users className="h-4 w-4" />, label: "Openings", value: `${joined} / ${j.openings} filled` },
  ];

  return (
    <>
      <Link href="/jobs" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-800">
        <ChevronLeft className="h-4 w-4" /> Jobs
      </Link>

      <header className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink-900">{j.title}</h1>
              <JobStatusControl id={j.id} status={j.status} />
              <Priority value={j.priority} />
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
              {j.client ? (
                <Link href={`/clients/${j.client.id}`} className="inline-flex items-center gap-1.5 font-medium text-ink-700 hover:text-jade-700">
                  <Building2 className="h-4 w-4 text-ink-400" />
                  {j.client.name}
                </Link>
              ) : (
                <span>Internal</span>
              )}
              <span className="font-mono text-xs text-ink-400">{j.job_code}</span>
              {j.role?.name && <span>{j.role.name}</span>}
              <span className="text-ink-400">Opened {formatDate(j.opened_at)}</span>
              {j.target_date && j.status === "Open" && (
                <span className={cn(days !== null && days < 0 ? "text-red-600 dark:text-red-400" : days !== null && days <= 7 ? "text-saffron-600" : "")}>
                  Target {formatDate(j.target_date, { day: "numeric", month: "short" })}
                  {days !== null && ` (${days < 0 ? `${-days}d overdue` : `${days}d left`})`}
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <LinkButton href={`/jobs/${j.id}/edit`} variant="secondary">
              <Pencil className="h-4 w-4" /> Edit
            </LinkButton>
            <JobActions job={j as any} isAdmin={profile.role === "admin"} />
          </div>
        </div>

        {/* funnel strip */}
        <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-xl border border-line bg-surface shadow-card sm:grid-cols-6">
          {ACTIVE_STAGES.map((st, i) => (
            <div key={st} className={cn("relative px-4 py-3.5", i > 0 && "border-l border-line", i >= 3 && "border-t border-line sm:border-t-0")}>
              <p className="flex items-center gap-1.5 text-xs text-ink-500">
                <span className={cn("h-1.5 w-1.5 rounded-full", STAGE_STYLE[st].dot)} />
                {st}
              </p>
              <p className="mt-1 text-2xl font-semibold leading-none tabular text-ink-900">{counts[st] ?? 0}</p>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-surface-3">
                <div className="h-full" style={{ width: `${((counts[st] ?? 0) / funnelMax) * 100}%`, background: STAGE_STYLE[st].hex }} />
              </div>
            </div>
          ))}
        </div>
      </header>

      <Tabs
        tabs={[
          {
            id: "pipeline",
            label: "Pipeline",
            count: (apps ?? []).length,
            content: <Pipeline jobId={j.id} jobTitle={j.title} apps={(apps ?? []) as any[]} />,
          },
          {
            id: "matches",
            label: "Matching candidates",
            content: <Matches jobId={j.id} />,
          },
          {
            id: "details",
            label: "Job details",
            content: (
              <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <Card>
                  <CardHeader title="Job description" />
                  <div className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-ink-700">
                    {j.description || <span className="text-ink-400">No JD added. Edit the job to paste it.</span>}
                  </div>
                </Card>
                <div className="space-y-6">
                  <Card>
                    <CardHeader title="Requirement" />
                    <dl className="divide-y divide-line">
                      {facts.map((f) => (
                        <div key={f.label} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                          <span className="text-ink-400">{f.icon}</span>
                          <dt className="w-28 text-ink-500">{f.label}</dt>
                          <dd className="flex-1 text-right font-medium text-ink-800">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                  <Card>
                    <CardHeader title="Skills" description="Must-have skills carry double weight" />
                    <div className="flex flex-wrap gap-1.5 p-5">
                      {skills.length === 0 && <p className="text-sm text-ink-400">No skills</p>}
                      {skills.map((s: any) => (
                        <Badge key={s.skill.id} tone={s.is_mandatory ? "jade" : "outline"}>
                          {s.skill.name}
                          {s.min_years ? ` · ${Number(s.min_years)}y+` : ""}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                  <Card>
                    <CardHeader title="Team" />
                    <div className="space-y-3 p-5">
                      {team.length === 0 && <p className="text-sm text-ink-400">No recruiters assigned</p>}
                      {team.map((u: any) => (
                        <div key={u.id} className="flex items-center gap-2.5 text-sm">
                          <Avatar name={u.full_name} size="sm" />
                          {u.full_name}
                        </div>
                      ))}
                      {j.hiring_manager && <p className="pt-2 text-[13px] text-ink-500">Hiring manager: {j.hiring_manager}</p>}
                      {j.notes && <p className="whitespace-pre-wrap border-t border-line pt-3 text-[13px] text-ink-600">{j.notes}</p>}
                    </div>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            id: "activity",
            label: "Activity",
            content: (
              <Card>
                {(logs ?? []).length === 0 ? (
                  <EmptyState title="No activity yet" compact />
                ) : (
                  <ol className="divide-y divide-line">
                    {(logs ?? []).map((l: any) => (
                      <li key={l.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                        <p className="text-ink-700">
                          <span className="font-medium text-ink-900">{l.actor?.full_name ?? "System"}</span> {describeActivity(l)}
                        </p>
                        <time className="shrink-0 text-xs text-ink-400" title={formatDateTime(l.created_at)}>
                          {timeAgo(l.created_at)}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            ),
          },
        ]}
      />
      <p className="mt-6 text-xs text-ink-400">Created by {(j as any).creator?.full_name ?? "—"}</p>
    </>
  );
}
