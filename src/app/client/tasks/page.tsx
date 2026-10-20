import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/portal-ui/kit";
import { TasksView } from "@/components/client/tasks-view";
import { AssignTaskButton } from "@/components/client/assign-task";
import { TASK_STATUS, type ClientMember, type ClientTask } from "@/lib/client-labels";
import type { ClientJob } from "@/lib/client-types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tasks" };

type SP = { view?: string; member?: string; status?: string; job?: string };

/** "My tasks" for everyone; client_admin also gets "Team tasks" with filters */
export default async function ClientTasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole("client");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: me }, { data: members }, { data: jobs }] = await Promise.all([supabase.rpc("client_me"), supabase.rpc("client_members"), supabase.rpc("client_jobs")]);
  const role = (me as { user?: { role?: string; id?: string } } | null)?.user?.role ?? "recruiter";
  const meId = (me as { user?: { id?: string } } | null)?.user?.id;
  const admin = role === "client_admin";
  const team = admin && sp.view === "team";
  const { data } = await supabase.rpc("client_tasks_list", {
    p: team ? { scope: "team", member: sp.member ?? "", status: sp.status ?? "", job: sp.job ?? "" } : { scope: "mine" },
  });
  const tasks = (data ?? []) as ClientTask[];
  const mem = (members ?? []) as ClientMember[];
  const jobList = ((jobs ?? []) as ClientJob[]).map((j) => ({ id: j.id, title: j.title }));
  const open = tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const overdue = open.filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now()).length;

  return (
    <div className="portal-in">
      <PageTitle
        eyebrow="Client portal"
        title="Tasks"
        subtitle={`${open.length} open${overdue ? ` · ${overdue} overdue` : ""}`}
        actions={<AssignTaskButton members={mem} canAssignOthers={admin} jobs={jobList} label={admin ? "Assign a task" : "Add a task"} variant="primary" />}
      />
      {admin && (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist">
          {[
            { id: "mine", label: "My tasks", href: "/client/tasks" },
            { id: "team", label: "Team tasks", href: "/client/tasks?view=team" },
          ].map((t) => (
            <Link
              key={t.id}
              href={t.href}
              role="tab"
              aria-selected={(t.id === "team") === team}
              className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-medium", (t.id === "team") === team ? "border-jade bg-jade-50 text-jade-700" : "border-line text-ink-600 hover:border-line-strong")}
            >
              {t.label}
            </Link>
          ))}
          {team && (
            <form className="ml-auto flex flex-wrap items-center gap-2" action="/client/tasks">
              <input type="hidden" name="view" value="team" />
              <select name="member" defaultValue={sp.member ?? ""} className="field-input h-9 w-auto pr-8 text-[13px]" aria-label="Member">
                <option value="">All members</option>
                {mem.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select name="status" defaultValue={sp.status ?? ""} className="field-input h-9 w-auto pr-8 text-[13px]" aria-label="Status">
                <option value="">Any status</option>
                {TASK_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select name="job" defaultValue={sp.job ?? ""} className="field-input h-9 w-auto max-w-[200px] pr-8 text-[13px]" aria-label="Job">
                <option value="">All jobs</option>
                {jobList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
              <button className="h-9 rounded-lg border border-line px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2">Apply</button>
            </form>
          )}
        </div>
      )}
      <TasksView tasks={tasks} showAssignee={team} meMemberId={team ? meId : undefined} />
    </div>
  );
}
