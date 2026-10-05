"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Priority } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/interactive";
import { cn, friendlyError } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function AddToJobDialog({ candidateIds, onDone, onClose }: { candidateIds: string[]; onDone?: () => void; onClose: () => void }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [jobId, setJobId] = useState("");
  const [stage, setStage] = useState("Sourced");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createClient()
      .from("jobs")
      .select("id, job_code, title, priority, locations, client:clients(name)")
      .eq("status", "Open")
      .order("created_at", { ascending: false })
      .then(({ data }) => setJobs(data ?? []));
  }, []);

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return jobs.filter((j) => !s || j.title.toLowerCase().includes(s) || j.client?.name?.toLowerCase().includes(s) || j.job_code.toLowerCase().includes(s));
  }, [jobs, q]);

  async function save() {
    if (!jobId) return toast.error("Choose a job");
    setSaving(true);
    const { data, error } = await createClient().rpc("add_to_job", { p_job: jobId, p_candidates: candidateIds, p_stage: stage });
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message));
    const added = data as number;
    const skipped = candidateIds.length - added;
    toast.success(`${added} candidate(s) added to pipeline${skipped ? ` (${skipped} already there)` : ""}`, {
      action: { label: "View pipeline", onClick: () => router.push(`/jobs/${jobId}`) },
    });
    onDone?.();
    router.refresh();
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`Add ${candidateIds.length} candidate${candidateIds.length > 1 ? "s" : ""} to a job`}
      description="The match score will be calculated automatically."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!jobId}>
            Add to pipeline
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs or clients" className="field-input pl-9" autoFocus />
        </div>
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {list.length === 0 && <p className="py-8 text-center text-sm text-ink-400">No open jobs. Create a job first.</p>}
          {list.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => setJobId(j.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                jobId === j.id ? "border-jade bg-jade-50 ring-1 ring-jade" : "border-line hover:border-line-strong"
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-ink-500">
                <Briefcase className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-900">{j.title}</span>
                <span className="block truncate text-xs text-ink-400">{[j.job_code, j.client?.name, (j.locations ?? []).join(", ")].filter(Boolean).join(" · ")}</span>
              </span>
              <Priority value={j.priority} showLabel={false} />
            </button>
          ))}
        </div>
        <div>
          <span className="field-label">Add at stage</span>
          <Segmented
            value={stage}
            onChange={setStage}
            options={[
              { value: "Sourced", label: "Sourced" },
              { value: "Screening", label: "Screening" },
              { value: "Submitted", label: "Submitted" },
            ]}
          />
        </div>
      </div>
    </Dialog>
  );
}
