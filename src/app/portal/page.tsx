import Link from "next/link";
import { ArrowRight, Bell, CalendarClock, CheckCircle2, ChevronRight, Circle, Send, Trophy, Video } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadMyProfile } from "@/lib/portal-data";
import { SECTION_ANCHOR, type CandidateJob, type MyApplication } from "@/lib/portal-types";
import { JobCard, StageTracker } from "@/components/portal/ui";
import { OpenToWorkToggle } from "@/components/portal/profile-toggles";
import { ProfileMissing } from "@/components/portal/profile-missing";
import { cn, dayLabel, formatTime, timeAgo } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6", className)}>{children}</section>;
}

function CardTitle({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-[16px] font-semibold text-ink-900">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-medium text-jade-700 hover:underline">
          {linkLabel ?? "View all"} <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default async function PortalDashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const profile = await requireRole("candidate");
  const sp = await searchParams;
  const me = await loadMyProfile(profile.id);
  if (!me) return <ProfileMissing />;

  const supabase = await createClient();
  const [apps, jobs, notes] = await Promise.all([
    supabase.rpc("candidate_my_applications"),
    supabase.rpc("candidate_jobs", { f: { limit: 6 } }),
    supabase.from("notifications").select("id, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const applications = (apps.data ?? []) as MyApplication[];
  const recommended = ((jobs.data ?? []) as CandidateJob[]).filter((j) => !j.applied).slice(0, 6);
  const active = applications.filter((a) => a.step >= 0 && !a.withdrawn);
  const stats = [
    { label: "Applied", value: applications.filter((a) => !a.withdrawn).length, icon: Send },
    { label: "In interview", value: applications.filter((a) => a.step === 3).length, icon: CalendarClock },
    { label: "Offers", value: applications.filter((a) => a.step >= 4).length, icon: Trophy },
  ];
  const upcoming = applications
    .flatMap((a) => a.interviews.map((i) => ({ ...i, job: a.job_title, company: a.company })))
    .filter((i) => new Date(i.scheduled_at).getTime() > Date.now() - 3600_000)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, 4);
  const c = me.completion;
  const firstName = me.candidate.first_name;

  return (
    <div className="space-y-6">
      {sp.welcome && (
        <div className="rounded-2xl border border-jade/30 bg-jade-50 px-5 py-4 text-[15px] text-jade-700" role="status">
          Your email is verified and your profile is ready — welcome to Synerax Talent!
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-400">Welcome back</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900">Hi {firstName}</h1>
        </div>
        <OpenToWorkToggle initial={me.candidate.open_to_work} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative h-32 w-32 shrink-0 self-center">
              <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90" aria-hidden>
                <circle cx="50" cy="50" r="43" fill="none" strokeWidth="9" className="stroke-surface-3" />
                <circle
                  cx="50"
                  cy="50"
                  r="43"
                  fill="none"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={270.2}
                  strokeDashoffset={270.2 * (1 - c.percent / 100)}
                  className={cn("transition-[stroke-dashoffset] duration-700", c.percent >= 80 ? "stroke-jade" : "stroke-saffron")}
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[28px] font-semibold tabular text-ink-900">{c.percent}%</span>
                <span className="text-[11px] text-ink-400">profile complete</span>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-semibold text-ink-900">{c.missing.length ? "Complete next" : "Your profile is complete"}</h2>
              <p className="mt-0.5 text-[13px] text-ink-500">
                {c.missing.length ? "Complete profiles get matched to more jobs and hear back faster." : "Great — recruiters see your full profile."}
              </p>
              <ul className="mt-3 space-y-1.5">
                {c.missing.slice(0, 5).map((m) => (
                  <li key={m.key}>
                    <Link href={SECTION_ANCHOR[m.section] ?? "/portal/profile"} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] text-ink-700 hover:bg-surface-3">
                      <Circle className="h-4 w-4 shrink-0 text-ink-300" aria-hidden />
                      <span className="flex-1">{m.label}</span>
                      <span className="text-[11px] font-semibold text-saffron-600">+{m.weight}%</span>
                      <ArrowRight className="h-3.5 w-3.5 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-jade" aria-hidden />
                    </Link>
                  </li>
                ))}
                {c.missing.length === 0 && (
                  <li className="flex items-center gap-2 px-2 text-[14px] text-jade-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> All key sections are filled in
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {stats.map((s) => (
            <Card key={s.label} className="flex flex-col items-start gap-2 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-jade-50 text-jade-700">
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[26px] font-semibold leading-none tabular text-ink-900">{s.value}</p>
                <p className="mt-1 text-[12.5px] text-ink-500">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardTitle title="Recommended for you" href="/portal/jobs" linkLabel="Browse all jobs" />
        {recommended.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-500">
            No open roles match right now. Add more skills to your profile — we&apos;ll show new matches here.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle title="Active applications" href="/portal/applications" />
          {active.length ? (
            <ul className="space-y-4">
              {active.slice(0, 4).map((a) => (
                <li key={a.id} className="rounded-2xl border border-line p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/portal/jobs/${a.job_id}`} className="block truncate text-[15px] font-semibold text-ink-900 hover:text-jade-700">
                        {a.job_title}
                      </Link>
                      <p className="text-[12.5px] text-ink-500">{a.company}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-jade-50 px-2.5 py-1 text-[11.5px] font-semibold text-jade-700">{a.status_label}</span>
                  </div>
                  <StageTracker step={a.step} label={a.status_label} compact />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-500">
              You haven&apos;t applied anywhere yet.{" "}
              <Link href="/portal/jobs" className="font-semibold text-jade-700 hover:underline">
                Find a job
              </Link>
            </p>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle title="Upcoming interviews" />
            {upcoming.length ? (
              <ul className="space-y-3">
                {upcoming.map((i) => (
                  <li key={i.id} className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
                      <Video className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-ink-900">
                        {i.round} · {i.job}
                      </p>
                      <p className="text-[12.5px] text-ink-500">
                        {dayLabel(i.scheduled_at)}, {formatTime(i.scheduled_at)} · {i.mode}
                      </p>
                      {i.meeting_link && (
                        <a href={i.meeting_link} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-medium text-jade-700 hover:underline">
                          Join link
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">No interviews scheduled yet.</p>
            )}
          </Card>

          <Card>
            <CardTitle title="Notifications" href="/portal/notifications" />
            {(notes.data ?? []).length ? (
              <ul className="space-y-3">
                {(notes.data ?? []).map((n) => (
                  <li key={n.id} className="flex gap-2.5">
                    <Bell className={cn("mt-0.5 h-4 w-4 shrink-0", n.read_at ? "text-ink-300" : "text-saffron")} aria-hidden />
                    <div className="min-w-0">
                      {n.link ? (
                        <Link href={n.link} className="text-[13.5px] font-medium text-ink-800 hover:text-jade-700">
                          {n.title}
                        </Link>
                      ) : (
                        <p className="text-[13.5px] font-medium text-ink-800">{n.title}</p>
                      )}
                      <p className="text-[11.5px] text-ink-400">{timeAgo(n.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">Updates about your applications will appear here.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
