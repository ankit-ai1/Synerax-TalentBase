import Link from "next/link";
import { Briefcase, CalendarClock, CheckCircle2, ChevronRight, Clock, Inbox, Plus, Send, Trophy, UserCheck, XCircle } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, dayLabel, formatTime, timeAgo, years } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

type Dash = {
  open_jobs: number;
  pending_review: number;
  awaiting_decision: number;
  hires: number;
  pending: { application_id: string; job_id: string; job_title: string; name: string; current_designation: string | null; total_experience: number | null; match: number | null; shared_at: string }[];
  interviews: { id: string; round: string; mode: string; scheduled_at: string; meeting_link: string | null; location: string | null; job_id: string; job_title: string; name: string }[];
  activity: { at: string; kind: string; job_id: string; job_title: string; name: string | null }[];
};
type Me = { client: { name: string; industry: string | null; city: string | null }; user: { name: string } };

const ACTIVITY: Record<string, { icon: typeof Send; text: (a: Dash["activity"][number]) => string; tone: string }> = {
  shared: { icon: Send, text: (a) => `Synerax shared ${a.name}'s profile for ${a.job_title}`, tone: "text-sky-600 bg-sky-500/10" },
  approved: { icon: UserCheck, text: (a) => `You approved ${a.name} for ${a.job_title}`, tone: "text-jade-700 bg-jade-50" },
  rejected: { icon: XCircle, text: (a) => `You passed on ${a.name} for ${a.job_title}`, tone: "text-ink-500 bg-surface-3" },
  joined: { icon: Trophy, text: (a) => `${a.name} joined as ${a.job_title}`, tone: "text-emerald-600 bg-emerald-500/10" },
  published: { icon: CheckCircle2, text: (a) => `${a.job_title} is live — Synerax is sourcing`, tone: "text-jade-700 bg-jade-50" },
  posted: { icon: Clock, text: (a) => `${a.job_title} was received and is being reviewed`, tone: "text-violet-600 bg-violet-500/10" },
};

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6", className)}>{children}</section>;
}

export default async function ClientDashboard() {
  const profile = await requireRole("client");
  const supabase = await createClient();
  const [{ data: meData, error: meErr }, { data: dashData }] = await Promise.all([supabase.rpc("client_me"), supabase.rpc("client_dashboard")]);
  const me = meData as Me | null;

  if (meErr || !me) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-ink-900">Your access isn&apos;t active yet</h1>
        <p className="mt-2 text-[15px] text-ink-500">Your login isn&apos;t linked to a company. Please contact your Synerax account manager.</p>
      </div>
    );
  }
  const d = (dashData ?? { open_jobs: 0, pending_review: 0, awaiting_decision: 0, hires: 0, pending: [], interviews: [], activity: [] }) as Dash;
  const stats = [
    { label: "Open jobs", value: d.open_jobs, icon: Briefcase, href: "/client/jobs", sub: d.pending_review ? `${d.pending_review} in review` : undefined },
    { label: "Awaiting your decision", value: d.awaiting_decision, icon: Inbox, href: d.pending[0] ? `/client/jobs/${d.pending[0].job_id}?tab=profiles` : "/client/jobs", highlight: d.awaiting_decision > 0 },
    { label: "Upcoming interviews", value: d.interviews.length, icon: CalendarClock },
    { label: "Hires", value: d.hires, icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-400">{me.client.name}</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900">Welcome, {(profile.full_name || me.user.name).split(" ")[0]}</h1>
        </div>
        <Link href="/client/jobs/new" className="inline-flex h-11 items-center gap-2 rounded-xl bg-jade px-5 text-[14.5px] font-semibold text-white shadow-glow hover:brightness-110">
          <Plus className="h-4 w-4" aria-hidden /> Post a job
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const inner = (
            <Card className={cn("h-full p-4 sm:p-5", s.highlight && "border-saffron/50 ring-2 ring-saffron/20")}>
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.highlight ? "bg-saffron-50 text-saffron-800" : "bg-jade-50 text-jade-700")}>
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-4 text-[28px] font-semibold leading-none tabular text-ink-900">{s.value}</p>
              <p className="mt-1.5 text-[13px] text-ink-500">{s.label}</p>
              {s.sub && <p className="text-[12px] text-violet-600">{s.sub}</p>}
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="block transition-transform hover:-translate-y-0.5">
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink-900">
              Profiles awaiting your decision
              {d.awaiting_decision > 0 && <span className="rounded-full bg-saffron px-2 py-0.5 text-[11px] font-bold text-[#3A2503]">{d.awaiting_decision}</span>}
            </h2>
          </div>
          {d.pending.length ? (
            <ul className="divide-y divide-line">
              {d.pending.map((p) => (
                <li key={p.application_id}>
                  <Link href={`/client/jobs/${p.job_id}?tab=profiles`} className="group flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-ink-900 group-hover:text-jade-700">{p.name}</p>
                      <p className="truncate text-[12.5px] text-ink-500">
                        {[p.current_designation, p.total_experience != null ? years(p.total_experience) : null].filter(Boolean).join(" · ")} — for {p.job_title}
                      </p>
                    </div>
                    {p.match != null && <span className="shrink-0 rounded-full bg-jade-50 px-2 py-0.5 text-[11.5px] font-semibold text-jade-700">{p.match}%</span>}
                    <span className="hidden shrink-0 text-[12px] text-ink-400 sm:block">{timeAgo(p.shared_at)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-500">Nothing waiting — we&apos;ll notify you when Synerax shares new profiles.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-[16px] font-semibold text-ink-900">Upcoming interviews</h2>
          {d.interviews.length ? (
            <ul className="space-y-3">
              {d.interviews.map((i) => (
                <li key={i.id} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                    <CalendarClock className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <Link href={`/client/jobs/${i.job_id}?tab=profiles`} className="block truncate text-[14px] font-semibold text-ink-900 hover:text-jade-700">
                      {i.name} · {i.round}
                    </Link>
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
            <p className="text-sm text-ink-500">No interviews scheduled. Approve a profile and Synerax will arrange one.</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-[16px] font-semibold text-ink-900">Recent activity</h2>
        {d.activity.length ? (
          <ul className="space-y-3">
            {d.activity.map((a, idx) => {
              const meta = ACTIVITY[a.kind] ?? ACTIVITY.posted;
              return (
                <li key={idx} className="flex items-center gap-3">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
                    <meta.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <Link href={`/client/jobs/${a.job_id}`} className="min-w-0 flex-1 truncate text-[14px] text-ink-700 hover:text-ink-900">
                    {meta.text(a)}
                  </Link>
                  <span className="shrink-0 text-[12px] text-ink-400">{a.at ? timeAgo(a.at) : ""}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-500">
            Post your first job to get started.{" "}
            <Link href="/client/jobs/new" className="font-semibold text-jade-700 hover:underline">
              Post a job
            </Link>
          </p>
        )}
      </Card>
    </div>
  );
}
