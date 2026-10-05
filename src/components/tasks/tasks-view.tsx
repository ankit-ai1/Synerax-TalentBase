"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, CheckCircle2, CornerDownLeft, MoreHorizontal, Pencil, Trash2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDialogs } from "@/components/dialogs/provider";
import { Avatar, Card, EmptyState, Kbd } from "@/components/ui/misc";
import { Checkbox, Menu, MenuItem, Segmented } from "@/components/ui/interactive";
import { cn, dayLabel, formatTime, friendlyError, istDateKey, todayIST } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Bucket = "overdue" | "today" | "upcoming" | "someday" | "done";

function bucket(t: any): Bucket {
  if (t.status === "Done") return "done";
  if (!t.due_at) return "someday";
  if (new Date(t.due_at).getTime() < Date.now()) return "overdue";
  if (istDateKey(t.due_at) === todayIST()) return "today";
  return "upcoming";
}

export function TasksView({ tasks: initial, meId }: { tasks: any[]; meId: string }) {
  const router = useRouter();
  const d = useDialogs();
  const [tasks, setTasks] = useState(initial);
  const [who, setWho] = useState("mine");
  const [quick, setQuick] = useState("");
  useEffect(() => setTasks(initial), [initial]);

  const mine = useMemo(() => tasks.filter((t) => who === "all" || t.assigned_to === meId), [tasks, who, meId]);
  const by = (b: Bucket) => mine.filter((t) => bucket(t) === b);
  const sections: { key: Bucket; title: string; tone: string }[] = [
    { key: "overdue", title: "Overdue", tone: "text-red-600 dark:text-red-400" },
    { key: "today", title: "Today", tone: "text-jade-700" },
    { key: "upcoming", title: "Upcoming", tone: "text-ink-700" },
    { key: "someday", title: "No due date", tone: "text-ink-500" },
    { key: "done", title: "Done (30 days)", tone: "text-ink-400" },
  ];

  async function toggle(t: any) {
    const done = t.status !== "Done";
    setTasks((l) => l.map((x) => (x.id === t.id ? { ...x, status: done ? "Done" : "Open", done_at: done ? new Date().toISOString() : null } : x)));
    const { error } = await createClient().from("tasks").update({ status: done ? "Done" : "Open", done_at: done ? new Date().toISOString() : null }).eq("id", t.id);
    if (error) {
      toast.error(friendlyError(error.message));
      setTasks(initial);
      return;
    }
    if (done) toast.success("Task complete 🎉");
    router.refresh();
  }

  async function remove(id: string) {
    setTasks((l) => l.filter((x) => x.id !== id));
    const { error } = await createClient().from("tasks").delete().eq("id", id);
    if (error) toast.error(friendlyError(error.message));
    router.refresh();
  }

  async function addQuick() {
    if (!quick.trim()) return;
    const due = new Date(Date.parse(todayIST() + "T18:00:00+05:30")).toISOString();
    const { error } = await createClient().from("tasks").insert({ title: quick.trim(), due_at: due, assigned_to: meId, created_by: meId });
    if (error) return toast.error(friendlyError(error.message));
    setQuick("");
    toast.success("Task added (due today by 6 PM)");
    router.refresh();
  }

  const openCount = mine.filter((t) => t.status === "Open").length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addQuick()}
            placeholder="Quick-add a task… (e.g. Call Neha for payslips)"
            className="field-input h-11 pr-24 text-[15px]"
            aria-label="Quick task"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs text-ink-400">
            <Kbd>
              <CornerDownLeft className="h-3 w-3" />
            </Kbd>
            add
          </span>
        </div>
        <Segmented
          value={who}
          onChange={setWho}
          options={[
            { value: "mine", label: "Mine" },
            { value: "all", label: "Team" },
          ]}
        />
      </div>

      {openCount === 0 && by("done").length === 0 ? (
        <Card>
          <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No tasks" description="Type above and press Enter, or create a follow-up from a candidate profile." />
        </Card>
      ) : (
        <div className="space-y-6">
          {sections.map((s) => {
            const items = by(s.key);
            if (!items.length) return null;
            return (
              <section key={s.key}>
                <h3 className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", s.tone)}>
                  {s.title}
                  <span className="rounded-full bg-surface-3 px-1.5 text-[11px] tabular text-ink-500">{items.length}</span>
                </h3>
                <Card className="divide-y divide-line overflow-hidden">
                  {items.map((t) => {
                    const b = bucket(t);
                    return (
                      <div key={t.id} className="group flex items-start gap-3 px-4 py-3">
                        <Checkbox checked={t.status === "Done"} onChange={() => toggle(t)} className="mt-0.5 h-[18px] w-[18px] rounded-full" label="Mark as done" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm", t.status === "Done" ? "text-ink-400 line-through" : "text-ink-900")}>
                            {t.priority === "High" && t.status !== "Done" && <span className="mr-1.5 font-semibold text-red-500">!</span>}
                            {t.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            {t.due_at && (
                              <span className={cn(b === "overdue" ? "font-medium text-red-600 dark:text-red-400" : b === "today" ? "text-jade-700" : "text-ink-400")}>
                                {dayLabel(t.due_at)}, {formatTime(t.due_at)}
                              </span>
                            )}
                            {t.candidate && (
                              <Link href={`/candidates/${t.candidate.id}`} className="inline-flex items-center gap-1 text-ink-500 hover:text-jade-700">
                                <UserRound className="h-3 w-3" />
                                {t.candidate.first_name} {t.candidate.last_name}
                              </Link>
                            )}
                            {t.job && (
                              <Link href={`/jobs/${t.job.id}`} className="inline-flex items-center gap-1 text-ink-500 hover:text-jade-700">
                                <Briefcase className="h-3 w-3" />
                                {t.job.title}
                              </Link>
                            )}
                            {t.notes && <span className="truncate text-ink-400">{t.notes}</span>}
                          </div>
                        </div>
                        {who === "all" && t.assignee && <Avatar name={t.assignee.full_name} size="xs" />}
                        <Menu
                          width="w-44"
                          trigger={({ toggle: tg }) => (
                            <button onClick={tg} className="rounded-md p-1 text-ink-300 opacity-0 hover:bg-surface-3 hover:text-ink-800 focus:opacity-100 group-hover:opacity-100" aria-label="Options">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          )}
                        >
                          {(close) => (
                            <>
                              <MenuItem
                                icon={<Pencil className="h-4 w-4" />}
                                onClick={() =>
                                  (close(),
                                  d.openTask({
                                    id: t.id,
                                    title: t.title,
                                    notes: t.notes ?? "",
                                    due_at: t.due_at,
                                    priority: t.priority,
                                    assigned_to: t.assigned_to ?? "",
                                    candidate: t.candidate ? { id: t.candidate.id, label: `${t.candidate.first_name} ${t.candidate.last_name ?? ""}` } : null,
                                    job: t.job ? { id: t.job.id, label: t.job.title } : null,
                                  }))
                                }
                              >
                                Edit
                              </MenuItem>
                              <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => (close(), remove(t.id))}>
                                Delete
                              </MenuItem>
                            </>
                          )}
                        </Menu>
                      </div>
                    );
                  })}
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
