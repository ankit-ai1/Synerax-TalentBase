"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextArea, TextField } from "@/components/ui/fields";
import { Segmented } from "@/components/ui/interactive";
import { AsyncPicker, UserSelect, searchCandidates, searchJobs, type Option } from "@/components/pickers";
import { friendlyError, fromLocalInput, toLocalInput } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export type TaskPrefill = {
  id?: string;
  title?: string;
  notes?: string;
  due_at?: string | null;
  priority?: string;
  assigned_to?: string;
  candidate?: Option | null;
  job?: Option | null;
  onDone?: () => void;
};

const QUICK = [
  { label: "In 1 hour", h: 1 },
  { label: "Today 6 PM", at: 18 },
  { label: "Tomorrow 10 AM", d: 1, at: 10 },
  { label: "Next week", d: 7, at: 10 },
];

export function TaskDialog({ prefill, me, onClose }: { prefill: TaskPrefill; me: Profile; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(prefill.title ?? "");
  const [notes, setNotes] = useState(prefill.notes ?? "");
  const [due, setDue] = useState(toLocalInput(prefill.due_at ?? null));
  const [priority, setPriority] = useState(prefill.priority ?? "Normal");
  const [assigned, setAssigned] = useState(prefill.assigned_to ?? me.id);
  const [candidate, setCandidate] = useState<Option | null>(prefill.candidate ?? null);
  const [job, setJob] = useState<Option | null>(prefill.job ?? null);
  const [saving, setSaving] = useState(false);

  const quick = (q: (typeof QUICK)[number]) => {
    const ist = new Date(Date.now() + 5.5 * 3600e3);
    if (q.h) {
      setDue(toLocalInput(new Date(Date.now() + q.h * 3600e3).toISOString()));
      return;
    }
    const y = ist.getUTCFullYear(), m = ist.getUTCMonth(), d = ist.getUTCDate() + (q.d ?? 0);
    const local = new Date(Date.UTC(y, m, d, q.at ?? 10, 0));
    setDue(local.toISOString().slice(0, 16));
  };

  async function save() {
    if (!title.trim()) return toast.error("Enter a task title");
    setSaving(true);
    const row = {
      title: title.trim(),
      notes: notes.trim() || null,
      due_at: fromLocalInput(due),
      priority,
      assigned_to: assigned || null,
      candidate_id: candidate?.id ?? null,
      job_id: job?.id ?? null,
    };
    const supabase = createClient();
    const { error } = prefill.id
      ? await supabase.from("tasks").update(row).eq("id", prefill.id)
      : await supabase.from("tasks").insert({ ...row, created_by: me.id });
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(prefill.id ? "Task updated" : "Task created");
    prefill.onDone?.();
    router.refresh();
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={prefill.id ? "Edit task" : "New task / follow-up"}
      description="The reminder will show on your dashboard and in notifications."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {prefill.id ? "Save" : "Create task"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="What needs to be done" required value={title} onChange={setTitle} placeholder="e.g. Call Rahul about the offer" autoFocus />
        <div>
          <TextField label="Due by" type="datetime-local" value={due} onChange={setDue} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button key={q.label} type="button" onClick={() => quick(q)} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-600 hover:border-line-strong hover:bg-surface-3">
                {q.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="field-label">Priority</span>
            <Segmented
              value={priority}
              onChange={setPriority}
              options={[
                { value: "Low", label: "Low" },
                { value: "Normal", label: "Normal" },
                { value: "High", label: "High" },
              ]}
            />
          </div>
          <UserSelect label="Assign to" value={assigned} onChange={setAssigned} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <AsyncPicker label="Candidate (optional)" value={candidate} onChange={setCandidate} search={searchCandidates} placeholder="Choose a candidate" />
          <AsyncPicker label="Job (optional)" value={job} onChange={setJob} search={(t) => searchJobs(t, false)} placeholder="Choose a job" />
        </div>
        <TextArea label="Notes" rows={2} value={notes} onChange={setNotes} />
      </div>
    </Dialog>
  );
}
