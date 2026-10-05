import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { MastersManager } from "./masters-manager";

export const metadata = { title: "Skills & roles" };

export default async function MastersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [skills, roles, sc, rc] = await Promise.all([
    supabase.from("skills").select("id, name, category, aliases").order("name"),
    supabase.from("job_roles").select("id, name, department").order("name"),
    supabase.from("candidate_skills").select("skill_id"),
    supabase.from("candidate_job_roles").select("job_role_id"),
  ]);
  const skillUse: Record<string, number> = {};
  (sc.data ?? []).forEach((r) => (skillUse[r.skill_id] = (skillUse[r.skill_id] ?? 0) + 1));
  const roleUse: Record<string, number> = {};
  (rc.data ?? []).forEach((r) => (roleUse[r.job_role_id] = (roleUse[r.job_role_id] ?? 0) + 1));

  return (
    <>
      <PageHeader
        title="Skills & roles"
        description="Keep one name per skill. Add other spellings (ReactJS, React.js) as aliases — search will match those too."
      />
      <MastersManager skills={skills.data ?? []} roles={roles.data ?? []} skillUse={skillUse} roleUse={roleUse} />
    </>
  );
}
