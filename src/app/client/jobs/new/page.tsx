import { requireRole } from "@/lib/auth";
import { ClientJobForm } from "@/components/client/client-job-form";

export const metadata = { title: "Post a job" };

export default async function ClientNewJobPage() {
  await requireRole("client");
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900">Post a job</h1>
        <p className="mt-1 text-[15px] text-ink-500">Tell us about the role. The more detail you share, the better our shortlist.</p>
      </div>
      <ClientJobForm />
    </div>
  );
}
