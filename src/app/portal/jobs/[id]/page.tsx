import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, CalendarDays, Check, Clock, GraduationCap, MapPin, Users, X } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadMyProfile } from "@/lib/portal-data";
import type { CandidateJobDetail } from "@/lib/portal-types";
import { ApplyButton } from "@/components/portal/apply-button";
import { MatchBadge, SaveJobButton } from "@/components/portal/ui";
import { expRange } from "@/lib/portal-types";
import { ProfileMissing } from "@/components/portal/profile-missing";
import { formatDate, noticeLabel } from "@/lib/utils";

export const metadata = { title: "Job details" };

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
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-ink-900">This job is no longer open</h1>
        <p className="mt-2 text-[15px] text-ink-500">It may have been filled or closed.</p>
        <Link href="/portal/jobs" className="mt-5 inline-flex text-sm font-semibold text-jade-700 hover:underline">
          Browse open jobs
        </Link>
      </div>
    );
  }

  const exp = expRange(job.exp_min, job.exp_max);
  const facts = [
    { icon: MapPin, label: "Location", value: [job.locations.join(", "), job.work_mode].filter(Boolean).join(" · ") || "—" },
    { icon: Clock, label: "Experience", value: exp ?? "Any" },
    { icon: Briefcase, label: "Job type", value: job.employment_type ?? "—" },
    { icon: Users, label: "Openings", value: String(job.openings) },
    { icon: CalendarDays, label: "Notice", value: job.notice_max != null ? `Up to ${noticeLabel(job.notice_max)}` : "Flexible" },
    { icon: GraduationCap, label: "Qualification", value: job.qualification ?? "Any" },
  ];

  return (
    <div>
      <Link href="/portal/jobs" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All jobs
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[12px] text-ink-400">{job.job_code}</p>
                <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink-900 sm:text-[30px]">{job.title}</h1>
                <p className="mt-1 text-[15px] text-ink-500">{job.company}</p>
              </div>
              <MatchBadge value={job.match} />
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {facts.map((f) => (
                <div key={f.label} className="flex gap-2.5">
                  <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-jade" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-[12px] text-ink-400">{f.label}</dt>
                    <dd className="text-[14px] font-medium text-ink-800">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            {job.published_at && <p className="mt-5 text-[12.5px] text-ink-400">Posted {formatDate(job.published_at)}</p>}
          </section>

          <section className="rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <h2 className="text-[17px] font-semibold text-ink-900">About the role</h2>
            <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-700">{job.description || "Details will be shared by your recruiter."}</div>
            {job.interview_process && (
              <>
                <h3 className="mt-6 text-[15px] font-semibold text-ink-900">Interview process</h3>
                <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-700">{job.interview_process}</p>
              </>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center gap-2">
              <ApplyButton jobId={job.id} applied={!!job.application_id} completion={me.completion} className="flex-1" />
              <SaveJobButton jobId={job.id} saved={job.saved} className="h-12 w-12 rounded-xl" />
            </div>
            {job.application_id && (
              <Link href="/portal/applications" className="mt-3 block text-center text-[13px] font-medium text-jade-700 hover:underline">
                Track your application
              </Link>
            )}
          </section>

          <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
            <h2 className="text-[15px] font-semibold text-ink-900">Why you match</h2>
            {job.skills.length ? (
              <ul className="mt-3 space-y-2">
                {job.skills.map((s) => {
                  const ok = job.matched_skills.includes(s.name);
                  return (
                    <li key={s.name} className="flex items-center gap-2 text-[14px]">
                      {ok ? <Check className="h-4 w-4 text-jade" aria-label="You have this skill" /> : <X className="h-4 w-4 text-ink-300" aria-label="Not on your profile" />}
                      <span className={ok ? "text-ink-800" : "text-ink-500"}>{s.name}</span>
                      {s.mandatory && <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[10.5px] font-medium text-ink-500">Must-have</span>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-500">No specific skills listed.</p>
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
          </section>
        </aside>
      </div>
    </div>
  );
}
