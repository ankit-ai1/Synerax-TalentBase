import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  Filter,
  Headphones,
  Inbox,
  ListChecks,
  MapPin,
  Plus,
  Send,
  Sparkles,
  Trophy,
  UserCheck,
  XCircle,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClientDashboard, ClientJob, ClientMe } from "@/lib/client-types";
import {
  Avatar,
  Bar,
  Chip,
  DateBlock,
  EmptyState,
  Hero,
  JOB_STATUS_TONE,
  MODE_ICON,
  MatchRing,
  PrimaryLink,
  Section,
  SkillChip,
  TimeAgo,
  greeting,
  istDate,
  istDayKey,
  istTime,
} from "@/components/portal-ui/kit";
import { KpiCard } from "@/components/portal-ui/kpi-card";
import { ContactRow } from "@/components/portal-ui/team-card";
import { DecisionActions } from "@/components/client/decision-actions";
import { HiringFunnel, Insights } from "@/components/client/dashboard-widgets";
import { cn, lpa, noticeLabel, years } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const SLA_HOURS = 48;

const ACTIVITY: Record<string, { icon: typeof Send; text: (a: ClientDashboard["activity"][number]) => React.ReactNode; tone: string }> = {
  shared: { icon: Send, text: (a) => <>Synerax shared <b>{a.name}</b> for {a.job_title}</>, tone: "bg-sky-500/10 text-sky-600 dark:text-sky-300" },
  approved: { icon: UserCheck, text: (a) => <>You approved <b>{a.name}</b> for {a.job_title}</>, tone: "bg-jade-50 text-jade-700" },
  rejected: { icon: XCircle, text: (a) => <>You passed on <b>{a.name}</b> for {a.job_title}</>, tone: "bg-surface-3 text-ink-500" },
  interview: { icon: CalendarClock, text: (a) => <>Interview arranged with <b>{a.name}</b> · {a.job_title}</>, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  offered: { icon: Sparkles, text: (a) => <><b>{a.name}</b> moved to offer · {a.job_title}</>, tone: "bg-saffron-50 text-saffron-800" },
  joined: { icon: Trophy, text: (a) => <><b>{a.name}</b> joined as {a.job_title}</>, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
  published: { icon: FileCheck2, text: (a) => <><b>{a.job_title}</b> is live — Synerax is sourcing</>, tone: "bg-jade-50 text-jade-700" },
  posted: { icon: Clock, text: (a) => <><b>{a.job_title}</b> was received and is being reviewed</>, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
};

function slaLabel(sharedAt: string) {
  const left = Math.round((new Date(sharedAt).getTime() + SLA_HOURS * 3600e3 - Date.now()) / 3600e3);
  if (left <= 0) return { text: `Overdue by ${Math.abs(left) || 1}h`, tone: "red" as const };
  return { text: `${left}h left to decide`, tone: left <= 12 ? ("saffron" as const) : ("ink" as const) };
}

export default async function ClientDashboardPage() {
  const profile = await requireRole("client");
  const supabase = await createClient();
  const [{ data: meData, error: meErr }, { data: dashData }, { data: jobsData }] = await Promise.all([
    supabase.rpc("client_me"),
    supabase.rpc("client_dashboard"),
    supabase.rpc("client_jobs"),
  ]);
  const me = meData as ClientMe | null;

  if (meErr || !me) {
    return (
      <div className="mx-auto mt-10 max-w-lg">
        <EmptyState icon={AlertTriangle} title="Your access isn't active yet" text="Your login isn't linked to a company. Please contact your Synerax account manager." />
      </div>
    );
  }
  const d = (dashData ?? { open_jobs: 0, pending_review: 0, awaiting_decision: 0, hires: 0, pending: [], interviews: [], activity: [] }) as ClientDashboard;
  const jobs = ((jobsData ?? []) as ClientJob[]).filter((j) => ["Open", "On Hold", "Pending review"].includes(j.status));
  const first = (profile.full_name || me.user.name || "").split(" ")[0];
  const series = d.series ?? [];
  const spark = (k: "shared" | "approved" | "interviews" | "hires") => series.map((w) => w[k]);

  const oldest = d.pending[0];
  const summary = d.awaiting_decision
    ? `You have ${d.awaiting_decision} profile${d.awaiting_decision === 1 ? "" : "s"} waiting — Synerax shared the oldest ${oldest ? relShort(oldest.shared_at) : "recently"}.`
    : d.interviews.length
      ? `${d.interviews.length} interview${d.interviews.length === 1 ? "" : "s"} coming up — next is ${d.interviews[0].name} on ${istDate(d.interviews[0].scheduled_at, { weekday: "short", day: "numeric", month: "short" })}.`
      : d.open_jobs
        ? `Synerax is sourcing for ${d.open_jobs} open job${d.open_jobs === 1 ? "" : "s"}. We'll notify you as soon as new profiles are ready.`
        : "Post your first job and Synerax will start sourcing within one working day.";

  // week strip (IST, Monday first)
  const todayKey = istDayKey(new Date());
  const now = new Date(Date.now() + 5.5 * 3600e3);
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setUTCDate(monday.getUTCDate() + i);
    const key = x.toISOString().slice(0, 10);
    return { key, wd: x.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }).slice(0, 2), day: x.getUTCDate(), count: d.interviews.filter((iv) => istDayKey(iv.scheduled_at) === key).length };
  });

  // activity grouped by day
  const groups: { label: string; items: ClientDashboard["activity"] }[] = [];
  for (const a of d.activity.filter((x) => x.at)) {
    const k = istDayKey(a.at);
    const label = k === todayKey ? "Today" : k === istDayKey(new Date(Date.now() - 864e5)) ? "Yesterday" : istDate(a.at, { weekday: "short", day: "numeric", month: "short" });
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(a);
    else groups.push({ label, items: [a] });
  }

  return (
    <div className="portal-in grid grid-cols-1 gap-5 lg:gap-6">
      {/* hero */}
      <Hero>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-800 to-ink-900 text-[18px] font-bold text-white shadow-card ring-1 ring-white/10 dark:from-jade-700 dark:to-jade sm:h-16 sm:w-16 sm:text-[20px]">
              {me.client.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-500">
                <span className="font-semibold text-ink-700">{me.client.name}</span>
                {me.client.industry && <span>· {me.client.industry}</span>}
                {me.client.city && <span>· {me.client.city}</span>}
              </p>
              <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[32px]">
                {greeting()}, {first}
              </h1>
              <p className="mt-0.5 text-[13px] text-ink-400">{istDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-600">{summary}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {d.awaiting_decision > 0 && oldest && (
              <PrimaryLink href={`/client/jobs/${oldest.job_id}?tab=profiles`} variant="secondary">
                <Inbox className="h-4 w-4" aria-hidden /> Review profiles ({d.awaiting_decision})
              </PrimaryLink>
            )}
            <PrimaryLink href="/client/jobs/new">
              <Plus className="h-4 w-4" aria-hidden /> Post a job
            </PrimaryLink>
          </div>
        </div>
      </Hero>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Open jobs"
          value={d.open_jobs}
          icon={<Briefcase />}
          href="/client/jobs?tab=open"
          sub={d.pending_review ? `${d.pending_review} awaiting Synerax review` : `${d.total_openings ?? 0} position${d.total_openings === 1 ? "" : "s"} to fill`}
          progress={{ value: d.hires_ytd ?? d.hires, max: Math.max(1, (d.total_openings ?? 0) + (d.hires_ytd ?? d.hires)), label: `${d.hires_ytd ?? d.hires} filled this year` }}
        />
        <KpiCard
          label="Awaiting your decision"
          value={d.awaiting_decision}
          icon={<Inbox />}
          urgent={d.awaiting_decision > 0}
          href={oldest ? `/client/jobs/${oldest.job_id}?tab=profiles` : "/client/jobs"}
          sub={d.awaiting_decision && oldest ? `Oldest shared ${relShort(oldest.shared_at)}` : d.shared_week ? `+${d.shared_week} shared this week` : d.avg_decision_hours != null ? `You decide in ~${d.avg_decision_hours}h on average` : "Nothing pending"}
          subTone={d.awaiting_decision ? "warn" : d.shared_week ? "up" : "ink"}
          spark={spark("shared")}
        />
        <KpiCard
          label="Interviews this week"
          value={d.interviews_week ?? d.interviews.length}
          icon={<CalendarClock />}
          tone="violet"
          href="#interviews"
          sub={d.interviews[0] ? `Next: ${istDate(d.interviews[0].scheduled_at, { weekday: "short" })}, ${istTime(d.interviews[0].scheduled_at)}` : "None scheduled"}
          spark={spark("interviews")}
        />
        <KpiCard
          label="Hires this year"
          value={d.hires_ytd ?? d.hires}
          icon={<Trophy />}
          tone="saffron"
          sub={d.offers_out ? `${d.offers_out} offer${d.offers_out === 1 ? "" : "s"} in progress` : d.avg_fill_days != null ? `~${d.avg_fill_days} days to fill` : "Your first hire is on its way"}
          subTone={d.offers_out ? "up" : "ink"}
          spark={spark("hires")}
        />
      </div>

      {/* action needed + interviews */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-12">
        <Section
          className={cn("xl:col-span-8", d.awaiting_decision > 0 && "urgent-glow")}
          title="Action needed"
          icon={ListChecks}
          count={d.awaiting_decision}
          description={d.awaiting_decision ? `Please decide within ${SLA_HOURS} hours so good candidates stay engaged` : undefined}
          href={oldest ? `/client/jobs/${oldest.job_id}?tab=profiles` : undefined}
          linkLabel="Review all"
        >
          {d.pending.length ? (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {d.pending.map((p) => {
                const sla = slaLabel(p.shared_at);
                return (
                  <li key={p.application_id} className="flex flex-col rounded-2xl border border-line bg-surface p-4 transition hover:border-jade/30">
                    <div className="flex items-start gap-3">
                      <Avatar name={p.name} size={46} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/client/jobs/${p.job_id}/profiles/${p.application_id}`} className="block truncate text-[15px] font-semibold text-ink-900 hover:text-jade-700">
                          {p.name}
                        </Link>
                        <p className="truncate text-[12.5px] text-ink-500">
                          {[p.current_designation, p.total_experience != null ? years(p.total_experience) : null].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-ink-400">
                          For <span className="font-medium text-ink-600">{p.job_title}</span>
                        </p>
                      </div>
                      <MatchRing value={p.match} size={48} label={null} />
                    </div>
                    {!!p.skills?.length && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.skills.slice(0, 4).map((s) => (
                          <SkillChip key={s} name={s} />
                        ))}
                      </div>
                    )}
                    <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-surface-2 px-3 py-2 text-[12px]">
                      <div className="min-w-0">
                        <dt className="text-ink-400">Notice</dt>
                        <dd className="truncate font-semibold text-ink-800">{p.serving_notice ? "Serving" : noticeLabel(p.notice_period_days)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-ink-400">Expected</dt>
                        <dd className="truncate font-semibold text-ink-800">{lpa(p.expected_ctc)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-ink-400">Location</dt>
                        <dd className="truncate font-semibold text-ink-800">{p.current_city ?? "—"}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                      <Chip tone={sla.tone} pulse={sla.tone === "red"}>
                        {sla.text}
                      </Chip>
                      <TimeAgo date={p.shared_at} prefix="Shared " className="text-ink-400" />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                      <Link href={`/client/jobs/${p.job_id}/profiles/${p.application_id}`} className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-3">
                        View brief
                      </Link>
                      <DecisionActions applicationId={p.application_id} name={p.name} size="sm" className="ml-auto" />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={CheckCircle2} title="You're all caught up" text="No profiles are waiting for you. We'll notify you the moment Synerax shares new candidates." compact />
          )}
        </Section>

        <Section id="interviews" className="xl:col-span-4" title="Upcoming interviews" icon={CalendarClock} count={d.interviews.length}>
          <div className="mb-4 grid grid-cols-7 gap-1 rounded-2xl bg-surface-2 p-1.5" aria-label="This week">
            {week.map((w) => (
              <div key={w.key} className={cn("flex flex-col items-center rounded-xl py-1.5", w.key === todayKey ? "bg-surface shadow-card ring-1 ring-line" : "")}>
                <span className="text-[10px] font-medium uppercase text-ink-400">{w.wd}</span>
                <span className={cn("text-[14px] font-semibold tabular", w.key === todayKey ? "text-jade-700" : "text-ink-800")}>{w.day}</span>
                <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", w.count ? "bg-violet-500" : "bg-transparent")} aria-label={w.count ? `${w.count} interview(s)` : undefined} />
              </div>
            ))}
          </div>
          {d.interviews.length ? (
            <ul className="space-y-3">
              {d.interviews.slice(0, 5).map((i) => {
                const Icon = MODE_ICON[i.mode] ?? CalendarClock;
                return (
                  <li key={i.id} className="flex gap-3 rounded-2xl border border-line p-3">
                    <DateBlock date={i.scheduled_at} />
                    <div className="min-w-0 flex-1">
                      <Link href={i.application_id ? `/client/jobs/${i.job_id}/profiles/${i.application_id}` : `/client/jobs/${i.job_id}?tab=profiles`} className="block truncate text-[14px] font-semibold text-ink-900 hover:text-jade-700">
                        {i.name}
                      </Link>
                      <p className="truncate text-[12px] text-ink-500">
                        {i.round} · {i.job_title}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-600">
                        <Icon className="h-3.5 w-3.5 text-violet-500" aria-hidden />
                        {istTime(i.scheduled_at)} · {i.duration_min ?? 60} min · {i.mode}
                      </p>
                      {i.meeting_link ? (
                        <a href={i.meeting_link} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-violet-700">
                          Join <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      ) : i.location ? (
                        <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-ink-500">
                          <MapPin className="h-3 w-3" aria-hidden /> {i.location}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={CalendarClock} title="No interviews scheduled" text="Approve a profile and Synerax will arrange the interview for you." compact />
          )}
        </Section>
      </div>

      {/* funnel + insights */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-12">
        <Section className="xl:col-span-7" title="Hiring funnel" icon={Filter} description="How shared profiles move towards a hire">
          <HiringFunnel funnel={d.funnel ?? []} />
        </Section>
        <Section className="xl:col-span-5" title="Insights" icon={BarChart3} description="Speed and quality of your hiring with Synerax">
          <Insights d={d} />
        </Section>
      </div>

      {/* jobs overview + team */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-12">
        <Section className="xl:col-span-8" title="Jobs overview" icon={Briefcase} count={jobs.length} href="/client/jobs" bodyClassName="p-0 sm:p-0">
          {jobs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11.5px] uppercase tracking-wider text-ink-400">
                    <th className="px-5 py-3 font-medium sm:px-6">Job</th>
                    <th className="px-3 py-3 font-medium">Filled</th>
                    <th className="px-3 py-3 text-center font-medium">Shared</th>
                    <th className="px-3 py-3 text-center font-medium">To review</th>
                    <th className="px-3 py-3 text-center font-medium">Interviews</th>
                    <th className="px-3 py-3 font-medium">Open for</th>
                    <th className="px-5 py-3 font-medium sm:px-6">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {jobs.map((j) => {
                    const overdue = j.target_date && j.target_date < todayKey && j.status === "Open";
                    return (
                      <tr key={j.id} className="group hover:bg-surface-2">
                        <td className="px-5 py-3 sm:px-6">
                          <Link href={`/client/jobs/${j.id}`} className="block max-w-[260px] truncate font-semibold text-ink-900 group-hover:text-jade-700">
                            {j.title}
                          </Link>
                          <div className="mt-1 flex items-center gap-2">
                            <Chip tone={JOB_STATUS_TONE[j.status] ?? "ink"}>{j.status}</Chip>
                            <span className="truncate text-[11.5px] text-ink-400">{[j.locations.slice(0, 2).join(", "), j.work_mode].filter(Boolean).join(" · ")}</span>
                          </div>
                        </td>
                        <td className="w-36 px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Bar value={j.joined} max={j.openings} tone={j.joined >= j.openings ? "jade" : "violet"} className="w-16" />
                            <span className="tabular text-ink-700">
                              {j.joined}/{j.openings}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-semibold tabular text-ink-800">{j.shared}</td>
                        <td className="px-3 py-3 text-center">
                          {j.pending_decision ? <span className="rounded-full bg-saffron-50 px-2 py-0.5 font-semibold tabular text-saffron-800">{j.pending_decision}</span> : <span className="text-ink-400">0</span>}
                        </td>
                        <td className="px-3 py-3 text-center tabular text-ink-700">{j.interviews ?? 0}</td>
                        <td className="px-3 py-3 tabular text-ink-600">{j.days_open != null ? `${j.days_open} days` : "—"}</td>
                        <td className="px-5 py-3 sm:px-6">
                          {j.target_date ? (
                            <span className={cn("inline-flex items-center gap-1 tabular", overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-ink-600")}>
                              {overdue && <AlertTriangle className="h-3.5 w-3.5" aria-label="Overdue" />}
                              {istDate(j.target_date, { day: "numeric", month: "short" })}
                            </span>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5 sm:p-6">
              <EmptyState icon={Briefcase} title="No active jobs" text="Post a requirement — Synerax reviews it and starts sourcing within one working day." action={{ href: "/client/jobs/new", label: "Post your first job" }} compact />
            </div>
          )}
        </Section>

        <Section className="xl:col-span-4" title="Your Synerax team" icon={Headphones} description="Reach us any time — we usually reply within an hour">
          {d.team?.length ? (
            <ul className="space-y-4">
              {d.team.map((t) => (
                <li key={t.id}>
                  <ContactRow person={t} message={`Hi ${t.name.split(" ")[0]}, this is ${first} from ${me.client.name}.`} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Headphones} title="Your team is being assigned" text="Your account manager's details will appear here." compact />
          )}
        </Section>
      </div>

      {/* activity */}
      <Section title="Activity" icon={Activity} description="Everything that happened on your jobs">
        {groups.length ? (
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{g.label}</p>
                <ol className="relative space-y-4 border-l border-line pl-6">
                  {g.items.map((a, idx) => {
                    const meta = ACTIVITY[a.kind] ?? ACTIVITY.posted;
                    return (
                      <li key={idx} className="relative">
                        <span className={cn("absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-surface", meta.tone)}>
                          <meta.icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <Link href={`/client/jobs/${a.job_id}`} className="block text-[13.5px] leading-snug text-ink-700 hover:text-ink-900 [&_b]:font-semibold [&_b]:text-ink-900">
                          {meta.text(a)}
                        </Link>
                        <TimeAgo date={a.at} className="text-[11.5px] text-ink-400" />
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Activity} title="No activity yet" text="Post your first job to get started." action={{ href: "/client/jobs/new", label: "Post a job" }} compact />
        )}
      </Section>
    </div>
  );
}

function relShort(d: string) {
  const h = Math.round((Date.now() - new Date(d).getTime()) / 3600e3);
  return h < 1 ? "just now" : h < 24 ? `${h} hour${h === 1 ? "" : "s"} ago` : `${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? "" : "s"} ago`;
}
