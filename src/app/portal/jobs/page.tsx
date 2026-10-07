import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadMyProfile } from "@/lib/portal-data";
import type { CandidateJob } from "@/lib/portal-types";
import { ProfileMissing } from "@/components/portal/profile-missing";
import { JobsBrowser } from "./jobs-browser";

export const metadata = { title: "Find jobs" };

export default async function PortalJobsPage() {
  const profile = await requireRole("candidate");
  const me = await loadMyProfile(profile.id);
  if (!me) return <ProfileMissing />;
  const supabase = await createClient();
  const { data } = await supabase.rpc("candidate_jobs", { f: { limit: 60 } });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900">Find jobs</h1>
        <p className="mt-1 text-[15px] text-ink-500">Open roles from Synerax clients, sorted by how well they match your profile.</p>
      </div>
      <JobsBrowser
        initial={(data ?? []) as CandidateJob[]}
        mySkillIds={me.skills.map((s) => s.skill_id)}
        myExperience={typeof me.candidate.total_experience === "number" ? me.candidate.total_experience : Number(me.candidate.total_experience) || null}
      />
    </div>
  );
}
