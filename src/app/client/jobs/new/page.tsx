import { requireRole } from "@/lib/auth";
import { ClientJobForm } from "@/components/client/client-job-form";
import { PageTitle } from "@/components/portal-ui/kit";

export const metadata = { title: "Post a job" };

export default async function ClientNewJobPage() {
  await requireRole("client");
  return (
    <div className="portal-in">
      <PageTitle eyebrow="New requirement" title="Post a job" subtitle="Tell us about the role in five quick steps. The more detail you share, the better our shortlist." />
      <ClientJobForm />
    </div>
  );
}
