import { createClient } from "@/lib/supabase/server";
import { getMasters } from "@/lib/data";
import { PageHeader } from "@/components/ui/misc";
import { JobForm } from "@/components/jobs/job-form";
import { emptyJob } from "@/components/jobs/job-defaults";

export const metadata = { title: "New job" };

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const sp = await searchParams;
  const { skills, roles } = await getMasters();
  const initial = emptyJob();
  if (sp.client) {
    const supabase = await createClient();
    const { data } = await supabase.from("clients").select("id, name, client_code").eq("id", sp.client).maybeSingle();
    if (data) initial.client = { id: data.id, label: data.name, sub: data.client_code };
  }
  return (
    <>
      <div className="mx-auto max-w-4xl">
        <PageHeader title="New job opening" description="The more detailed the requirement, the better the matching." />
      </div>
      <JobForm initial={initial} skills={skills} roles={roles} />
    </>
  );
}
