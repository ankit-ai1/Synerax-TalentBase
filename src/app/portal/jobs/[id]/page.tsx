import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, Building2, CalendarDays, Check, Clock, FileText, GraduationCap, IndianRupee, ListChecks, MapPin, SearchX, Sparkles, Target, Users, X } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadMyProfile } from "@/lib/portal-data";
import { expRange, salaryLabel, type CandidateJobDetail } from "@/lib/portal-types";
import { ApplyButton } from "@/components/portal/apply-button";
import { SaveJobButton } from "@/components/portal/ui";
import { ProfileMissing } from "@/components/portal/profile-missing";
import { Bar, EmptyState, Fact, Hero, MatchRing, Section, SkillChip, TimeAgo } from "@/components/portal-ui/kit";
import { cn, noticeLabel } from "@/lib/utils";

export const metadata = { title: "Job details" };

const FIT = [
  { key: "skills", label: "Skills", hint: "Must-have skills count double" },
  { key: "experience", label: "Experience", hint: "Your years vs the range" },
  { key: "salary", label: "Salary", hint: "Your expectation vs the budget" },
  { key: "notice", label: "Notice period", hint: "How soon you can join" },
  { key: "location", label: "Location", hint: "City, preference or relocation" },
] as const;

export default async function PortalJobPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole("candidate");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await loadMyProfile(profile.id);
  if (!me) return <ProfileMissing />;

  const supabase = await createClient();
  const { data } = await supabase.rpc("candidate_job", { p_job: id });
  const job = data as CandidateJobDetail | null;
  if (!job) {
    return (
      <div className="mx-auto mt-10 max-w-lg">
        <EmptyState icon={SearchX} title="This job is no longer open" text="It may have been filled or closed. There are plenty of other roles waiting for you." action={{ href: "/portal/jobs", label: "Browse open jobs" }} />
      </div>
    );
  }

  const exp = expRange(job.exp_min, job.exp_max);
  const salary = salaryLabel(job.salary_min, job.salary_max);
  const facts = [
    { icon: MapPin, label: "Location", value: job.locations.join(", ") || (job.work_mode === "Remote" ? "Remote" : "—") },
    { icon: Building2, label: "Work mode", value: job.work_mode ?? "—" },
    { icon: Clock, label: "Experience", value: exp ?? "Any" },
    { icon: IndianRupee, label: "Salary", value: salary ?? "Discussed with recruiter" },
    { icon: Briefcase, label: "Job type", value: job.employment_type ?? "—" },
    { icon: Users, label: "Openings", value: String(job.openings) },
    { icon: CalendarDays, label: "Notice (max)", value: job.notice_max != null ? noticeLabel(job.notice_max) : "Flexible" },
    { icon: GraduationCap, label: "Qualification", value: job.qualification ?? "Any" },
  ];
  const applied = !!job.application_id;
  const paras = (job.description ?? "").split(/\n{2,}/).filter(Boolean);

  return (
    <div className="portal-in space-y-5 pb-20 lg:pb-0">
      <Link href="/portal/jobs" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All jobs
      </Link>

      <Hero>
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-jade-50 to-surface-3 text-jade-700 ring-1 ring-inset ring-line">
              <Building2 className="h-7 w-7" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[11.5px] text-ink-400">{job.job_code}</p>
              <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[32px]">{job.title}</h1>
              <p className="mt-1 text-[14.5px] text-ink-600">
                {job.company}
                {job.department ? ` · ${job.department}` : ""}
              </p>
              {job.published_at && <TimeAgo date={job.published_at} prefix="Posted " className="mt-1 block text-[12.5px] text-ink-400" />}
            </div>
          </div>
          {job.match != null && (
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface/70 p-4 backdrop-blur">
              <MatchRing value={job.match} size={88} stroke={7} />
              <div className="text-[12.5px] text-ink-500">
                <p className="text-[14px] font-semibold text-ink-900">{job.match >= 75 ? "Strong match" : job.match >= 50 ? "Good match" : "Partial match"}</p>
                <p>Based on your skills,</p>
                <p>experience and location</p>
              </div>
            </div>
          )}
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
          {facts.map((f) => (
            <Fact key={f.label} icon={f.icon} label={f.label} value={f.value} />
          ))}
        </dl>
      </Hero>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="min-w-0 space-y-5 xl:col-span-8">
          <Section title="About the role" icon={FileText}>
            {paras.length ? (
              <div className="space-y-3 text-[15px] leading-relaxed text-ink-700">
                {paras.map((p, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-ink-500">Details will be shared by your recruiter.</p>
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

          <Section title="Skills" icon={ListChecks} count={job.skills.length} description="✓ = on your profile">
            {job.skills.length ? (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {job.skills.map((s) => {
                  const ok = job.matched_skills.includes(s.name);
                  return (
                    <li key={s.name} className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2.5", ok ? "border-jade/30 bg-jade-50/50" : "border-line")}>
                      <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", ok ? "bg-jade text-white" : "bg-surface-3 text-ink-400")}>
                        {ok ? <Check className="h-3.5 w-3.5" aria-label="You have this skill" /> : <X className="h-3.5 w-3.5" aria-label="Not on your profile" />}
                      </span>
                      <span className={cn("flex-1 text-[13.5px]", ok ? "font-medium text-ink-900" : "text-ink-600")}>
                        {s.name}
                        {s.min_years ? <span className="text-ink-400"> · {Number(s.min_years)}+ yrs</span> : null}
                      </span>
                      {s.mandatory && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10.5px] font-medium text-ink-500">Must-have</span>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">No specific skills listed.</p>
            )}
            {job.missing_skills.length > 0 && (
              <p className="mt-4 text-[12.5px] text-ink-500">
                Have these skills?{" "}
                <Link href="/portal/profile#skills" className="font-medium text-jade-700 hover:underline">
                  Add them to your profile
                </Link>{" "}
                to improve your match.
              </p>
            )}
          </Section>

          {!!job.similar?.length && (
            <Section title="Similar jobs" icon={Sparkles} href="/portal/jobs" linkLabel="See all">
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {job.similar.map((s) => (
                  <li key={s.id}>
                    <Link href={`/portal/jobs/${s.id}`} className="portal-card interactive flex h-full flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-[14px] font-semibold text-ink-900">{s.title}</p>
                        <MatchRing value={s.match} size={40} stroke={4} label={null} />
                      </div>
                      <p className="mt-1 truncate text-[12px] text-ink-500">{s.company}</p>
                      <p className="mt-auto pt-2 text-[12px] text-ink-500">{[s.locations.slice(0, 2).join(", "), s.work_mode, expRange(s.exp_min, s.exp_max)].filter(Boolean).join(" · ")}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <aside className="min-w-0 xl:col-span-4">
          <div className="space-y-5 xl:sticky xl:top-24">
            <section className="portal-card hidden p-5 lg:block">
              <div className="flex items-center gap-2">
                <ApplyButton jobId={job.id} applied={applied} completion={me.completion} className="flex-1" />
                <SaveJobButton jobId={job.id} saved={job.saved} className="h-12 w-12" />
              </div>
              <p className="mt-3 text-center text-[12px] text-ink-500">
                {applied ? (
                  <Link href="/portal/applications" className="font-medium text-jade-700 hover:underline">
                    Track your application →
                  </Link>
                ) : (
                  "One click — we'll send your Synerax profile and CV."
                )}
              </p>
            </section>

            <Section title="How you match" icon={Target}>
              {job.fit ? (
                <ul className="space-y-3.5">
                  {FIT.map((f) => {
                    const v = job.fit![f.key] ?? 0;
                    return (
                      <li key={f.key}>
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-medium text-ink-800">{f.label}</span>
                          <span className={cn("text-[12.5px] font-semibold tabular", v >= 75 ? "text-jade-700" : v >= 50 ? "text-saffron-600" : "text-ink-500")}>{v}%</span>
                        </div>
                        <Bar value={v} tone={v >= 75 ? "jade" : v >= 50 ? "saffron" : "ink"} />
                        <p className="mt-1 text-[11px] text-ink-400">{f.hint}</p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {job.matched_skills.map((s) => (
                    <SkillChip key={s} name={`✓ ${s}`} tone="jade" />
                  ))}
                  {job.missing_skills.map((s) => (
                    <SkillChip key={s} name={s} tone="missing" />
                  ))}
                </div>
              )}
              {me.completion.percent < 100 && (
                <Link href="/portal/profile" className="mt-4 block rounded-xl bg-saffron-50/70 px-3 py-2.5 text-[12.5px] text-ink-700 hover:bg-saffron-50">
                  Your profile is <b className="font-semibold">{me.completion.percent}%</b> complete — finishing it improves your match.
                </Link>
              )}
            </Section>
          </div>
        </aside>
      </div>

      {/* sticky apply bar on phones/tablets */}
      <div className="fixed inset-x-0 bottom-[60px] z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <ApplyButton jobId={job.id} applied={applied} completion={me.completion} className="h-11 flex-1" />
          <SaveJobButton jobId={job.id} saved={job.saved} className="h-11 w-11" />
        </div>
      </div>
    </div>
  );
}
