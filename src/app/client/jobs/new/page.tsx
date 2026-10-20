import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClientJobForm } from "@/components/client/client-job-form";
import { PageTitle } from "@/components/portal-ui/kit";

export const metadata = { title: "Post a job" };

export default async function ClientNewJobPage() {
  await requireRole("client");
  // a TA coordinator can't post jobs (client_save_job refuses it too)
  const { data: me } = await (await createClient()).rpc("client_me");
  if ((me as { user?: { role?: string } } | null)?.user?.role === "ta_coordinator") redirect("/client/jobs");
  return (
    <div className="portal-in">
      <PageTitle eyebrow="New requirement" title="Post a job" subtitle="Tell us about the role in five quick steps. The more detail you share, the better our shortlist." />
      <ClientJobForm />
    </div>
  );
}
