"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextArea, TextField } from "@/components/ui/fields";
import { TASK_PRIORITY, TASK_TYPES, roleLabel, type ClientMember } from "@/lib/client-labels";
import { cn } from "@/lib/utils";

/**
 * "Assign to <member>" — from a job, a shared candidate card or the Tasks page.
 * A company admin can assign to anyone; everyone else creates tasks for themselves (the database enforces this).
 */
export function AssignTaskButton({
  members,
  canAssignOthers,
  job,
  application,
  jobs,
  defaultType,
  label = "Assign task",
  className,
  variant = "secondary",
}: {
  members: Pick<ClientMember, "id" | "name" | "role" | "me" | "status">[];
  canAssignOthers: boolean;
  job?: { id: string; title: string } | null;
  application?: { id: string; name: string } | null;
  /** job picker (Tasks page) */
  jobs?: { id: string; title: string }[];
  defaultType?: string;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)} className={className} data-testid="assign-task">
        <ListPlus className="h-4 w-4" /> {label}
      </Button>
      {open && <AssignTaskDialog members={members} canAssignOthers={canAssignOthers} job={job} application={application} jobs={jobs} defaultType={defaultType} onClose={() => setOpen(false)} />}
    </>
  );
}

function AssignTaskDialog({
  members,
  canAssignOthers,
  job,
  application,
  jobs,
  defaultType,
  onClose,
}: {
  members: Pick<ClientMember, "id" | "name" | "role" | "me" | "status">[];
  canAssignOthers: boolean;
  job?: { id: string; title: string } | null;
  application?: { id: string; name: string } | null;
  jobs?: { id: string; title: string }[];
  defaultType?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const me = members.find((m) => m.me);
  const choices = (canAssignOthers ? members : members.filter((m) => m.me)).filter((m) => m.status !== "deactivated");
  const [f, setF] = useState({
    assigned_to: canAssignOthers ? "" : me?.id ?? "",
    type: defaultType ?? (application ? "review_profile" : "other"),
    title: "",
    due: "",
    priority: "medium",
    note: "",
    job_id: job?.id ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const typeLabel = TASK_TYPES.find((t) => t.value === f.type)?.label ?? "Task";
  const title = f.title.trim() || `${typeLabel}${application ? `: ${application.name}` : job ? `: ${job.title}` : ""}`;

  async function save() {
    setBusy(true);
    const res = await fetch("/api/client/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        type: f.type,
        note: f.note,
        priority: f.priority,
        assigned_to: f.assigned_to || me?.id,
        due_at: f.due ? new Date(`${f.due}T18:00:00+05:30`).toISOString() : null,
        job_id: f.job_id || null,
        application_id: application?.id ?? null,
      }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(out.error ?? "Could not create the task");
    const who = choices.find((m) => m.id === (f.assigned_to || me?.id));
    toast.success(who?.me ? "Task added to your list" : `Task assigned to ${who?.name ?? "the member"} — they've been notified`);
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={application ? `Task for ${application.name}` : job ? `Task on ${job.title}` : "New task"}
      description={canAssignOthers ? "The person you assign gets an in-app and email notification." : "Only your company admin can assign tasks to others — this one is for you."}
      footer={
        <Button onClick={save} loading={busy} disabled={!(f.assigned_to || me?.id)} data-testid="assign-task-save">
          {f.assigned_to && f.assigned_to !== me?.id ? "Assign" : "Add task"}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Assign to"
          required
          value={f.assigned_to}
          onChange={(v) => set("assigned_to", v)}
          options={choices.map((m) => ({ value: m.id, label: `${m.me ? "Me" : m.name} · ${roleLabel(m.role)}` }))}
          placeholder="Choose a member"
          disabled={!canAssignOthers}
        />
        <SelectField label="Type" value={f.type} onChange={(v) => set("type", v)} options={TASK_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
        <TextField className="sm:col-span-2" label="Title" value={f.title} onChange={(v) => set("title", v)} placeholder={title} />
        {jobs && !job && !application && (
          <SelectField className="sm:col-span-2" label="Job (optional)" value={f.job_id} onChange={(v) => set("job_id", v)} options={jobs.map((j) => ({ value: j.id, label: j.title }))} placeholder="No job" />
        )}
        <TextField label="Due date" type="date" value={f.due} onChange={(v) => set("due", v)} />
        <div>
          <span className="field-label">Priority</span>
          <div className="flex gap-1.5">
            {TASK_PRIORITY.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set("priority", p)}
                aria-pressed={f.priority === p}
                className={cn("h-9 flex-1 rounded-lg border text-[12.5px] font-medium capitalize", f.priority === p ? "border-jade bg-jade-50 text-jade-700" : "border-line text-ink-600 hover:border-line-strong")}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <TextArea className="sm:col-span-2" label="Note" value={f.note} onChange={(v) => set("note", v)} rows={3} />
      </div>
    </Dialog>
  );
}
