"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { staffEvent } from "@/lib/portal-rpc";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/fields";
import { Segmented, StarInput } from "@/components/ui/interactive";
import { INTERVIEW_RESULTS } from "@/lib/constants";
import { cn, formatDate, formatTime, friendlyError } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function FeedbackDialog({ interviewId, onDone, onClose }: { interviewId: string; onDone?: () => void; onClose: () => void }) {
  const router = useRouter();
  const [iv, setIv] = useState<any>(null);
  const [status, setStatus] = useState("Completed");
  const [result, setResult] = useState("Pending");
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [moveStage, setMoveStage] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createClient()
      .from("interviews")
      .select("*, application:applications(id, stage, job:jobs(title), candidate:candidates(first_name, last_name))")
      .eq("id", interviewId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setIv(data);
        setStatus(data.status === "Scheduled" ? "Completed" : data.status);
        setResult(data.result);
        setRating(data.rating);
        setFeedback(data.feedback ?? "");
      });
  }, [interviewId]);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("interviews").update({ status, result, rating, feedback: feedback.trim() || null }).eq("id", interviewId);
    if (!error && moveStage && result === "Rejected") {
      const { error: stErr } = await supabase.from("applications").update({ stage: "Rejected", rejection_reason: `Rejected in interview (${iv.round_name})` }).eq("id", iv.application.id);
      if (!stErr) staffEvent("stage", iv.application.id);
    }
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success("Feedback saved");
    onDone?.();
    router.refresh();
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Interview feedback"
      description={
        iv
          ? `${iv.application.candidate.first_name} ${iv.application.candidate.last_name ?? ""} · ${iv.round_name} · ${formatDate(iv.scheduled_at)} ${formatTime(iv.scheduled_at)}`
          : "Loading…"
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!iv}>
            Save feedback
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <span className="field-label">Did the interview happen?</span>
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: "Completed", label: "Completed" },
              { value: "No-show", label: "No-show" },
              { value: "Cancelled", label: "Cancel" },
            ]}
          />
        </div>
        {status === "Completed" && (
          <>
            <div>
              <span className="field-label">Result</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {INTERVIEW_RESULTS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResult(r)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      result === r
                        ? r === "Selected"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300"
                          : r === "Rejected"
                            ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                            : "border-ink-400 bg-surface-3 text-ink-900"
                        : "border-line text-ink-500 hover:border-line-strong"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="field-label">Rating</span>
              <StarInput value={rating} onChange={setRating} size={24} />
            </div>
          </>
        )}
        <TextArea label="Feedback / notes" rows={4} value={feedback} onChange={setFeedback} placeholder="Strengths, gaps, client comments…" />
        {result === "Rejected" && status === "Completed" && (
          <label className="flex items-center gap-2 text-[13px] text-ink-700">
            <input type="checkbox" checked={moveStage} onChange={(e) => setMoveStage(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--jade))]" />
            Mark the candidate as &quot;Rejected&quot; in the pipeline
          </label>
        )}
      </div>
    </Dialog>
  );
}
