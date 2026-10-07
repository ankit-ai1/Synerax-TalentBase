import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadMyProfile } from "@/lib/portal-data";
import type { CandidateJob } from "@/lib/portal-types";
import { ProfileMissing } from "@/components/portal/profile-missing";
import { PageTitle } from "@/components/portal-ui/kit";
import { JobsBrowser } from "./jobs-browser";

export const metadata = { title: "Find jobs" };

export default async function PortalJobsPage() {
  const profile = await requireRole("candidate");
  const me = await loadMyProfile(profile.id);
  if (!me) return <ProfileMissing />;
  const supabase = await createClient();
  const { data } = await supabase.rpc("candidate_jobs", { f: { limit: 100 } });
  const jobs = (data ?? []) as CandidateJob[];
  const strong = jobs.filter((j) => (j.match ?? 0) >= 75).length;

  return (
    <div className="portal-in">
      <PageTitle
        eyebrow="Find jobs"
        title="Open roles for you"
        subtitle={jobs.length ? `${jobs.length} open role${jobs.length === 1 ? "" : "s"} from Synerax clients${strong ? ` · ${strong} strong match${strong === 1 ? "" : "es"} for your profile` : ""}` : "Open roles from Synerax clients, sorted by how well they match your profile."}
      />
      <JobsBrowser
        initial={jobs}
        mySkills={me.skills.map((s) => ({ id: s.skill_id, name: s.name }))}
        myExperience={typeof me.candidate.total_experience === "number" ? me.candidate.total_experience : Number(me.candidate.total_experience) || null}
        completion={me.completion}
      />
    </div>
  );
}
