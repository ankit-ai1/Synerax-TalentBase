"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { portalRpc } from "@/lib/portal-rpc";
import { CLIENT_REJECT_REASONS } from "@/lib/client-types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/fields";
import { cn, friendlyError } from "@/lib/utils";

/** Approve / Reject a shared profile (both open a short dialog). Works anywhere in the client portal. */
export function DecisionActions({ applicationId, name, size = "md", className, stretch }: { applicationId: string; name: string; size?: "sm" | "md"; className?: string; stretch?: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "approve" | "reject">(null);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(decision: "Approved" | "Rejected") {
    setBusy(true);
    const { error } = await portalRpc("client_decide", {
      p_application: applicationId,
      p_decision: decision,
      p_reason: decision === "Rejected" ? reason : null,
      p_feedback: feedback || null,
    });
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(decision === "Approved" ? "Approved — Synerax will schedule the interview" : "Feedback sent to Synerax");
    setDialog(null);
    setReason("");
    setFeedback("");
    router.refresh();
  }

  const btn = size === "sm" ? "h-9 px-3 text-[13px]" : "";
  return (
    <>
      <div className={cn("flex gap-2", stretch && "w-full [&>*]:flex-1", className)}>
        <Button variant="secondary" className={btn} onClick={() => setDialog("reject")}>
          <X className="h-4 w-4" /> Reject
        </Button>
        <Button className={btn} onClick={() => setDialog("approve")}>
          <Check className="h-4 w-4" /> Approve
        </Button>
      </div>

      <Dialog
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        title={`Approve ${name} for interview?`}
        description="Synerax will contact you to schedule the interview."
        footer={
          <Button loading={busy} onClick={() => decide("Approved")}>
            <Check className="h-4 w-4" /> Approve for interview
          </Button>
        }
      >
        <TextArea label="Note for Synerax (optional)" rows={3} value={feedback} onChange={setFeedback} placeholder="Preferred interview slots, interviewers, anything to share…" />
      </Dialog>

      <Dialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={`Reject ${name}?`}
        description="Your feedback helps Synerax send better-matched profiles. The candidate never sees your comments."
        footer={
          <Button variant="danger" loading={busy} disabled={!reason || !feedback.trim()} onClick={() => decide("Rejected")}>
            Reject profile
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="field-label">
              Reason <span className="text-red-500">*</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CLIENT_REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  aria-pressed={reason === r}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                    reason === r ? "border-red-500/60 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "border-line text-ink-600 hover:border-line-strong"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <TextArea label="Feedback" required rows={4} value={feedback} onChange={setFeedback} placeholder="What was missing or didn't fit?" />
        </div>
      </Dialog>
    </>
  );
}
