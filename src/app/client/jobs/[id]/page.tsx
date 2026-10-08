import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  IndianRupee,
  MapPin,
  Send,
  Sparkles,
  Target,
  Trophy,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClientJobDetail, SharedProfile } from "@/lib/client-types";
import { Avatar, Chip, DateBlock, EmptyState, Fact, JOB_STATUS_TONE, MODE_ICON, Section, SkillChip, TimeAgo, istDate, istTime } from "@/components/portal-ui/kit";
import { ClientJobActions } from "@/components/client/client-job-actions";
import { SharedProfiles } from "@/components/client/shared-profiles";
import { cn, noticeLabel } from "@/lib/utils";

export const metadata = { title: "Job" };

const range = (a: number | null, b: number | null, unit: string) =>
  a == null && b == null ? null : a != null && b != null ? `${a}–${b} ${unit}` : a != null ? `${a}+ ${unit}` : `Up to ${b} ${unit}`;

type Tab = "overview" | "profiles" | "interviews" | "activity";

export default async function ClientJobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; posted?: string }> }) {
  await requireRole("client");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: jobData }, { data: sharedData }] = await Promise.all([supabase.rpc("client_job", { p_job: id }), supabase.rpc("client_shared_candidates", { p_job: id })]);
  const job = jobData as ClientJobDetail | null;
  if (!job) notFound();
  const shared = (sharedData ?? []) as SharedProfile[];
  const pending = shared.filter((p) => p.decision === "Pending").length;
  const joined = shared.filter((p) => p.stage === "Joined").length;
  const tab: Tab = (["profiles", "interviews", "activity"] as const).find((t) => t === sp.tab) ?? "overview";
  const interviews = shared
    .flatMap((p) => p.interviews.map((i) => ({ ...i, name: p.name, application_id: p.application_id })))
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  const upcoming = interviews.filter((i) => new Date(i.scheduled_at).getTime() > Date.now() - 3600e3 && i.status !== "Completed").reverse();
  const past = interviews.filter((i) => !upcoming.includes(i));
  const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const overdue = job.target_date && job.target_date < today && job.status === "Open";

  // activity built from the profiles on this job
  type Ev = { at: string; icon: typeof Send; tone: string; text: React.ReactNode };
  const events: Ev[] = [
    { at: job.created_at, icon: Clock, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-300", text: <>Job posted</> },
    ...(job.published_at ? [{ at: job.published_at, icon: CheckCircle2, tone: "bg-jade-50 text-jade-700", text: <>Published — Synerax started sourcing</> }] : []),
    ...shared.flatMap((p): Ev[] => [
      ...(p.shared_at ? [{ at: p.shared_at, icon: Send, tone: "bg-sky-500/10 text-sky-600 dark:text-sky-300", text: <>Synerax shared <b>{p.name}</b></> }] : []),
      ...(p.decision_at && p.decision !== "Pending"
        ? [{ at: p.decision_at, icon: p.decision === "Approved" ? UserCheck : XCircle, tone: p.decision === "Approved" ? "bg-jade-50 text-jade-700" : "bg-surface-3 text-ink-500", text: <>You {p.decision === "Approved" ? "approved" : "rejected"} <b>{p.name}</b></> }]
        : []),
      ...p.interviews.map((i) => ({ at: i.scheduled_at, icon: CalendarClock, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-300", text: <><b>{p.name}</b> · {i.round} ({i.status.toLowerCase()})</> })),
      ...(p.stage === "Joined" ? [{ at: p.decision_at ?? p.shared_at ?? job.created_at, icon: Trophy, tone: "bg-emerald-500/10 text-emerald-600", text: <><b>{p.name}</b> joined</> }] : []),
    ]),
  ]
    .filter((e) => e.at && new Date(e.at).getTime() <= Date.now() + 60_000)
    .sort((a, b) => b.at.localeCompare(a.at));

  const facts = [
    { icon: MapPin, label: "Location", value: [job.locations.join(", "), job.work_mode].filter(Boolean).join(" · ") || "—" },
    { icon: Briefcase, label: "Work mode", value: job.work_mode ?? "—" },
    { icon: Clock, label: "Experience", value: range(job.exp_min, job.exp_max, "yrs") ?? "Any" },
    { icon: IndianRupee, label: "Budget", value: range(job.ctc_min, job.ctc_max, "LPA") ?? "—" },
    { icon: Users, label: "Openings", value: `${joined} of ${job.openings} filled` },
    { icon: Target, label: "Target date", value: job.target_date ? istDate(job.target_date) : "—" },
    { icon: CalendarDays, label: "Notice (max)", value: job.notice_max != null ? noticeLabel(job.notice_max) : "Flexible" },
    { icon: GraduationCap, label: "Qualification", value: job.qualification ?? "Any" },
  ];

  const tabs: { id: Tab; label: string; count?: number; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "profiles", label: "Shared profiles", count: shared.length, badge: pending },
    { id: "interviews", label: "Interviews", count: interviews.length },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="portal-in">
      <Link href="/client/jobs" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> My jobs
      </Link>

      {sp.posted && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-jade/30 bg-jade-50 px-5 py-4 text-[14.5px] text-jade-700" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span>Thanks — your job has been sent to Synerax. We&apos;ll review it, publish it and start sourcing, usually within one working day.</span>
        </div>
      )}

      {/* sticky header with actions */}
      <div className="sticky top-16 z-20 -mx-4 mb-5 border-b border-line/70 bg-canvas/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[22px] font-semibold tracking-[-0.025em] text-ink-900 sm:text-[26px]">{job.title}</h1>
              <Chip tone={JOB_STATUS_TONE[job.status] ?? "ink"} pulse={job.status === "Pending review"}>
                {job.status}
              </Chip>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink-500">
              <span className="font-mono text-[11.5px] text-ink-400">{job.job_code}</span>
              <span>· Posted {istDate(job.created_at)}</span>
              {job.status === "Pending review" && <span className="text-violet-600 dark:text-violet-300">· Synerax is reviewing this job</span>}
              {overdue && <span className="font-semibold text-red-600 dark:text-red-400">· Target date passed</span>}
              {job.client_close_reason && <span>· Closed: {job.client_close_reason}</span>}
            </p>
          </div>
          <ClientJobActions jobId={job.id} title={job.title} canEdit={job.can_edit} status={job.status} />
        </div>
        <nav className="-mb-3 mt-3 flex gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="Job sections">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={t.id === "overview" ? `/client/jobs/${job.id}` : `/client/jobs/${job.id}?tab=${t.id}`}
              aria-current={tab === t.id ? "page" : undefined}
              scroll={false}
              className={cn(
                "relative flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-[13.5px] transition-colors",
                tab === t.id ? "border-jade font-semibold text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800"
              )}
            >
              {t.label}
              {t.count !== undefined && <span className="rounded-full bg-surface-3 px-1.5 text-[11px] font-semibold tabular text-ink-600">{t.count}</span>}
              {!!t.badge && <span className="rounded-full bg-saffron px-1.5 text-[11px] font-bold text-[rgb(var(--on-accent))]">{t.badge} new</span>}
            </Link>
          ))}
        </nav>
      </div>

      {tab === "profiles" ? (
        <SharedProfiles jobId={job.id} profiles={shared} />
      ) : tab === "interviews" ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Section title="Upcoming" icon={CalendarClock} count={upcoming.length}>
            {upcoming.length ? (
              <ul className="space-y-3">
                {upcoming.map((i) => {
                  const Icon = MODE_ICON[i.mode] ?? CalendarClock;
                  return (
                    <li key={i.id} className="flex gap-3 rounded-2xl border border-line p-3.5">
                      <DateBlock date={i.scheduled_at} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/client/jobs/${job.id}/profiles/${i.application_id}`} className="block truncate text-[14.5px] font-semibold text-ink-900 hover:text-jade-700">
                          {i.name}
                        </Link>
                        <p className="text-[12.5px] text-ink-500">{i.round}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-600">
                          <Icon className="h-3.5 w-3.5 text-violet-500" aria-hidden /> {istTime(i.scheduled_at)} · {i.duration_min} min · {i.mode}
                          {i.location ? ` · ${i.location}` : ""}
                        </p>
                      </div>
                      {i.meeting_link && (
                        <a href={i.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 shrink-0 items-center gap-1 self-center rounded-lg bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700">
                          Join <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={CalendarClock} title="No upcoming interviews" text="Approve a profile and Synerax will schedule the interview with you." compact />
            )}
          </Section>
          <Section title="Completed" icon={CheckCircle2} count={past.length}>
            {past.length ? (
              <ul className="space-y-3">
                {past.map((i) => (
                  <li key={i.id} className="flex items-start gap-3 rounded-2xl border border-line p-3.5">
                    <Avatar name={i.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink-900">
                        {i.name} <span className="font-normal text-ink-500">· {i.round}</span>
                      </p>
                      <p className="text-[12px] text-ink-400">{istDate(i.scheduled_at, { weekday: "short", day: "numeric", month: "short" })}</p>
                      {i.client_feedback ? (
                        <p className="mt-1 text-[13px] text-ink-600">“{i.client_feedback}”{i.client_rating ? ` · ${i.client_rating}/5` : ""}</p>
                      ) : (
                        <Link href={`/client/jobs/${job.id}/profiles/${i.application_id}`} className="mt-1 inline-block text-[13px] font-semibold text-jade-700 hover:underline">
                          Add feedback
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={CheckCircle2} title="Nothing here yet" text="Completed interviews and your feedback show up here." compact />
            )}
          </Section>
        </div>
      ) : tab === "activity" ? (
        <Section title="Activity" icon={Activity} count={events.length}>
          <ol className="relative space-y-5 border-l border-line pl-6">
            {events.map((e, idx) => (
              <li key={idx} className="relative">
                <span className={cn("absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-surface", e.tone)}>
                  <e.icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <p className="text-[13.5px] text-ink-700 [&_b]:font-semibold [&_b]:text-ink-900">{e.text}</p>
                <TimeAgo date={e.at} className="text-[11.5px] text-ink-400" />
              </li>
            ))}
          </ol>
        </Section>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="min-w-0 space-y-5 xl:col-span-8">
            <section className="portal-card p-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
                {facts.map((f) => (
                  <Fact key={f.label} icon={f.icon} label={f.label} value={f.value} />
                ))}
              </dl>
            </section>
            <Section title="Job description" icon={FileText}>
              {job.description ? (
                <div className="space-y-3 text-[15px] leading-relaxed text-ink-700">
                  {job.description.split(/\n{2,}/).map((para, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      {para}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-ink-500">No description added.</p>
              )}
              {job.jd_file_name && (
                <a href={`/api/client/jobs/${job.id}/jd`} target="_blank" rel="noopener" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-[13.5px] font-medium text-ink-700 hover:bg-surface-2">
                  <FileText className="h-4 w-4 text-jade" aria-hidden /> {job.jd_file_name}
                </a>
              )}
              {job.interview_process && (
                <div className="mt-6 rounded-2xl bg-surface-2 p-4">
                  <p className="text-[13px] font-semibold text-ink-900">Interview process</p>
                  <ol className="mt-2 flex flex-wrap items-center gap-2">
                    {job.interview_process.split(/→|->|\n/).map((step, i, arr) => (
                      <li key={i} className="flex items-center gap-2 text-[13.5px] text-ink-700">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-jade text-[11px] font-semibold text-white">{i + 1}</span>
                        {step.trim()}
                        {i < arr.length - 1 && <span className="text-ink-300">→</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </Section>
          </div>
          <div className="min-w-0 space-y-5 xl:col-span-4">
            <Section title="Skills" icon={Sparkles} count={job.skills.length}>
              {job.skills.length ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((sk) => (
                      <SkillChip key={sk.name} name={sk.name} years={sk.min_years} tone={sk.mandatory ? "jade" : "ink"} />
                    ))}
                  </div>
                  {job.skills.some((x) => x.mandatory) && <p className="mt-3 text-[11.5px] text-ink-400">Highlighted = must-have</p>}
                </>
              ) : (
                <p className="text-sm text-ink-500">None listed</p>
              )}
            </Section>
            <Section title="Pipeline" icon={Users} href={`/client/jobs/${job.id}?tab=profiles`} linkLabel="Profiles">
              <dl className="grid grid-cols-2 gap-3">
                {[
                  { label: "Shared", v: shared.length },
                  { label: "To review", v: pending, warn: pending > 0 },
                  { label: "Interviews", v: interviews.length },
                  { label: "Hired", v: joined },
                ].map((s) => (
                  <div key={s.label} className={cn("rounded-2xl border border-line p-3", s.warn && "border-saffron/50 bg-saffron-50/50")}>
                    <dd className="text-[24px] font-semibold leading-none tabular text-ink-900">{s.v}</dd>
                    <dt className="mt-1 text-[12px] text-ink-500">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
