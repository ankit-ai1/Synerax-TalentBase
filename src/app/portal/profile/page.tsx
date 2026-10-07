import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadMyProfile } from "@/lib/portal-data";
import { ProfileMissing } from "@/components/portal/profile-missing";
import { ProfileEditor } from "./profile-editor";
import { PageTitle } from "@/components/portal-ui/kit";

export const metadata = { title: "My profile" };

export default async function PortalProfilePage() {
  const profile = await requireRole("candidate");
  const me = await loadMyProfile(profile.id);
  if (!me) return <ProfileMissing />;
  const supabase = await createClient();
  const { data: skills } = await supabase.from("skills").select("name").order("name").limit(1000);

  return (
    <div className="portal-in">
      <PageTitle
        eyebrow="My profile"
        title={`${me.candidate.first_name} ${me.candidate.last_name ?? ""}`.trim()}
        subtitle="Keep this up to date — it's what Synerax recruiters and employers see."
        actions={<span className="rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[12px] text-ink-500">ID {me.candidate.candidate_code}</span>}
      />
      <ProfileEditor me={me} skillsMaster={(skills ?? []).map((s) => s.name as string)} />
    </div>
  );
}
