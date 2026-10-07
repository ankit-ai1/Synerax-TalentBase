import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, CalendarDays, Download, FileText, GraduationCap, IndianRupee, MapPin, MessageSquare, Plane, Quote, Sparkles, Timer } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClientJobDetail, SharedProfile } from "@/lib/client-types";
import { Avatar, Bar, Chip, EmptyState, Fact, Hero, MatchRing, Section, TimeAgo, istDate } from "@/components/portal-ui/kit";
import { ProfileWorkflow, Thread } from "@/components/client/shared-profiles";
import { decisionChip } from "@/lib/client-format";
import { lpa, noticeLabel, years } from "@/lib/utils";

export const metadata = { title: "Candidate brief" };

const span = (from: string | null, to: string | null, current: boolean | null) => {
  const a = from ? istDate(from, { month: "short", year: "numeric" }) : null;
  const b = current ? "Present" : to ? istDate(to, { month: "short", year: "numeric" }) : null;
  if (!a && !b) return null;
  const months = from ? Math.max(1, Math.round(((current || !to ? Date.now() : new Date(to).getTime()) - new Date(from).getTime()) / (30.44 * 864e5))) : null;
  const dur = months ? (months >= 12 ? `${Math.floor(months / 12)} yr${months >= 24 ? "s" : ""}${months % 12 ? ` ${months % 12} mo` : ""}` : `${months} mo`) : null;
  return [`${a ?? "?"} – ${b ?? "?"}`, dur].filter(Boolean).join(" · ");
};

export default async function CandidateBriefPage({ params }: { params: Promise<{ id: string; app: string }> }) {
  await requireRole("client");
  const { id, app } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(app)) notFound();
  const supabase = await createClient();
  const [{ data: jobData }, { data: sharedData }] = await Promise.all([supabase.rpc("client_job", { p_job: id }), supabase.rpc("client_shared_candidates", { p_job: id })]);
  const job = jobData as ClientJobDetail | null;
  const p = ((sharedData ?? []) as SharedProfile[]).find((x) => x.application_id === app);
  if (!job || !p) notFound();

  const chip = decisionChip(p);
  const maxYears = Math.max(1, ...p.skills.map((s) => Number(s.years) || 0));
  const jobSkills = new Set(job.skills.map((s) => s.name.toLowerCase()));
  const isPdf = (p.cv_mime ?? "").includes("pdf") || (p.cv_name ?? "").toLowerCase().endsWith(".pdf");

  return (
    <div className="portal-in space-y-5">
      <Link href={`/client/jobs/${job.id}?tab=profiles`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {job.title} · shared profiles
      </Link>

      <Hero>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
            <Avatar name={p.name} size={76} className="shadow-card" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[30px]">{p.name}</h1>
                <Chip tone={chip.tone} pulse={p.decision === "Pending"}>
                  {chip.label}
                </Chip>
              </div>
              <p className="mt-1 text-[15px] text-ink-600">{p.headline || p.current_designation || "—"}</p>
              <p className="mt-1 text-[12.5px] text-ink-400">
                Shared for <span className="font-medium text-ink-600">{job.title}</span> · <TimeAgo date={p.shared_at} />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface/70 p-4 backdrop-blur">
            <MatchRing value={p.match} size={84} stroke={7} />
            <div className="text-[12.5px] text-ink-500">
              <p className="text-[13.5px] font-semibold text-ink-900">Fit for this role</p>
              <p>Skills, experience, salary,</p>
              <p>notice and location</p>
            </div>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-3 lg:grid-cols-5">
          <Fact icon={Briefcase} label="Experience" value={years(p.total_experience)} />
          <Fact icon={Timer} label="Notice" value={p.serving_notice ? "Serving notice" : noticeLabel(p.notice_period_days)} />
          <Fact icon={IndianRupee} label="Expected CTC" value={lpa(p.expected_ctc)} />
          <Fact icon={MapPin} label="Location" value={p.current_city ?? "—"} />
          <Fact icon={Plane} label="Relocation" value={p.willing_to_relocate ? "Open to relocate" : p.preferred_locations?.length ? p.preferred_locations.slice(0, 2).join(", ") : "—"} />
        </dl>
      </Hero>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="min-w-0 space-y-5 xl:col-span-8">
          {p.recruiter_note && (
            <section className="relative overflow-hidden rounded-[1.25rem] border border-jade/30 bg-gradient-to-br from-jade-50 to-surface p-5 sm:p-6">
              <Quote className="absolute right-4 top-4 h-10 w-10 text-jade/15" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-jade-700">Synerax recruiter note</p>
              <p className="mt-2 whitespace-pre-wrap text-[15.5px] leading-relaxed text-ink-800">{p.recruiter_note}</p>
            </section>
          )}

          {p.summary && (
            <Section title="Summary" icon={Sparkles}>
              <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-700">{p.summary}</p>
            </Section>
          )}

          <Section title="Skills" icon={Sparkles} count={p.skills.length} description="Years of hands-on experience · highlighted skills are required for this job">
            {p.skills.length ? (
              <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {p.skills.map((s) => {
                  const req = jobSkills.has(s.name.toLowerCase());
                  return (
                    <li key={s.name}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
                        <span className={req ? "font-semibold text-jade-700" : "font-medium text-ink-800"}>
                          {s.name}
                          {s.level && <span className="ml-1.5 text-[11px] font-normal text-ink-400">{s.level}</span>}
                        </span>
                        <span className="tabular text-ink-500">{s.years ? `${Number(s.years)} yrs` : "—"}</span>
                      </div>
                      <Bar value={Number(s.years) || 0.3} max={maxYears} tone={req ? "jade" : "ink"} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">No skills listed.</p>
            )}
          </Section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Section title="Experience" icon={Briefcase} count={p.experiences?.length}>
              {p.experiences?.length ? (
                <ol className="relative space-y-5 border-l border-line pl-5">
                  {p.experiences.map((x, i) => (
                    <li key={i} className="relative">
                      <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-surface ${x.is_current ? "bg-jade" : "bg-line-strong"}`} aria-hidden />
                      <p className="text-[14px] font-semibold text-ink-900">{x.designation ?? "—"}</p>
                      <p className="text-[13px] text-ink-600">{[x.company, x.location].filter(Boolean).join(" · ")}</p>
                      <p className="text-[12px] text-ink-400">{span(x.start_date, x.end_date, x.is_current)}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-500">{p.current_designation ? `Currently ${p.current_designation}.` : "Not provided."}</p>
              )}
            </Section>
            <Section title="Education" icon={GraduationCap} count={p.education.length}>
              {p.education.length ? (
                <ul className="space-y-4">
                  {p.education.map((e, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-ink-500">
                        <GraduationCap className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-ink-900">{[e.degree, e.specialization].filter(Boolean).join(", ") || "—"}</p>
                        <p className="text-[13px] text-ink-600">{e.institute ?? ""}</p>
                        {e.end_year && <p className="text-[12px] text-ink-400">{e.end_year}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-500">{p.highest_qualification ?? "Not provided."}</p>
              )}
            </Section>
          </div>

          <Section
            title="CV"
            icon={FileText}
            description={p.cv_name ?? undefined}
            action={
              p.has_cv ? (
                <a href={`/api/client/cv/${p.application_id}?download`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2">
                  <Download className="h-4 w-4" aria-hidden /> Download
                </a>
              ) : undefined
            }
          >
            {p.has_cv ? (
              isPdf ? (
                <iframe src={`/api/client/cv/${p.application_id}`} title={`${p.name} CV`} className="h-[640px] w-full rounded-xl border border-line bg-white" />
              ) : (
                <EmptyState icon={FileText} title="Preview not available for this file type" text="Download the CV to view it." compact />
              )
            ) : (
              <EmptyState icon={FileText} title="No CV attached" text="Ask Synerax to share the client-ready CV." compact />
            )}
          </Section>
        </div>

        <div className="min-w-0 space-y-5 xl:col-span-4">
          <div className="space-y-5 xl:sticky xl:top-24">
            <Section title="Decision & interviews" icon={CalendarDays}>
              <ProfileWorkflow p={p} />
              {p.decision !== "Pending" && !p.interviews.length && p.stage !== "Offered" && p.stage !== "Joined" && p.decision !== "Rejected" && (
                <p className="text-[13px] text-ink-500">Synerax will schedule the interview and share the details here.</p>
              )}
            </Section>
            <Section title="Discuss with Synerax" icon={MessageSquare} count={p.comments}>
              <Thread applicationId={p.application_id} />
            </Section>
            <p className="px-1 text-[11.5px] leading-relaxed text-ink-400">Contact details are kept private. Synerax coordinates every interview and offer for you.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
