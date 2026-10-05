"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SelectField, TextArea, TextField } from "@/components/ui/fields";
import { REJECTION_REASONS } from "@/lib/constants";
import { StageBadge } from "@/components/ui/misc";
import { friendlyError, todayIST } from "@/lib/utils";

export type StagePrefill = {
  applicationId: string;
  candidateName: string;
  from: string;
  to: string;
  onDone?: () => void;
};

/** Some stages need extra info: rejection reason, offer CTC, joining date */
export function StageDialog({ prefill, onClose }: { prefill: StagePrefill; onClose: () => void }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const [ctc, setCtc] = useState("");
  const [joining, setJoining] = useState(prefill.to === "Joined" ? todayIST() : "");
  const [saving, setSaving] = useState(false);
  const isReject = prefill.to === "Rejected" || prefill.to === "Dropped";

  async function save() {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, any> = { stage: prefill.to };
    if (isReject) patch.rejection_reason = reason === "Other" ? other.trim() || "Other" : reason || null;
    if (prefill.to === "Offered") {
      patch.offered_ctc = ctc ? Number(ctc) : null;
      patch.expected_joining = joining || null;
    }
    if (prefill.to === "Joined") patch.joined_at = joining || todayIST();
    const { error } = await createClient().from("applications").update(patch).eq("id", prefill.applicationId);
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(`${prefill.candidateName} → ${prefill.to}`);
    prefill.onDone?.();
    router.refresh();
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={prefill.candidateName}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} variant={isReject ? "danger" : "primary"}>
            Move to {prefill.to}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <StageBadge stage={prefill.from} /> <span>→</span> <StageBadge stage={prefill.to} />
        </div>
        {isReject && (
          <>
            <SelectField label="Reason" value={reason} onChange={setReason} options={REJECTION_REASONS} placeholder="Choose a reason" />
            {reason === "Other" && <TextArea label="Detail" rows={2} value={other} onChange={setOther} />}
          </>
        )}
        {prefill.to === "Offered" && (
          <>
            <TextField label="Offered CTC" type="number" min={0} step={0.01} prefix="₹" suffix="LPA" value={ctc} onChange={setCtc} />
            <TextField label="Expected joining date" type="date" value={joining} onChange={setJoining} />
          </>
        )}
        {prefill.to === "Joined" && <TextField label="Joining date" type="date" value={joining} onChange={setJoining} />}
      </div>
    </Dialog>
  );
}
