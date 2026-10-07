"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { portalRpc } from "@/lib/portal-rpc";
import { CLOSE_REASONS } from "@/lib/client-types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { cn, friendlyError } from "@/lib/utils";

export function ClientJobActions({ jobId, title, canEdit, status }: { jobId: string; title: string; canEdit: boolean; status: string }) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const closable = ["Pending review", "Open", "On Hold"].includes(status);

  async function close() {
    if (!reason) return toast.error("Please choose a reason");
    setBusy(true);
    const { error } = await portalRpc("client_close_job", { p_job: jobId, p_reason: reason });
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(reason === "On hold" ? "Job put on hold" : "Job closed");
    setClosing(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const { error } = await portalRpc("client_delete_job", { p_job: jobId });
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success("Job deleted");
    router.replace("/client/jobs");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canEdit && (
        <Link href={`/client/jobs/${jobId}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-[13.5px] font-medium text-ink-700 hover:bg-surface-2">
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
        </Link>
      )}
      {closable && (
        <Button variant="secondary" size="md" onClick={() => setClosing(true)}>
          <Archive className="h-3.5 w-3.5" /> Close job
        </Button>
      )}
      <Button variant="secondary" size="md" onClick={() => setDeleting(true)} aria-label="Delete job">
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>

      <Dialog
        open={closing}
        onClose={() => setClosing(false)}
        title="Close this job?"
        description="Synerax will stop sourcing. Profiles already shared stay visible to you."
        footer={
          <Button onClick={close} loading={busy} disabled={!reason}>
            Close job
          </Button>
        }
      >
        <fieldset>
          <legend className="field-label">Reason</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {CLOSE_REASONS.map((r) => (
              <label key={r} className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-[14px]", reason === r ? "border-jade bg-jade-50 text-jade-700" : "border-line text-ink-700 hover:border-line-strong")}>
                <input type="radio" name="close-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[rgb(var(--jade))]" />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={remove}
        loading={busy}
        danger
        title={`Delete "${title}"?`}
        description="This job and its shared profiles will disappear from your portal — and it will also be removed for Synerax and for candidates. To pause or finish hiring instead, use Close job."
        confirmLabel="Delete job"
      />
    </div>
  );
}
