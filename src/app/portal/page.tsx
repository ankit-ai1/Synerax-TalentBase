import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Briefcase,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Circle,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  Headphones,
  Lightbulb,
  MapPin,
  PartyPopper,
  Pencil,
  Search,
  Send,
  Sparkles,
  Timer,
  Trophy,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadMyProfile } from "@/lib/portal-data";
import { COMPLETION_ITEMS, SECTION_ANCHOR, profileLevel, type CandidateJob, type MyApplication, type PortalExtras } from "@/lib/portal-types";
import { ApplicationProgress, JobCard } from "@/components/portal/ui";
import { OpenToWorkToggle } from "@/components/portal/profile-toggles";
import { ProfileMissing } from "@/components/portal/profile-missing";
import { AvatarUpload } from "@/components/portal/avatar-upload";
import { notificationIconName } from "@/components/portal/notification-icons";
import { Chip, DateBlock, EmptyState, Hero, MODE_ICON, MatchRing, Section, TimeAgo, greeting, istDate, istTime } from "@/components/portal-ui/kit";
import { KpiCard } from "@/components/portal-ui/kpi-card";
import { ContactRow } from "@/components/portal-ui/team-card";
import { cn, lpa, noticeLabel, years } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const TIPS = [
  { title: "Add your work history", text: "Profiles with work history get 3× more shortlists." },
  { title: "List skills with years", text: "Recruiters filter by skill and experience — be specific." },
  { title: "Keep your CV fresh", text: "Upload an updated CV every few months, in PDF." },
  { title: "Answer recruiter calls", text: "Most interviews are fixed within a day of the first call." },
];

export default async function PortalDashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const profile = await requireRole("candidate");
  const sp = await searchParams;
  const me = await loadMyProfile(profile.id);
  if (!me) return <ProfileMissing />;

  const supabase = await createClient();
  const [apps, jobs, notes, extrasRes] = await Promise.all([
    supabase.rpc("candidate_my_applications"),
    supabase.rpc("candidate_jobs", { f: { limit: 12 } }),
    supabase.from("notifications").select("id, type, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.rpc("candidate_portal_extras"),
  ]);
  const extras = (extrasRes.data ?? { recruiter: null, photo_id: null, resume_id: null, saved_jobs: 0, matching_jobs: 0 }) as PortalExtras;
  extras.resume_id ??= me.documents.find((d) => d.doc_type === "Resume")?.id ?? null;
  extras.photo_id ??= me.documents.find((d) => d.doc_type === "Photo")?.id ?? null;
  const applications = (apps.data ?? []) as MyApplication[];
  const recommended = ((jobs.data ?? []) as CandidateJob[]).filter((j) => !j.applied).slice(0, 6);
  const live = applications.filter((a) => !a.withdrawn);
  const active = live.filter((a) => a.step >= 0);
  const c = me.candidate as Record<string, unknown> & typeof me.candidate;
  const cand = {
    name: `${me.candidate.first_name} ${me.candidate.last_name ?? ""}`.trim(),
    headline: (c.headline as string) || null,
    designation: (c.current_designation as string) || null,
    company: (c.current_company as string) || null,
    city: (c.current_city as string) || null,
    exp: c.total_experience as number | null,
    notice: c.notice_period_days as number | null,
    expected: c.expected_ctc as number | null,
  };
  const comp = me.completion;
  const missingKeys = new Set(comp.missing.map((m) => m.key));
  const level = profileLevel(comp.percent);
  const upcoming = applications
    .flatMap((a) => a.interviews.map((i) => ({ ...i, job: a.job_title, company: a.company })))
    .filter((i) => new Date(i.scheduled_at).getTime() > Date.now() - 3600_000)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, 4);
  const next = upcoming[0];
  const recruiter = extras.recruiter ?? applications.find((a) => a.recruiter)?.recruiter ?? null;
  const summary = next
    ? `Your ${next.round.toLowerCase()} for ${next.job} is on ${istDate(next.scheduled_at, { weekday: "long", day: "numeric", month: "short" })} at ${istTime(next.scheduled_at)}.`
    : active.length
      ? `You have ${active.length} active application${active.length === 1 ? "" : "s"} — ${active.filter((a) => a.step >= 2).length} with employers right now.`
      : recommended.length
        ? `${extras.matching_jobs || recommended.length} open role${(extras.matching_jobs || recommended.length) === 1 ? "" : "s"} match your profile. Apply in one click.`
        : "Complete your profile so we can match you with the right roles.";
  const tip = TIPS.find((t, i) => (i === 0 ? missingKeys.has("work_history") : i === 1 ? missingKeys.has("skills") : i === 2 ? missingKeys.has("cv") : true)) ?? TIPS[3];

  return (
    <div className="portal-in grid grid-cols-1 gap-5 lg:gap-6">
      {sp.welcome && (
        <div className="flex items-center gap-3 rounded-2xl border border-jade/30 bg-jade-50 px-5 py-4 text-[14.5px] text-jade-700" role="status">
          <PartyPopper className="h-5 w-5 shrink-0" aria-hidden /> Your email is verified and your profile is ready — welcome to Synerax TalentBase!
        </div>
      )}

      {/* hero + strength */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-12">
        <Hero className="flex flex-col xl:col-span-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <AvatarUpload name={cand.name} photoId={extras.photo_id} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-ink-500">
                {greeting()} · {istDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[30px]">Hi {me.candidate.first_name}</h1>
              <p className="mt-0.5 truncate text-[14.5px] text-ink-600">
                {cand.headline || [cand.designation, cand.company && `at ${cand.company}`].filter(Boolean).join(" ") || "Add your current role to stand out"}
              </p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-700">{summary}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Briefcase, label: "Experience", value: years(cand.exp) },
              { icon: MapPin, label: "City", value: cand.city ?? "—" },
              { icon: Timer, label: "Notice", value: noticeLabel(cand.notice) },
              { icon: Sparkles, label: "Expected", value: lpa(cand.expected) },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl border border-line bg-surface/70 px-3 py-2.5 backdrop-blur">
                <dt className="flex items-center gap-1.5 text-[11.5px] text-ink-400">
                  <f.icon className="h-3.5 w-3.5" aria-hidden /> {f.label}
                </dt>
                <dd className="mt-0.5 truncate text-[14px] font-semibold text-ink-900">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto" />
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { href: "/portal/jobs", n: extras.matching_jobs, label: "Matching jobs" },
              { href: "/portal/jobs", n: extras.saved_jobs, label: "Saved jobs" },
              { href: "/portal/applications", n: active.filter((a) => a.step >= 2).length, label: "With employers" },
            ].map((x) => (
              <Link key={x.label} href={x.href} className="rounded-2xl bg-surface-2/70 px-2 py-2.5 transition hover:bg-surface-3">
                <span className="block text-[18px] font-semibold leading-none tabular text-ink-900">{x.n}</span>
                <span className="mt-1 block truncate text-[11.5px] text-ink-500">{x.label}</span>
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <OpenToWorkToggle initial={me.candidate.open_to_work} plain />
            <div className="flex flex-wrap gap-2">
              <Link href="/portal/profile" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-700 hover:border-line-strong">
                <Pencil className="h-4 w-4" aria-hidden /> Edit profile
              </Link>
              {extras.resume_id ? (
                <a href={`/api/portal/documents/${extras.resume_id}?download`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink-900 px-3.5 text-[13px] font-semibold text-surface hover:bg-ink-800 dark:bg-jade dark:text-white">
                  <Download className="h-4 w-4" aria-hidden /> My CV
                </a>
              ) : (
                <Link href="/portal/profile#documents" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-jade px-3.5 text-[13px] font-semibold text-white shadow-glow">
                  Upload CV
                </Link>
              )}
            </div>
          </div>
        </Hero>

        <Section className="xl:col-span-5" title="Profile strength" icon={Sparkles} href="/portal/profile" linkLabel="Improve">
          <div className="flex items-center gap-4">
            <MatchRing value={comp.percent} size={96} stroke={8} label="complete" />
            <div className="min-w-0">
              <Chip tone={level.tone}>{level.label}</Chip>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
                {comp.missing.length ? (
                  <>
                    Complete <b className="font-semibold text-ink-900">{comp.missing.length}</b> more section{comp.missing.length === 1 ? "" : "s"} to reach 100%.
                  </>
                ) : (
                  "Your profile is complete — recruiters see everything they need."
                )}
              </p>
            </div>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {COMPLETION_ITEMS.map((it) => {
              const done = !missingKeys.has(it.key);
              return (
                <li key={it.key}>
                  <Link
                    href={SECTION_ANCHOR[it.section] ?? "/portal/profile"}
                    className={cn("group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-surface-3", done ? "text-ink-500" : "text-ink-800")}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-jade" aria-label="Done" /> : <Circle className="h-4 w-4 shrink-0 text-ink-300" aria-label="To do" />}
                    <span className={cn("flex-1 truncate", done && "line-through decoration-ink-300")}>{it.label}</span>
                    {!done && <span className="text-[11px] font-semibold text-saffron-600">+{it.weight}%</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-saffron-50/70 px-3 py-2.5 text-[12.5px] text-ink-700">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-saffron-600" aria-hidden />
            <span>
              <b className="font-semibold text-ink-900">{tip.title}.</b> {tip.text}
            </span>
          </p>
        </Section>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <KpiCard label="Applied" value={live.length} icon={<Send />} href="/portal/applications" sub={live[0] ? `Last applied ${istDate(live[0].applied_at, { day: "numeric", month: "short" })}` : "Apply to your first role"} />
        <KpiCard label="Under review" value={active.filter((a) => a.step >= 0 && a.step <= 2).length} icon={<Eye />} href="/portal/applications" sub={`${active.filter((a) => a.step === 2).length} with employers`} />
        <KpiCard label="Interviews" value={active.filter((a) => a.step === 3).length} icon={<CalendarClock />} tone="violet" href="/portal/applications?tab=interviews" sub={next ? `Next ${istDate(next.scheduled_at, { weekday: "short" })}, ${istTime(next.scheduled_at)}` : "None scheduled"} urgent={!!next && new Date(next.scheduled_at).getTime() - Date.now() < 36 * 3600e3} />
        <KpiCard label="Offers" value={active.filter((a) => a.step >= 4).length} icon={<Trophy />} tone="saffron" href="/portal/applications?tab=offers" sub={active.some((a) => a.step >= 4) ? "Congratulations!" : "Keep going"} subTone={active.some((a) => a.step >= 4) ? "up" : "ink"} />
        <KpiCard className="col-span-2 lg:col-span-1" label="Jobs matching you" value={extras.matching_jobs} icon={<Search />} href="/portal/jobs" sub={extras.saved_jobs ? `${extras.saved_jobs} saved for later` : "60%+ match"} progress={{ value: comp.percent, max: 100, label: "Higher profile strength → more matches" }} />
      </div>

      {/* recommended */}
      <Section title="Recommended for you" icon={Sparkles} count={recommended.length} href="/portal/jobs" linkLabel="See all" description="Sorted by how well each role matches your profile" bodyClassName="px-0 sm:px-0 pb-5 sm:pb-6">
        {recommended.length ? (
          <div className="-mb-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:px-6 md:grid md:snap-none md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
            {recommended.map((j) => (
              <JobCard key={j.id} job={j} completion={comp} className="w-[85%] shrink-0 snap-start sm:w-[60%] md:w-auto" />
            ))}
            {[
              { href: "/portal/jobs", icon: Search, title: "Explore every open role", text: "Filter by skill, city, work mode and salary." },
              { href: "/portal/profile#skills", icon: Sparkles, title: "Get better matches", text: "Add skills with years — matches update instantly." },
            ]
              .slice(0, (3 - (recommended.length % 3)) % 3)
              .map((x) => (
                <Link key={x.title} href={x.href} className="portal-card interactive hidden flex-col items-start justify-center gap-2 border-dashed p-6 xl:flex">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-jade-50 text-jade-700">
                    <x.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="text-[15px] font-semibold text-ink-900">{x.title}</p>
                  <p className="text-[13px] text-ink-500">{x.text}</p>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-jade-700">
                    Go <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </Link>
              ))}
          </div>
        ) : (
          <div className="px-5 sm:px-6">
            <EmptyState icon={Search} title="No matches right now" text="Add more skills to your profile — new roles are added every week and we'll show matches here." action={{ href: "/portal/profile#skills", label: "Add skills" }} compact />
          </div>
        )}
      </Section>

      {/* applications + side column */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-12">
        <Section className="xl:col-span-8" title="Application tracker" icon={ClipboardList} count={active.length} href="/portal/applications">
          {active.length ? (
            <ul className="space-y-4">
              {active.slice(0, 4).map((a) => {
                const iv = a.interviews.find((i) => new Date(i.scheduled_at).getTime() > Date.now() - 3600e3);
                return (
                  <li key={a.id} className="rounded-2xl border border-line p-4 sm:p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/portal/jobs/${a.job_id}`} className="block truncate text-[15px] font-semibold text-ink-900 hover:text-jade-700">
                          {a.job_title}
                        </Link>
                        <p className="truncate text-[12.5px] text-ink-500">
                          {a.company} · {a.origin === "Candidate applied" ? "Applied" : "Put forward by Synerax"} <TimeAgo date={a.applied_at} />
                        </p>
                      </div>
                      <Chip tone={a.step >= 4 ? "emerald" : a.step === 3 ? "violet" : a.step === 2 ? "sky" : "jade"} pulse={a.step === 3}>
                        {a.status_label}
                      </Chip>
                    </div>
                    <ApplicationProgress app={a} />
                    {iv && (
                      <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-50/60 px-3 py-2 text-[12.5px] text-violet-900 dark:bg-violet-400/10 dark:text-violet-200">
                        <CalendarClock className="h-4 w-4" aria-hidden /> <b className="font-semibold">{iv.round}</b> · {istDate(iv.scheduled_at, { weekday: "short", day: "numeric", month: "short" })}, {istTime(iv.scheduled_at)} · {iv.mode}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={ClipboardList} title="No applications yet" text="Find a role that fits and apply in one click — you'll track every step here." action={{ href: "/portal/jobs", label: "Find jobs" }} compact />
          )}
        </Section>

        <div className="min-w-0 space-y-5 lg:space-y-6 xl:col-span-4">
          <Section title="Upcoming interviews" icon={CalendarClock} count={upcoming.length}>
            {upcoming.length ? (
              <ul className="space-y-3">
                {upcoming.map((i) => {
                  const Icon = MODE_ICON[i.mode] ?? CalendarClock;
                  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${i.round} — ${i.job}`)}&dates=${toCal(i.scheduled_at)}/${toCal(new Date(new Date(i.scheduled_at).getTime() + i.duration_min * 60000).toISOString())}&details=${encodeURIComponent("Interview arranged by Synerax")}${i.location ? `&location=${encodeURIComponent(i.location)}` : ""}`;
                  return (
                    <li key={i.id} className="rounded-2xl border border-line p-3.5">
                      <div className="flex gap-3">
                        <DateBlock date={i.scheduled_at} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-ink-900">{i.round}</p>
                          <p className="truncate text-[12px] text-ink-500">
                            {i.job} · {i.company}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-600">
                            <Icon className="h-3.5 w-3.5 text-violet-500" aria-hidden /> {istTime(i.scheduled_at)} · {i.duration_min} min · {i.mode}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {i.meeting_link && (
                          <a href={i.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-violet-700">
                            Join <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        )}
                        <a href={gcal} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink-700 hover:bg-surface-2">
                          <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> Add to calendar
                        </a>
                      </div>
                      <p className="mt-2.5 text-[11.5px] text-ink-500">Prep tip: re-read the job description and keep 2–3 examples of your work ready.</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={CalendarClock} title="No interviews yet" text="When an employer shortlists you, the details appear here with a calendar invite." compact />
            )}
          </Section>

          <Section title="Your recruiter" icon={Headphones}>
            {recruiter ? (
              <>
                <ContactRow person={recruiter} message={`Hi ${recruiter.name.split(" ")[0]}, this is ${me.candidate.first_name} from the Synerax portal.`} />
                <p className="mt-3 text-[12px] text-ink-500">Questions about a role, salary or interview? Your recruiter is one message away.</p>
              </>
            ) : (
              <EmptyState icon={Headphones} title="A recruiter will be assigned" text="As soon as you're shortlisted for a role, your Synerax recruiter's details appear here." compact />
            )}
          </Section>
        </div>
      </div>

      {/* notifications + tips */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-12">
        <Section className="xl:col-span-7" title="Latest updates" icon={Bell} href="/portal/notifications">
          {(notes.data ?? []).length ? (
            <ul className="divide-y divide-line">
              {(notes.data ?? []).map((n) => {
                const Icon = notificationIconName(n.type);
                return (
                  <li key={n.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", n.read_at ? "bg-surface-3 text-ink-500" : "bg-jade-50 text-jade-700")}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      {n.link ? (
                        <Link href={n.link} className="text-[13.5px] font-medium text-ink-900 hover:text-jade-700">
                          {n.title}
                        </Link>
                      ) : (
                        <p className="text-[13.5px] font-medium text-ink-900">{n.title}</p>
                      )}
                      {n.body && <p className="truncate text-[12px] text-ink-500">{n.body}</p>}
                    </div>
                    <TimeAgo date={n.created_at} className="shrink-0 text-[11.5px] text-ink-400" />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={Bell} title="No updates yet" text="Application updates, interview invites and job alerts will appear here." compact />
          )}
        </Section>
        <Section className="xl:col-span-5" title="Tips to get hired faster" icon={Lightbulb}>
          <ul className="space-y-3">
            {TIPS.map((t, i) => (
              <li key={t.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saffron-50 text-[12px] font-bold text-saffron-800">{i + 1}</span>
                <div>
                  <p className="text-[13.5px] font-semibold text-ink-900">{t.title}</p>
                  <p className="text-[12.5px] text-ink-500">{t.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/portal/profile" className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-jade-700 hover:underline">
            Update my profile <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Section>
      </div>
    </div>
  );
}

const toCal = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
