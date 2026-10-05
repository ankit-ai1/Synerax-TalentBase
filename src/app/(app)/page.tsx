import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  CheckSquare,
  Clock,
  MapPin,
  Phone,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { describeActivity } from "@/lib/activity";
import { LinkButton } from "@/components/ui/button";
import { Avatar, Card, CardHeader, EmptyState, Priority } from "@/components/ui/misc";
import { PipelineBar } from "@/components/jobs/job-row";
import { DashboardQuick } from "@/components/dashboard/dashboard-quick";
import { ACTIVE_STAGES, STAGE_STYLE, STATUSES, STATUS_STYLE } from "@/lib/constants";
import { cn, daysUntil, formatDate, formatTime, timeAgo, todayIST } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Dashboard() {
  const profile = await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.rpc("dashboard_stats");
  const s = (data ?? {}) as any;
  const total = s.total ?? 0;
  const firstName = (profile.full_name || "").split(" ")[0];
  const hour = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  const greet = hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date(todayIST() + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  if (total === 0 && (s.open_jobs ?? 0) === 0) {
    return (
      <>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900">
          {greet}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{today}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { href: "/candidates/new", icon: <UserPlus className="h-5 w-5" />, t: "Add your first candidate", d: "Full profile — skills, CTC, notice, documents." },
            { href: "/import", icon: <Users className="h-5 w-5" />, t: "Import from Excel", d: "Upload an existing sheet; columns are mapped automatically." },
            { href: "/clients/new", icon: <Briefcase className="h-5 w-5" />, t: "Create a client and job", d: "Add a requirement and see matching candidates instantly." },
          ].map((x) => (
            <Link key={x.href} href={x.href} className="group rounded-2xl border border-line bg-surface p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop">
              <span className="inline-flex rounded-xl bg-jade-50 p-2.5 text-jade-700">{x.icon}</span>
              <p className="mt-4 font-semibold text-ink-900">{x.t}</p>
              <p className="mt-1 text-sm text-ink-500">{x.d}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-jade-700">
                Get started <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </p>
            </Link>
          ))}
        </div>
      </>
    );
  }

  const trend = (s.added_trend ?? []).map((x: any) => Number(x.n));
  const delta = s.last_month ? Math.round(((s.this_month - s.last_month) / s.last_month) * 100) : null;
  const statusTotal = Object.values(s.by_status ?? {}).reduce((a: number, b: any) => a + Number(b), 0) as number;
  const funnelMax = Math.max(1, ...ACTIVE_STAGES.map((st) => s.funnel?.[st] ?? 0));
  const interviews = (s.interviews_today ?? []) as any[];
  const tasks = (s.my_tasks ?? []) as any[];

  return (
    <>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-400">{today}</p>
          <h1 className="mt-0.5 text-[28px] font-semibold tracking-[-0.02em] text-ink-900">
            {greet}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            You have <b className="font-semibold text-ink-800">{interviews.length}</b> interview{interviews.length === 1 ? "" : "s"} and{" "}
            <b className="font-semibold text-ink-800">{tasks.length}</b> follow-up{tasks.length === 1 ? "" : "s"} today.
          </p>
        </div>
        <DashboardQuick meId={profile.id} />
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="col-span-2 rounded-2xl border border-line bg-surface p-5 shadow-card lg:col-span-1">
          <p className="text-[12.5px] text-ink-500">Total candidates</p>
          <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight text-ink-900">{total.toLocaleString("en-IN")}</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="whitespace-nowrap text-xs text-ink-500">
              +{s.this_month} this month
              {delta !== null && (
                <span className={cn("ml-1 font-medium", delta >= 0 ? "text-jade-700" : "text-red-600 dark:text-red-400")}>
                  ({delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%)
                </span>
              )}
            </p>
            <Sparkline values={trend} />
          </div>
        </div>
        <Kpi href="/jobs" label="Open positions" value={s.open_positions ?? 0} hint={`${s.open_jobs ?? 0} open jobs`} icon={<Briefcase className="h-4 w-4" />} />
        <Kpi href="/candidates?statuses=Interviewing,Offered" label="Active pipeline" value={s.in_pipeline ?? 0} hint="candidates in jobs" icon={<Users className="h-4 w-4" />} />
        <Kpi href="/interviews" label="Interviews (7 days)" value={s.upcoming_interviews ?? 0} hint={`${interviews.length} today`} icon={<CalendarClock className="h-4 w-4" />} />
        <Kpi href="/reports?range=month" label="Placed this month" value={s.placed_month ?? 0} hint={`${s.immediate ?? 0} immediate joiners ready`} icon={<ArrowUpRight className="h-4 w-4" />} accent />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        {/* today's interviews */}
        <Card>
          <CardHeader
            icon={<CalendarClock className="h-4 w-4" />}
            title="Today's interviews"
            action={<Link href="/interviews" className="text-[13px] font-medium text-jade-700 hover:underline">Calendar</Link>}
          />
          {interviews.length === 0 ? (
            <EmptyState compact title="No interviews today" description="Upcoming interviews are on the Interviews page." />
          ) : (
            <ul className="divide-y divide-line">
              {interviews.map((i) => {
                const past = new Date(i.scheduled_at).getTime() < Date.now();
                return (
                  <li key={i.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={cn("w-16 text-right", past && "opacity-50")}>
                      <p className="text-sm font-semibold tabular text-ink-900">{formatTime(i.scheduled_at)}</p>
                      <p className="flex items-center justify-end gap-1 text-[11px] text-ink-400">
                        {i.mode === "Video" ? <Video className="h-3 w-3" /> : i.mode === "Phone" ? <Phone className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {i.mode}
                      </p>
                    </div>
                    <span className={cn("h-9 w-1 rounded-full", past ? "bg-surface-3" : "bg-violet-500")} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/candidates/${i.candidate_id}`} className="block truncate text-sm font-medium text-ink-900 hover:text-jade-700">
                        {i.first_name} {i.last_name} <span className="font-normal text-ink-400">· {i.round_name}</span>
                      </Link>
                      <p className="truncate text-xs text-ink-500">
                        {i.job_title}
                        {i.client_name && ` — ${i.client_name}`}
                      </p>
                    </div>
                    {i.meeting_link && !past && (
                      <a href={i.meeting_link} target="_blank" rel="noopener" className="rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 dark:bg-violet-400/10 dark:text-violet-300">
                        Join
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* my tasks */}
        <Card>
          <CardHeader
            icon={<CheckSquare className="h-4 w-4" />}
            title="My follow-ups"
            description="Overdue, today and tomorrow"
            action={<Link href="/tasks" className="text-[13px] font-medium text-jade-700 hover:underline">All tasks</Link>}
          />
          {tasks.length === 0 ? (
            <EmptyState compact title="All clear 🎉" description="No pending follow-ups." />
          ) : (
            <ul className="divide-y divide-line">
              {tasks.map((t) => {
                const overdue = t.due_at && new Date(t.due_at).getTime() < Date.now();
                return (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <Clock className={cn("h-4 w-4 shrink-0", overdue ? "text-red-500" : "text-ink-300")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-900">
                        {t.priority === "High" && <span className="mr-1 font-semibold text-red-500">!</span>}
                        {t.title}
                      </p>
                      <p className={cn("text-xs", overdue ? "text-red-600 dark:text-red-400" : "text-ink-400")}>
                        {t.due_at ? `${overdue ? "Overdue · " : ""}${formatDate(t.due_at, { day: "numeric", month: "short" })}, ${formatTime(t.due_at)}` : "No date"}
                        {t.first_name && (
                          <>
                            {" · "}
                            <Link href={`/candidates/${t.candidate_id}`} className="hover:underline">
                              {t.first_name} {t.last_name}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        {/* hot jobs */}
        <Card>
          <CardHeader icon={<Briefcase className="h-4 w-4" />} title="Priority jobs" action={<Link href="/jobs" className="text-[13px] font-medium text-jade-700 hover:underline">All jobs</Link>} />
          {(s.hot_jobs ?? []).length === 0 ? (
            <EmptyState
              compact
              title="No open jobs"
              action={
                <LinkButton href="/jobs/new" size="sm">
                  New job
                </LinkButton>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {(s.hot_jobs ?? []).map((j: any) => {
                const days = daysUntil(j.target_date);
                return (
                  <li key={j.id}>
                    <Link href={`/jobs/${j.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate text-sm font-medium text-ink-900">
                          <Priority value={j.priority} showLabel={false} />
                          {j.title}
                        </p>
                        <p className="truncate text-xs text-ink-400">
                          {j.client_name ?? "Internal"} · {j.job_code}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <div className="mb-1 flex justify-between text-[11px] text-ink-500">
                          <span>{j.active} active</span>
                          <span className="tabular">
                            {j.joined}/{j.openings}
                          </span>
                        </div>
                        <PipelineBar counts={{ Joined: j.joined, Interview: j.interviewing, Sourced: Math.max(0, j.active - j.joined - j.interviewing) }} />
                      </div>
                      <span className={cn("text-right text-xs", days !== null && days < 0 ? "text-red-600 dark:text-red-400" : days !== null && days <= 7 ? "text-saffron-600" : "text-ink-400")}>
                        {j.target_date ? (days! < 0 ? `${-days!}d late` : `${days}d left`) : "—"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* pipeline funnel */}
        <Card>
          <CardHeader title="Live pipeline" description="Candidates across all open jobs — by stage" />
          <div className="space-y-2.5 p-5">
            {ACTIVE_STAGES.map((st) => {
              const n = s.funnel?.[st] ?? 0;
              return (
                <div key={st} className="grid grid-cols-[84px_1fr_32px] items-center gap-3 text-[13px]">
                  <span className="text-ink-600">{st}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full" style={{ width: `${(n / funnelMax) * 100}%`, background: STAGE_STYLE[st].hex }} />
                  </div>
                  <span className="text-right font-semibold tabular text-ink-900">{n}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* status mix */}
        <Card>
          <CardHeader title="Candidate status" description={`${total} candidates`} />
          <div className="p-5">
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Status distribution">
              {STATUSES.filter((st) => s.by_status?.[st]).map((st) => (
                <div key={st} className={STATUS_STYLE[st].dot} style={{ width: `${(s.by_status[st] / statusTotal) * 100}%` }} title={`${st}: ${s.by_status[st]}`} />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
              {STATUSES.filter((st) => s.by_status?.[st]).map((st) => (
                <Link key={st} href={`/candidates?statuses=${encodeURIComponent(st)}`} className="group flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[13px] text-ink-600 group-hover:text-ink-900">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_STYLE[st].dot)} />
                    {st}
                  </span>
                  <span className="text-sm font-semibold tabular text-ink-900">{s.by_status[st]}</span>
                </Link>
              ))}
            </div>
            {(s.top_skills ?? []).length > 0 && (
              <>
                <p className="mb-2 mt-6 text-[12.5px] font-medium text-ink-500">Top skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {(s.top_skills ?? []).map((k: any) => (
                    <span key={k.name} className="rounded-md bg-surface-3 px-2 py-0.5 text-xs text-ink-700">
                      {k.name} <b className="font-semibold tabular text-ink-900">{k.count}</b>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* joining soon */}
        <Card>
          <CardHeader title="Free in the next 30 days" description="Candidates serving notice" />
          {(s.joining_soon ?? []).length === 0 ? (
            <EmptyState compact title="None" description="Candidates whose last working day is near will appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {(s.joining_soon ?? []).map((c: any) => {
                const d = daysUntil(c.last_working_day) ?? 0;
                return (
                  <li key={c.id}>
                    <Link href={`/candidates/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                      <Avatar name={`${c.first_name} ${c.last_name ?? ""}`} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {c.first_name} {c.last_name}
                        </p>
                        <p className="truncate text-xs text-ink-400">{c.current_designation ?? "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular text-saffron-600">{d === 0 ? "Today" : `${d} days`}</p>
                        <p className="text-[11px] text-ink-400">{formatDate(c.last_working_day, { day: "numeric", month: "short" })}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* activity */}
        <Card>
          <CardHeader title="Team activity" action={profile.role === "admin" ? <Link href="/admin/activity" className="text-[13px] font-medium text-jade-700 hover:underline">Full log</Link> : undefined} />
          <ol className="relative space-y-4 p-5">
            {(s.activity ?? []).length === 0 && <p className="text-sm text-ink-400">No activity yet.</p>}
            {(s.activity ?? []).map((a: any) => (
              <li key={a.id} className="flex gap-3">
                <Avatar name={a.actor ?? "System"} size="xs" className="mt-0.5" />
                <div className="min-w-0 text-[13px]">
                  <p className="text-ink-600">
                    <span className="font-medium text-ink-900">{(a.actor ?? "System").split(" ")[0]}</span>{" "}
                    {a.candidate_id ? (
                      <Link href={`/candidates/${a.candidate_id}`} className="hover:underline">
                        {describeActivity(a)}
                      </Link>
                    ) : a.details?.job_id ? (
                      <Link href={`/jobs/${a.details.job_id}`} className="hover:underline">
                        {describeActivity(a)}
                      </Link>
                    ) : (
                      describeActivity(a)
                    )}
                  </p>
                  <p className="text-[11px] text-ink-400">{timeAgo(a.created_at)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}

function Kpi({ href, label, value, hint, icon, accent }: { href: string; label: string; value: number; hint?: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <Link href={href} className="group rounded-2xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-ink-500">{label}</p>
        <span className="text-ink-300 transition-colors group-hover:text-jade">{icon}</span>
      </div>
      <p className={cn("mt-1 text-[32px] font-semibold leading-none tracking-tight tabular", accent ? "text-jade-700" : "text-ink-900")}>{value.toLocaleString("en-IN")}</p>
      {hint && <p className="mt-3 text-xs text-ink-400">{hint}</p>}
    </Link>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return null;
  const w = 96, h = 30;
  const max = Math.max(1, ...values);
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 2 - (v / max) * (h - 4)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label="Candidates added in the last 30 days" className="shrink-0">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="rgb(var(--jade) / 0.1)" />
      <path d={d} fill="none" stroke="rgb(var(--jade))" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="rgb(var(--jade))" stroke="rgb(var(--surface))" strokeWidth="1.5" />
    </svg>
  );
}
