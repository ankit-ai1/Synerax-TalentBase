import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { UsersManager } from "./users-manager";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Team & access" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at");
  const { data: counts } = await supabase.from("candidates").select("created_by");
  const added: Record<string, number> = {};
  (counts ?? []).forEach((c) => {
    if (c.created_by) added[c.created_by] = (added[c.created_by] ?? 0) + 1;
  });

  return (
    <>
      <PageHeader title="Team & access" description="Admins can do everything. HR can add, edit and search candidates, but can't delete or manage the team." />
      <UsersManager users={(data ?? []) as Profile[]} meId={me.id} added={added} />
    </>
  );
}
