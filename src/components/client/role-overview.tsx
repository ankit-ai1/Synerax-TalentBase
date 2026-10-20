import Link from "next/link";
import { AlertTriangle, CalendarClock, ClipboardCheck, Inbox, ListChecks, Users } from "lucide-react";
import { Section } from "@/components/portal-ui/kit";
import { TASK_TYPE_LABEL, roleLabel, type ClientTask } from "@/lib/client-labels";
import { cn } from "@/lib/utils";

export type RoleExtras = {
  role?: string;
  my_tasks?: ClientTask[];
  my_tasks_open?: number;
  my_tasks_overdue?: number;
  my_jobs?: number;
  my_pending?: number;
  feedback_pending?: number;
  interviews_this_week?: number;
  team_overdue?: number | null;
  jobs_by_member?: { id: string; name: string; role: string; open: number; pending: number; overdue: number }[] | null;
};

function Stat({ label, value, href, warn, icon: Icon }: { label: string; value: number; href?: string; warn?: boolean; icon: typeof Inbox }) {
  const body = (
    <>
      <Icon className={cn("h-4 w-4", warn ? "text-saffron-600" : "text-ink-400")} aria-hidden />
      <span className="text-[22px] font-semibold leading-none tabular text-ink-900">{value}</span>
      <span className="text-[12.5px] text-ink-500">{label}</span>
    </>
  );
  const cls = cn("flex flex-col gap-1.5 rounded-2xl border p-3.5", warn && value ? "border-saffron/50 bg-saffron-50/50" : "border-line");
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-line-strong")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function TaskList({ tasks }: { tasks: ClientTask[] }) {
  if (!tasks.length) return <p className="text-[13px] text-ink-500">No open tasks — nice.</p>;
  return (
    <ul className="divide-y divide-line">
      {tasks.slice(0, 5).map((t) => {
        const overdue = !!t.due_at && new Date(t.due_at).getTime() < Date.now();
        return (
          <li key={t.id} className="flex items-center gap-3 py-2.5">
            <ListChecks className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-ink-900">{t.title}</p>
              <p className="truncate text-[12px] text-ink-500">{[TASK_TYPE_LABEL[t.type], t.application?.name, t.job?.title].filter(Boolean).join(" · ")}</p>
            </div>
            {t.due_at && (
              <span className={cn("shrink-0 text-[12px]", overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-ink-400")}>
                {overdue ? "Overdue" : new Date(t.due_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** the role-specific part of the client dashboard (data from client_dashboard_extras — already scoped to the member) */
export function RoleOverview({ x, awaiting }: { x: RoleExtras; awaiting: number }) {
  const role = x.role ?? "client_admin";
  if (role === "client_admin") {
    return (
      <Section title="Company overview" icon={Users} description="Your team's jobs, decisions and tasks" href="/client/team" linkLabel="Team">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="role-admin">
          <Stat label="Pending decisions" value={awaiting} icon={Inbox} warn href="/client/jobs" />
          <Stat label="Overdue team tasks" value={x.team_overdue ?? 0} icon={AlertTriangle} warn href="/client/tasks?view=team" />
          <Stat label="Interviews this week" value={x.interviews_this_week ?? 0} icon={CalendarClock} />
          <Stat label="My open tasks" value={x.my_tasks_open ?? 0} icon={ListChecks} href="/client/tasks" />
        </div>
        {!!x.jobs_by_member?.length && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                <tr className="border-b border-line">
                  <th className="py-2 font-medium">Member</th>
                  <th className="py-2 text-right font-medium">Open jobs</th>
                  <th className="py-2 text-right font-medium">Awaiting decision</th>
                  <th className="py-2 text-right font-medium">Overdue tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {x.jobs_by_member.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2">
                      <span className="font-medium text-ink-800">{m.name}</span> <span className="text-[12px] text-ink-400">· {roleLabel(m.role)}</span>
                    </td>
                    <td className="py-2 text-right tabular">{m.open}</td>
                    <td className={cn("py-2 text-right tabular", m.pending && "font-semibold text-saffron-700")}>{m.pending}</td>
                    <td className={cn("py-2 text-right tabular", m.overdue && "font-semibold text-red-600 dark:text-red-400")}>{m.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    );
  }
  if (role === "ta_coordinator") {
    return (
      <Section title="My work" icon={ClipboardCheck} description="Interviews and follow-ups assigned to you" href="/client/tasks" linkLabel="All tasks">
        <div className="grid grid-cols-3 gap-3" data-testid="role-ta">
          <Stat label="Interviews this week" value={x.interviews_this_week ?? 0} icon={CalendarClock} />
          <Stat label="Feedback pending" value={x.feedback_pending ?? 0} icon={ClipboardCheck} warn />
          <Stat label="My open tasks" value={x.my_tasks_open ?? 0} icon={ListChecks} warn={!!x.my_tasks_overdue} href="/client/tasks" />
        </div>
        <div className="mt-3">
          <TaskList tasks={x.my_tasks ?? []} />
        </div>
      </Section>
    );
  }
  return (
    <Section title="My work" icon={ListChecks} description="Your jobs, decisions and tasks" href="/client/tasks" linkLabel="All tasks">
      <div className="grid grid-cols-3 gap-3" data-testid="role-member">
        <Stat label="My open jobs" value={x.my_jobs ?? 0} icon={Users} href="/client/jobs" />
        <Stat label="My pending decisions" value={x.my_pending ?? 0} icon={Inbox} warn href="/client/jobs" />
        <Stat label="My open tasks" value={x.my_tasks_open ?? 0} icon={ListChecks} warn={!!x.my_tasks_overdue} href="/client/tasks" />
      </div>
      <div className="mt-3">
        <TaskList tasks={x.my_tasks ?? []} />
      </div>
    </Section>
  );
}
