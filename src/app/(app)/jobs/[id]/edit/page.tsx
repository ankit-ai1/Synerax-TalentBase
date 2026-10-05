import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMasters } from "@/lib/data";
import { PageHeader } from "@/components/ui/misc";
import { JobForm } from "@/components/jobs/job-form";
import { emptyJob, type JobFormData } from "@/components/jobs/job-defaults";

export const metadata = { title: "Edit job" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: j }, masters] = await Promise.all([
    supabase.from("jobs").select("*, client:clients(id, name, client_code), job_skills(is_mandatory, min_years, skill:skills(id, name)), job_assignees(user_id)").eq("id", id).maybeSingle(),
    getMasters(),
  ]);
  if (!j) notFound();
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const initial: JobFormData = {
    ...emptyJob(),
    id: j.id,
    title: j.title,
    client: j.client ? { id: j.client.id, label: j.client.name, sub: j.client.client_code } : null,
    job_role_id: s(j.job_role_id),
    department: s(j.department),
    description: s(j.description),
    openings: s(j.openings),
    employment_type: s(j.employment_type),
    work_mode: s(j.work_mode),
    locations: j.locations ?? [],
    exp_min: s(j.exp_min),
    exp_max: s(j.exp_max),
    ctc_min: s(j.ctc_min),
    ctc_max: s(j.ctc_max),
    notice_max: s(j.notice_max),
    qualification: s(j.qualification),
    priority: j.priority,
    status: j.status,
    target_date: s(j.target_date),
    hiring_manager: s(j.hiring_manager),
    notes: s(j.notes),
    skills: (j.job_skills ?? []).filter((x: any) => x.skill).map((x: any) => ({ skill_id: x.skill.id, name: x.skill.name, is_mandatory: x.is_mandatory, min_years: s(x.min_years) })),
    assignees: (j.job_assignees ?? []).map((a: any) => a.user_id),
  };
  return (
    <>
      <div className="mx-auto max-w-4xl">
        <PageHeader title={`Edit ${j.title}`} description={j.job_code} />
      </div>
      <JobForm initial={initial} skills={masters.skills} roles={masters.roles} />
    </>
  );
}
