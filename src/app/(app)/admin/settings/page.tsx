import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { ApplyRulesForm } from "./apply-rules-form";

export const metadata = { title: "App settings" };

export default async function AppSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("min_profile_completion_to_apply, updated_at").eq("id", 1).maybeSingle();
  return (
    <div className="space-y-6">
      <PageHeader title="App settings" description="Rules that apply across the candidate portal." />
      <ApplyRulesForm initial={data?.min_profile_completion_to_apply ?? 80} updatedAt={data?.updated_at ?? null} />
    </div>
  );
}
