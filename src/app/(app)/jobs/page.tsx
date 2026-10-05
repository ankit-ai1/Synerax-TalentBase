import { Briefcase, Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, StatTile } from "@/components/ui/misc";
import { JOB_LIST_SELECT } from "@/components/jobs/job-row";
import { JobsList } from "@/components/jobs/jobs-list";

export const metadata = { title: "Jobs" };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function JobsPage() {
  const profile = await requireStaff();
  const supabase = await createClient();
  const [{ data: jobs }, { data: mine }] = await Promise.all([
    supabase.from("jobs").select(JOB_LIST_SELECT).order("created_at", { ascending: false }),
    supabase.from("job_assignees").select("job_id").eq("user_id", profile.id),
  ]);
  const all = (jobs ?? []) as any[];
  const open = all.filter((j) => j.status === "Open");
  const positions = open.reduce((s, j) => s + j.openings, 0);
  const filled = open.reduce((s, j) => s + (j.applications ?? []).filter((a: any) => a.stage === "Joined").length, 0);
  const interviewing = open.reduce((s, j) => s + (j.applications ?? []).filter((a: any) => a.stage === "Interview").length, 0);
  const urgent = open.filter((j) => j.priority === "Urgent" || j.priority === "High").length;

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Client requirements, their pipelines and how many positions are filled."
        actions={
          <LinkButton href="/jobs/new">
            <Plus className="h-4 w-4" /> New job
          </LinkButton>
        }
      />
      {all.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Briefcase className="h-6 w-6" />}
            title="No job openings yet"
            description="Add a client requirement here as a job. Matching candidates can then be added to its pipeline in one click."
            action={
              <LinkButton href="/jobs/new">
                <Plus className="h-4 w-4" /> Create the first job
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Open jobs" value={open.length} hint={`${urgent} high/urgent priority`} />
            <StatTile label="Open positions" value={positions - filled} hint={`${filled} of ${positions} filled`} />
            <StatTile label="In interview stage" value={interviewing} />
            <StatTile label="Closed / filled" value={all.filter((j) => ["Filled", "Closed"].includes(j.status)).length} accent />
          </div>
          <JobsList jobs={all} mine={(mine ?? []).map((m) => m.job_id)} />
        </>
      )}
    </>
  );
}
