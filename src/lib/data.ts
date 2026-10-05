import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CandidateFormData, JobRole, Skill } from "@/lib/types";
import {
  emptyCandidate,
  emptyCertification,
  emptyEducation,
  emptyExperience,
  emptyProject,
  emptyReference,
  toFormStrings,
} from "@/components/candidate/defaults";

export async function getMasters() {
  const supabase = await createClient();
  const [s, r] = await Promise.all([
    supabase.from("skills").select("id, name, category, aliases").order("name"),
    supabase.from("job_roles").select("id, name, department").order("name"),
  ]);
  return { skills: (s.data ?? []) as Skill[], roles: (r.data ?? []) as JobRole[] };
}

export async function getCandidate(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("candidates")
    .select(
      `*,
      candidate_skills ( years, level, is_primary, skill:skills ( id, name, category ) ),
      candidate_job_roles ( is_primary, job_role:job_roles ( id, name, department ) ),
      candidate_experiences ( * ),
      candidate_educations ( * ),
      candidate_certifications ( * ),
      candidate_projects ( * ),
      candidate_references ( * ),
      creator:profiles!candidates_created_by_fkey ( full_name ),
      editor:profiles!candidates_updated_by_fkey ( full_name )`
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const bySort = <T extends { sort_order?: number | null }>(a: T, b: T) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
  data.candidate_experiences?.sort(bySort);
  data.candidate_educations?.sort(bySort);
  data.candidate_certifications?.sort(bySort);
  data.candidate_projects?.sort(bySort);
  data.candidate_references?.sort(bySort);
  return data;
}

export type FullCandidate = NonNullable<Awaited<ReturnType<typeof getCandidate>>>;

export function toFormData(row: FullCandidate): CandidateFormData {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return {
    id: row.id,
    candidate: toFormStrings(emptyCandidate(), row),
    skills: (row.candidate_skills ?? [])
      .filter((s: any) => s.skill)
      .map((s: any) => ({
        skill_id: s.skill.id,
        name: s.skill.name,
        years: s.years != null ? String(s.years) : "",
        level: s.level ?? "Intermediate",
        is_primary: !!s.is_primary,
      })),
    job_roles: (row.candidate_job_roles ?? [])
      .filter((r: any) => r.job_role)
      .map((r: any) => ({ job_role_id: r.job_role.id, name: r.job_role.name, is_primary: !!r.is_primary })),
    experiences: (row.candidate_experiences ?? []).map((e: any) => toFormStrings(emptyExperience(), e)),
    educations: (row.candidate_educations ?? []).map((e: any) => toFormStrings(emptyEducation(), e)),
    certifications: (row.candidate_certifications ?? []).map((e: any) => toFormStrings(emptyCertification(), e)),
    projects: (row.candidate_projects ?? []).map((e: any) => toFormStrings(emptyProject(), e)),
    references: (row.candidate_references ?? []).map((e: any) => toFormStrings(emptyReference(), e)),
  };
}
