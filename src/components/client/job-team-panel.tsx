"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { portalRpc } from "@/lib/portal-rpc";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/fields";
import { Avatar } from "@/components/portal-ui/kit";
import { roleLabel, type ClientMember } from "@/lib/client-labels";
import { friendlyError } from "@/lib/utils";

type Brief = { id: string; name: string; role: string; status: string };

/** owner + collaborators of a job; the owner / company admin can add collaborators (edit / view) and transfer ownership */
export function JobTeamPanel({ jobId, owner, collaborators, members, canManage }: { jobId: string; owner: Brief | null; collaborators: { member: Brief; access: "edit" | "view" }[]; members: ClientMember[]; canManage: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "add" | "transfer">(null);
  const [who, setWho] = useState("");
  const [access, setAccess] = useState<"edit" | "view">("edit");
  const [busy, setBusy] = useState(false);
  const taken = new Set([owner?.id, ...collaborators.map((c) => c.member.id)]);
  const active = members.filter((m) => m.status !== "deactivated");

  async function addCollaborator() {
    setBusy(true);
    const { error } = await portalRpc("client_job_set_collaborator", { p_job: jobId, p_member: who, p_access: access });
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success("Collaborator added");
    setDialog(null);
    setWho("");
    router.refresh();
  }
  async function remove(id: string) {
    const { error } = await portalRpc("client_job_remove_collaborator", { p_job: jobId, p_member: id });
    if (error) return toast.error(friendlyError(error.message));
    router.refresh();
  }
  async function transfer() {
    setBusy(true);
    const res = await fetch(`/api/client/jobs/${jobId}/transfer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: who }) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(out.error ?? "Could not transfer");
    toast.success(`Transferred to ${out.to?.name} — they've been notified`);
    setDialog(null);
    setWho("");
    router.refresh();
  }

  return (
    <div className="space-y-3" data-testid="job-team">
      {owner ? (
        <div className="flex items-center gap-3">
          <Avatar name={owner.name} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink-900">{owner.name}</p>
            <p className="text-[12px] text-ink-500">Owner · {roleLabel(owner.role)}</p>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-ink-500">No owner — your company admin manages this job.</p>
      )}
      {collaborators.map((c) => (
        <div key={c.member.id} className="flex items-center gap-3">
          <Avatar name={c.member.name} size={30} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-ink-800">{c.member.name}</p>
            <p className="text-[11.5px] text-ink-500">{c.access === "edit" ? "Can edit" : "View only"} · {roleLabel(c.member.role)}</p>
          </div>
          {canManage && (
            <button onClick={() => remove(c.member.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-2 hover:text-ink-800" aria-label={`Remove ${c.member.name}`}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {canManage && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="secondary" onClick={() => setDialog("add")} data-testid="add-collaborator">
            <UserPlus className="h-4 w-4" /> Add collaborator
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDialog("transfer")} data-testid="transfer-job">
            <ArrowRightLeft className="h-4 w-4" /> Transfer
          </Button>
        </div>
      )}
      {dialog === "add" && (
        <Dialog
          open
          onClose={() => setDialog(null)}
          title="Add a collaborator"
          description="They'll see this job and its shared profiles."
          footer={
            <Button onClick={addCollaborator} loading={busy} disabled={!who}>
              Add
            </Button>
          }
        >
          <div className="grid gap-4">
            <SelectField label="Member" required value={who} onChange={setWho} options={active.filter((m) => !taken.has(m.id)).map((m) => ({ value: m.id, label: `${m.name} · ${roleLabel(m.role)}` }))} placeholder="Choose a member" />
            <SelectField label="Access" value={access} onChange={(v) => setAccess(v as "edit" | "view")} options={[{ value: "edit", label: "Can edit (approve, reject, edit, close)" }, { value: "view", label: "View only" }]} />
          </div>
        </Dialog>
      )}
      {dialog === "transfer" && (
        <Dialog
          open
          onClose={() => setDialog(null)}
          title="Transfer ownership"
          description="The new owner is notified and gets full control of this job."
          footer={
            <Button onClick={transfer} loading={busy} disabled={!who}>
              Transfer
            </Button>
          }
        >
          <SelectField label="New owner" required value={who} onChange={setWho} options={active.filter((m) => m.id !== owner?.id && m.role !== "ta_coordinator").map((m) => ({ value: m.id, label: `${m.name} · ${roleLabel(m.role)}` }))} placeholder="Choose a member" />
        </Dialog>
      )}
    </div>
  );
}
