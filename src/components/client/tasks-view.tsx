"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Circle, Clock, ListChecks, MessageSquare, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/portal-ui/kit";
import { TASK_TYPE_LABEL, type ClientTask } from "@/lib/client-labels";
import { cn, friendlyError, timeAgo } from "@/lib/utils";

const IST_DAY = (d: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(d));
const PRIORITY_TONE: Record<string, string> = {
  urgent: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  high: "bg-saffron-50 text-saffron-800",
  medium: "bg-surface-3 text-ink-600",
  low: "bg-surface-3 text-ink-400",
};

/** To do / In progress / Done columns; overdue highlighted; due today flagged */
export function TasksView({ tasks, showAssignee, meMemberId }: { tasks: ClientTask[]; showAssignee?: boolean; meMemberId?: string }) {
  const router = useRouter();
  const today = IST_DAY(new Date());
  const cols = [
    { key: "todo", label: "To do", icon: Circle },
    { key: "in_progress", label: "In progress", icon: PlayCircle },
    { key: "done", label: "Done", icon: CheckCircle2 },
  ] as const;

  async function move(t: ClientTask, status: string) {
    const res = await fetch(`/api/client/tasks/${t.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(friendlyError(out.error ?? "Could not update"));
    toast.success(status === "done" ? "Task completed" : "Task updated");
    router.refresh();
  }

  if (!tasks.length) return <EmptyState icon={ListChecks} title="No tasks here" text="Tasks assigned to you (or that you add for yourself) appear here." compact />;

  return (
    <div className="grid gap-4 lg:grid-cols-3" data-testid="tasks-board">
      {cols.map((c) => {
        const list = tasks.filter((t) => t.status === c.key);
        return (
          <section key={c.key} className="min-w-0">
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink-700">
              <c.icon className="h-4 w-4 text-ink-400" /> {c.label} <span className="tabular text-ink-400">{list.length}</span>
            </h3>
            <ul className="space-y-2.5">
              {list.map((t) => {
                const overdue = t.status !== "done" && !!t.due_at && new Date(t.due_at).getTime() < Date.now();
                const dueToday = t.status !== "done" && !!t.due_at && IST_DAY(t.due_at) === today;
                const mine = !meMemberId || t.assigned_to?.id === meMemberId;
                return (
                  <li key={t.id} className={cn("portal-card p-4", overdue && "ring-1 ring-red-300 dark:ring-red-500/40")} data-task={t.title}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-[14px] font-semibold text-ink-900">{t.title}</p>
                      <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold capitalize", PRIORITY_TONE[t.priority] ?? PRIORITY_TONE.medium)}>{t.priority}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-500">{TASK_TYPE_LABEL[t.type] ?? "Task"}</p>
                    {(t.job || t.application) && (
                      <p className="mt-1.5 text-[12.5px]">
                        {t.application && t.job ? (
                          <Link href={`/client/jobs/${t.job.id}/profiles/${t.application.id}`} className="font-medium text-jade-700 hover:underline">
                            {t.application.name}
                          </Link>
                        ) : null}
                        {t.application && t.job ? <span className="text-ink-400"> · </span> : null}
                        {t.job && (
                          <Link href={`/client/jobs/${t.job.id}`} className="text-ink-600 hover:text-jade-700 hover:underline">
                            {t.job.title}
                          </Link>
                        )}
                      </p>
                    )}
                    {t.note && <p className="mt-1.5 line-clamp-2 text-[12.5px] text-ink-600">{t.note}</p>}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-400">
                      {t.due_at && (
                        <span className={cn("inline-flex items-center gap-1", overdue ? "font-semibold text-red-600 dark:text-red-400" : dueToday ? "font-semibold text-saffron-700" : "")} data-testid={overdue ? "overdue" : undefined}>
                          {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {overdue ? "Overdue · " : dueToday ? "Due today · " : "Due "}
                          {new Date(t.due_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                        </span>
                      )}
                      {showAssignee && t.assigned_to && <span>→ {t.assigned_to.name}</span>}
                      {t.assigned_by && <span>by {t.assigned_by}</span>}
                      {t.status === "done" && t.completed_at && <span>done {timeAgo(t.completed_at)}</span>}
                      <Comments task={t} />
                    </div>
                    {mine && t.status !== "done" && t.status !== "cancelled" && (
                      <div className="mt-3 flex gap-2">
                        {t.status === "todo" && (
                          <button onClick={() => move(t, "in_progress")} className="h-8 rounded-lg border border-line px-2.5 text-[12.5px] font-medium text-ink-700 hover:bg-surface-2">
                            Start
                          </button>
                        )}
                        <button onClick={() => move(t, "done")} className="h-8 rounded-lg bg-jade px-2.5 text-[12.5px] font-semibold text-white hover:brightness-110" data-testid="task-done">
                          Mark done
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Comments({ task }: { task: ClientTask }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ id: string; body: string; author: string; created_at: string }[] | null>(null);
  const [body, setBody] = useState("");
  async function load() {
    const { data, error } = await createClient().rpc("client_task_comments", { p_task: task.id });
    if (error) return toast.error(friendlyError(error.message));
    setItems((data ?? []) as typeof items);
  }
  async function add() {
    if (!body.trim()) return;
    const { error } = await createClient().rpc("client_task_add_comment", { p_task: task.id, p_body: body });
    if (error) return toast.error(friendlyError(error.message));
    setBody("");
    load();
  }
  return (
    <>
      <button onClick={() => (setOpen((o) => !o), !items && load())} className="inline-flex items-center gap-1 hover:text-ink-700">
        <MessageSquare className="h-3 w-3" /> {items?.length ?? task.comments}
      </button>
      {open && (
        <div className="mt-2 w-full space-y-1.5 border-t border-line pt-2 text-[12.5px] text-ink-700">
          {(items ?? []).map((c) => (
            <p key={c.id}>
              <b className="font-semibold">{c.author}:</b> {c.body}
            </p>
          ))}
          <div className="flex gap-1.5">
            <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a comment" className="field-input h-8 flex-1 text-[12.5px]" aria-label="Add a comment" />
            <button onClick={add} className="h-8 rounded-lg border border-line px-2 text-[12px] font-medium hover:bg-surface-2">
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
