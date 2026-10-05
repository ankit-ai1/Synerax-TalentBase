import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { TasksView } from "@/components/tasks/tasks-view";
import { NewTaskButton } from "@/components/interviews/schedule-button";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const profile = await requireStaff();
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const { data } = await supabase
    .from("tasks")
    .select("*, candidate:candidates(id, first_name, last_name), job:jobs(id, title), assignee:profiles!tasks_assigned_to_fkey(id, full_name)")
    .or(`status.eq.Open,done_at.gte.${since}`)
    .order("due_at", { ascending: true, nullsFirst: false });
  return (
    <>
      <PageHeader title="Tasks & follow-ups" description="Calls, reminders and pending work — so no candidate slips through." actions={<NewTaskButton me={profile.id} />} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <TasksView tasks={(data ?? []) as any[]} meId={profile.id} />
    </>
  );
}
