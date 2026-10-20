import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClientJob } from "@/lib/client-types";
import { PageTitle, PrimaryLink } from "@/components/portal-ui/kit";
import { JobsExplorer } from "@/components/client/jobs-explorer";

export const metadata = { title: "My jobs" };

export default async function ClientJobsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireRole("client");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: me }] = await Promise.all([supabase.rpc("client_jobs"), supabase.rpc("client_me")]);
  const jobs = (data ?? []) as ClientJob[];
  const role = (me as { user?: { role?: string } } | null)?.user?.role ?? "client_admin";
  const shared = jobs.reduce((s, j) => s + j.shared, 0);
  const hired = jobs.reduce((s, j) => s + j.joined, 0);

  return (
    <div className="portal-in">
      <PageTitle
        eyebrow="Client portal"
        title="My jobs"
        subtitle={jobs.length ? `${jobs.length} job${jobs.length === 1 ? "" : "s"} · ${shared} profiles shared by Synerax · ${hired} hired` : "Every role you share with Synerax and the profiles we send."}
        actions={
          role !== "ta_coordinator" ? (
            <PrimaryLink href="/client/jobs/new">
              <Plus className="h-4 w-4" aria-hidden /> Post a job
            </PrimaryLink>
          ) : undefined
        }
      />
      <JobsExplorer jobs={jobs} initialTab={sp.tab} role={role} />
    </div>
  );
}
