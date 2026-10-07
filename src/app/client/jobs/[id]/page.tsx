import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, CalendarDays, Clock, FileText, GraduationCap, IndianRupee, MapPin, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClientJobDetail, SharedProfile } from "@/lib/client-types";
import { JobStatusBadge } from "@/components/ui/misc";
import { ClientJobActions } from "@/components/client/client-job-actions";
import { SharedProfiles } from "@/components/client/shared-profiles";
import { cn, formatDate, noticeLabel } from "@/lib/utils";

export const metadata = { title: "Job" };

const range = (a: number | null, b: number | null, unit: string) =>
  a == null && b == null ? null : a != null && b != null ? `${a}–${b} ${unit}` : a != null ? `${a}+ ${unit}` : `Up to ${b} ${unit}`;

export default async function ClientJobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; posted?: string }> }) {
  await requireRole("client");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: jobData }, { data: sharedData }] = await Promise.all([
    supabase.rpc("client_job", { p_job: id }),
    supabase.rpc("client_shared_candidates", { p_job: id }),
  ]);
  const job = jobData as ClientJobDetail | null;
  if (!job) notFound();
  const shared = (sharedData ?? []) as SharedProfile[];
  const pending = shared.filter((p) => p.decision === "Pending").length;
  const tab = sp.tab === "profiles" ? "profiles" : "overview";

  const facts = [
    { icon: MapPin, label: "Location", value: [job.locations.join(", "), job.work_mode].filter(Boolean).join(" · ") || "—" },
    { icon: Users, label: "Openings", value: String(job.openings) },
    { icon: Clock, label: "Experience", value: range(job.exp_min, job.exp_max, "yrs") ?? "Any" },
    { icon: IndianRupee, label: "Budget", value: range(job.ctc_min, job.ctc_max, "LPA") ?? "—" },
    { icon: CalendarDays, label: "Notice", value: job.notice_max != null ? `Up to ${noticeLabel(job.notice_max)}` : "Flexible" },
    { icon: Briefcase, label: "Type", value: job.employment_type ?? "—" },
    { icon: GraduationCap, label: "Qualification", value: job.qualification ?? "Any" },
    { icon: CalendarDays, label: "Target date", value: job.target_date ? formatDate(job.target_date) : "—" },
  ];

  return (
    <div>
      <Link href="/client/jobs" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> My jobs
      </Link>

      {sp.posted && (
        <div className="mb-5 rounded-2xl border border-jade/30 bg-jade-50 px-5 py-4 text-[15px] text-jade-700" role="status">
          Thanks — your job has been sent to Synerax. We&apos;ll review it and start sourcing shortly.
        </div>
      )}

      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink-900 sm:text-[30px]">{job.title}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-[13.5px] text-ink-500">
            <span className="font-mono text-[12px] text-ink-400">{job.job_code}</span> · Posted {formatDate(job.created_at)}
            {job.status === "Pending review" && " · Synerax is reviewing this job"}
            {job.client_close_reason && ` · Closed: ${job.client_close_reason}`}
          </p>
        </div>
        <ClientJobActions jobId={job.id} title={job.title} canEdit={job.can_edit} status={job.status} />
      </header>

      <nav className="mb-6 flex gap-1 border-b border-line" aria-label="Job sections">
        {[
          { id: "overview", label: "Overview", href: `/client/jobs/${job.id}` },
          { id: "profiles", label: `Profiles shared by Synerax (${shared.length})`, href: `/client/jobs/${job.id}?tab=profiles`, badge: pending },
        ].map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "relative -mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm",
              tab === t.id ? "border-ink-900 font-medium text-ink-900" : "border-transparent text-ink-400 hover:text-ink-700"
            )}
          >
            {t.label}
            {!!t.badge && <span className="rounded-full bg-saffron px-1.5 text-[11px] font-bold text-[#3A2503]">{t.badge}</span>}
          </Link>
        ))}
      </nav>

      {tab === "profiles" ? (
        <SharedProfiles jobId={job.id} profiles={shared} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <h2 className="text-[17px] font-semibold text-ink-900">Job description</h2>
            <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-700">{job.description || "No description added."}</div>
            {job.jd_file_name && (
              <a href={`/api/client/jobs/${job.id}/jd`} target="_blank" rel="noopener" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-[13.5px] font-medium text-ink-700 hover:bg-surface-2">
                <FileText className="h-4 w-4 text-jade" aria-hidden /> {job.jd_file_name}
              </a>
            )}
            {job.interview_process && (
              <>
                <h3 className="mt-7 text-[15px] font-semibold text-ink-900">Interview process</h3>
                <p className="mt-2 whitespace-pre-wrap text-[14.5px] text-ink-700">{job.interview_process}</p>
              </>
            )}
          </section>
          <aside className="space-y-4">
            <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <dl className="space-y-3">
                {facts.map((f) => (
                  <div key={f.label} className="flex gap-3">
                    <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-jade" aria-hidden />
                    <div>
                      <dt className="text-[12px] text-ink-400">{f.label}</dt>
                      <dd className="text-[14px] font-medium text-ink-800">{f.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>
            <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <h3 className="text-[14px] font-semibold text-ink-900">Skills</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.skills.length ? (
                  job.skills.map((sk) => (
                    <span key={sk.name} className={cn("rounded-full px-2.5 py-1 text-[12.5px]", sk.mandatory ? "bg-jade-50 font-medium text-jade-700" : "bg-surface-3 text-ink-600")}>
                      {sk.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-ink-500">None listed</span>
                )}
              </div>
              {job.skills.some((x) => x.mandatory) && <p className="mt-2 text-[11.5px] text-ink-400">Highlighted = must-have</p>}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
