import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/portal-ui/kit";
import { TeamManager } from "@/components/client/team-manager";
import type { ClientMember } from "@/lib/client-labels";

export const metadata = { title: "Team" };

/** client_admin: the company's members — add, change role, deactivate (with hand-over), reactivate, resend invite */
export default async function ClientTeamPage() {
  await requireRole("client");
  const supabase = await createClient();
  const { data: me } = await supabase.rpc("client_me");
  if ((me as { user?: { role?: string } } | null)?.user?.role !== "client_admin") redirect("/client");
  const { data } = await supabase.rpc("client_members");
  return (
    <div className="portal-in">
      <PageTitle eyebrow="Client portal" title="Team" subtitle="Everyone in your company who works with Synerax. Members only see the jobs they own, share or are assigned to." />
      <TeamManager members={(data ?? []) as ClientMember[]} mode="client" />
    </div>
  );
}
