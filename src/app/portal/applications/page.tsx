import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MyApplication } from "@/lib/portal-types";
import { PageTitle, PrimaryLink } from "@/components/portal-ui/kit";
import { ApplicationsList } from "./applications-list";

export const metadata = { title: "My applications" };

export default async function PortalApplicationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireRole("candidate");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("candidate_my_applications");
  const apps = (error ? [] : (data ?? [])) as MyApplication[];
  const live = apps.filter((a) => !a.withdrawn && a.step >= 0);

  return (
    <div className="portal-in">
      <PageTitle
        eyebrow="My applications"
        title="Track every step"
        subtitle={apps.length ? `${live.length} active · ${live.filter((a) => a.step === 3).length} in interviews · ${live.filter((a) => a.step >= 4).length} offers` : "Every role you've applied for or been put forward for by Synerax."}
        actions={<PrimaryLink href="/portal/jobs">Find more jobs</PrimaryLink>}
      />
      <ApplicationsList apps={apps} initialTab={sp.tab} />
    </div>
  );
}
