import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClientJobDetail } from "@/lib/client-types";
import { ClientJobForm } from "@/components/client/client-job-form";
import { PageTitle } from "@/components/portal-ui/kit";

export const metadata = { title: "Edit job" };

export default async function ClientEditJobPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("client");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("client_job", { p_job: id });
  const job = data as ClientJobDetail | null;
  if (!job) notFound();
  if (!job.can_edit) redirect(`/client/jobs/${id}`);

  return (
    <div className="portal-in">
      <Link href={`/client/jobs/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to job
      </Link>
      <PageTitle eyebrow="Edit job" title={job.title} subtitle="Changes are visible to Synerax right away." />
      <ClientJobForm initial={job} />
    </div>
  );
}
