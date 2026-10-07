import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadMyProfile } from "@/lib/portal-data";
import { ProfileMissing } from "@/components/portal/profile-missing";
import { ProfileEditor } from "./profile-editor";

export const metadata = { title: "My profile" };

export default async function PortalProfilePage() {
  const profile = await requireRole("candidate");
  const me = await loadMyProfile(profile.id);
  if (!me) return <ProfileMissing />;
  const supabase = await createClient();
  const { data: skills } = await supabase.from("skills").select("name").order("name").limit(1000);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900">My profile</h1>
          <p className="mt-1 text-[15px] text-ink-500">Keep this up to date — it&apos;s what Synerax recruiters and employers see.</p>
        </div>
        <span className="font-mono text-[12px] text-ink-400">ID {me.candidate.candidate_code}</span>
      </div>
      <ProfileEditor me={me} skillsMaster={(skills ?? []).map((s) => s.name as string)} />
    </div>
  );
}
