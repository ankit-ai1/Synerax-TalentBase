"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Download, Eye, GraduationCap, Loader2, MapPin, MessageSquare, Send, Sparkles, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { portalRpc } from "@/lib/portal-rpc";
import { CLIENT_REJECT_REASONS, type ClientInterview, type SharedProfile } from "@/lib/client-types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextArea } from "@/components/ui/fields";
import { StarInput } from "@/components/ui/interactive";
import { cn, dayLabel, formatDate, formatTime, friendlyError, lpa, noticeLabel, timeAgo, years } from "@/lib/utils";

type Filter = "all" | "pending" | "approved" | "closed";

function decisionChip(p: SharedProfile) {
  if (p.stage === "Joined") return { label: "Joined", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
  if (p.stage === "Offered") return { label: "Selected — offer stage", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
  if (p.decision === "Pending") return { label: "Awaiting your decision", cls: "bg-saffron-50 text-saffron-800" };
  if (p.decision === "Approved") return { label: "Approved — interviews", cls: "bg-jade-50 text-jade-700" };
  if (p.decision === "Rejected" || p.stage === "Closed") return { label: "Not progressing", cls: "bg-surface-3 text-ink-500" };
  return { label: p.stage, cls: "bg-surface-3 text-ink-500" };
}

export function SharedProfiles({ jobId, profiles }: { jobId: string; profiles: SharedProfile[] }) {
  const [filter, setFilter] = useState<Filter>(profiles.some((p) => p.decision === "Pending") ? "pending" : "all");
  const list = profiles.filter((p) =>
    filter === "all"
      ? true
      : filter === "pending"
        ? p.decision === "Pending"
        : filter === "approved"
          ? p.decision === "Approved" && p.stage !== "Closed"
          : p.decision === "Rejected" || p.stage === "Closed"
  );
  const count = (f: Filter) =>
    profiles.filter((p) =>
      f === "all" ? true : f === "pending" ? p.decision === "Pending" : f === "approved" ? p.decision === "Approved" && p.stage !== "Closed" : p.decision === "Rejected" || p.stage === "Closed"
    ).length;

  if (profiles.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-line-strong p-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-ink-300" aria-hidden />
        <p className="mt-3 text-[15px] font-medium text-ink-800">No profiles shared yet</p>
        <p className="mt-1 text-sm text-ink-500">Synerax will share screened profiles here — you&apos;ll get a notification.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter profiles">
        {(
          [
            ["pending", "Awaiting decision"],
            ["approved", "Approved"],
            ["closed", "Not progressing"],
            ["all", "All"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] font-medium",
              filter === k ? "border-jade bg-jade text-white" : "border-line bg-surface text-ink-600 hover:border-line-strong"
            )}
          >
            {label} ({count(k)})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong p-8 text-center text-sm text-ink-500">Nothing in this view.</p>
      ) : (
        <ul className="space-y-4">
          {list.map((p) => (
            <ProfileCard key={p.application_id} p={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProfileCard({ p }: { p: SharedProfile }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "approve" | "reject" | "select" | "notselect" | { feedback: ClientInterview }>(null);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const chip = decisionChip(p);
  const edu = p.education[0];
  const canFinal = p.decision === "Approved" && p.stage === "Interview";

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(ok);
    setDialog(null);
    setReason("");
    setFeedback("");
    setRating(null);
    router.refresh();
  };

  return (
    <li className="rounded-3xl border border-line bg-surface shadow-card">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold text-ink-900">{p.name}</h3>
            <p className="text-[14px] text-ink-600">{p.headline || p.current_designation || "—"}</p>
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-500">
              {p.total_experience != null && <span>{years(p.total_experience)} experience</span>}
              {p.current_city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> {p.current_city}
                </span>
              )}
              <span>Notice: {p.serving_notice ? "Serving notice" : noticeLabel(p.notice_period_days)}</span>
              <span>Expected: {lpa(p.expected_ctc)}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", chip.cls)}>{chip.label}</span>
            {p.match != null && (
              <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-jade-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> {p.match}% match
              </span>
            )}
          </div>
        </div>

        {p.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.skills.slice(0, 10).map((s) => (
              <span key={s.name} className="rounded-full bg-surface-3 px-2.5 py-1 text-[12.5px] text-ink-700">
                {s.name}
                {s.years ? <span className="text-ink-400"> · {s.years}y</span> : null}
              </span>
            ))}
          </div>
        )}
        {(edu || p.highest_qualification) && (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-600">
            <GraduationCap className="h-4 w-4 text-ink-400" aria-hidden />
            {edu ? [edu.degree, edu.specialization, edu.institute, edu.end_year].filter(Boolean).join(", ") : p.highest_qualification}
          </p>
        )}
        {p.recruiter_note && (
          <div className="mt-4 rounded-2xl border border-jade/20 bg-jade-50/60 px-4 py-3">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-jade-700">Synerax recruiter note</p>
            <p className="mt-1 whitespace-pre-wrap text-[14px] text-ink-700">{p.recruiter_note}</p>
          </div>
        )}

        {p.interviews.length > 0 && (
          <div className="mt-4 space-y-2">
            {p.interviews.map((i) => (
              <div key={i.id} className="rounded-2xl border border-violet-500/20 bg-violet-50/50 px-4 py-3 dark:bg-violet-400/5">
                <div className="flex flex-wrap items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-violet-600" aria-hidden />
                  <p className="flex-1 text-[14px] text-ink-800">
                    <b className="font-semibold">{i.round}</b> · {dayLabel(i.scheduled_at)}, {formatTime(i.scheduled_at)} · {i.mode}
                    {i.location ? ` · ${i.location}` : ""} <span className="text-ink-400">({i.status})</span>
                  </p>
                  {i.meeting_link && (
                    <a href={i.meeting_link} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-violet-700 hover:underline dark:text-violet-300">
                      Join link
                    </a>
                  )}
                  {!i.client_feedback && (
                    <button onClick={() => setDialog({ feedback: i })} className="text-[13px] font-semibold text-jade-700 hover:underline">
                      Add feedback
                    </button>
                  )}
                </div>
                {i.client_feedback && (
                  <p className="mt-2 text-[13px] text-ink-600">
                    <span className="font-medium text-ink-800">Your feedback{i.client_rating ? ` (${i.client_rating}/5)` : ""}:</span> {i.client_feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {p.stage === "Offered" && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-[14px] text-emerald-800 dark:text-emerald-200">
            <Trophy className="h-4 w-4" aria-hidden /> You selected this candidate — Synerax will coordinate the offer and joining.
          </p>
        )}
        {p.stage === "Joined" && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-[14px] text-emerald-800 dark:text-emerald-200">
            <Trophy className="h-4 w-4" aria-hidden /> {p.name} has joined. Congratulations!
          </p>
        )}
        {p.decision === "Rejected" && (p.reject_reason || p.feedback) && (
          <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-[13.5px] text-ink-600">
            <span className="font-medium text-ink-800">Your reason:</span> {p.reject_reason}
            {p.feedback ? ` — ${p.feedback}` : ""}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {p.has_cv && (
            <>
              <a href={`/api/client/cv/${p.application_id}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13.5px] font-medium text-ink-700 hover:bg-surface-2">
                <Eye className="h-4 w-4" aria-hidden /> View CV
              </a>
              <a href={`/api/client/cv/${p.application_id}?download`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13.5px] font-medium text-ink-700 hover:bg-surface-2">
                <Download className="h-4 w-4" aria-hidden /> Download
              </a>
            </>
          )}
          <button onClick={() => setShowThread((v) => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13.5px] font-medium text-ink-700 hover:bg-surface-2" aria-expanded={showThread}>
            <MessageSquare className="h-4 w-4" aria-hidden /> Discuss with Synerax{p.comments ? ` (${p.comments})` : ""}
          </button>
          <span className="ml-auto text-[12px] text-ink-400">{p.shared_at ? `Shared ${timeAgo(p.shared_at)}` : ""}</span>
          {p.decision === "Pending" && (
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setDialog("reject")}>
                <X className="h-4 w-4" /> Reject
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={() => setDialog("approve")}>
                <Check className="h-4 w-4" /> Approve for interview
              </Button>
            </div>
          )}
          {canFinal && (
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setDialog("notselect")}>
                Not selected
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={() => setDialog("select")}>
                <Trophy className="h-4 w-4" /> Selected — make offer
              </Button>
            </div>
          )}
        </div>
      </div>

      {showThread && <Thread applicationId={p.application_id} />}

      {/* dialogs */}
      <Dialog
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        title={`Approve ${p.name} for interview?`}
        description="Synerax will contact you to schedule the interview."
        footer={
          <Button loading={busy} onClick={() => run(() => portalRpc("client_decide", { p_application: p.application_id, p_decision: "Approved", p_reason: null, p_feedback: feedback || null }), "Approved — Synerax will schedule the interview")}>
            Approve
          </Button>
        }
      >
        <TextArea label="Note for Synerax (optional)" rows={3} value={feedback} onChange={setFeedback} placeholder="Preferred interview slots, interviewers, anything to share…" />
      </Dialog>

      <Dialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={`Reject ${p.name}?`}
        description="Your feedback helps Synerax send better-matched profiles. The candidate never sees your comments."
        footer={
          <Button
            variant="danger"
            loading={busy}
            disabled={!reason || !feedback.trim()}
            onClick={() => run(() => portalRpc("client_decide", { p_application: p.application_id, p_decision: "Rejected", p_reason: reason, p_feedback: feedback }), "Feedback sent")}
          >
            Reject profile
          </Button>
        }
      >
        <div className="space-y-4">
          <SelectField label="Reason" required value={reason} onChange={setReason} options={CLIENT_REJECT_REASONS} />
          <TextArea label="Feedback" required rows={4} value={feedback} onChange={setFeedback} placeholder="What was missing or didn't fit?" />
        </div>
      </Dialog>

      <Dialog
        open={dialog === "select" || dialog === "notselect"}
        onClose={() => setDialog(null)}
        title={dialog === "select" ? `Select ${p.name}?` : `Mark ${p.name} as not selected?`}
        description={dialog === "select" ? "Synerax will take the candidate to the offer stage and manage joining." : "Please share feedback from the interviews."}
        footer={
          <Button
            variant={dialog === "select" ? "primary" : "danger"}
            loading={busy}
            disabled={dialog === "notselect" && !feedback.trim()}
            onClick={() =>
              run(
                () => portalRpc("client_final_result", { p_application: p.application_id, p_result: dialog === "select" ? "Selected" : "Rejected", p_feedback: feedback || null }),
                dialog === "select" ? "Great — Synerax will coordinate the offer" : "Feedback sent"
              )
            }
          >
            {dialog === "select" ? "Confirm selection" : "Confirm"}
          </Button>
        }
      >
        <TextArea label={dialog === "select" ? "Note for Synerax (optional)" : "Feedback"} required={dialog === "notselect"} rows={4} value={feedback} onChange={setFeedback} />
      </Dialog>

      <Dialog
        open={typeof dialog === "object" && dialog !== null}
        onClose={() => setDialog(null)}
        title="Interview feedback"
        description={typeof dialog === "object" && dialog ? `${p.name} · ${dialog.feedback.round} · ${formatDate(dialog.feedback.scheduled_at)}` : undefined}
        footer={
          <Button
            loading={busy}
            disabled={!feedback.trim()}
            onClick={() =>
              typeof dialog === "object" && dialog && run(() => portalRpc("client_interview_feedback", { p_interview: dialog.feedback.id, p_feedback: feedback, p_rating: rating }), "Feedback saved")
            }
          >
            Save feedback
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <span className="field-label">Overall rating</span>
            <StarInput value={rating} onChange={setRating} size={24} />
          </div>
          <TextArea label="Feedback" required rows={4} value={feedback} onChange={setFeedback} placeholder="Strengths, concerns, next steps…" />
        </div>
      </Dialog>
    </li>
  );
}

type Comment = { id: string; body: string; author_role: "client" | "staff"; author: string; created_at: string; mine: boolean };

function Thread({ applicationId }: { applicationId: string }) {
  const [items, setItems] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc("client_comments", { p_application: applicationId });
    if (error) return toast.error(friendlyError(error.message));
    setItems((data ?? []) as Comment[]);
  }, [applicationId]);
  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await portalRpc("client_add_comment", { p_application: applicationId, p_body: text });
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    setText("");
    load();
  }

  return (
    <div className="border-t border-line bg-surface-2/50 px-5 py-4 sm:px-6">
      {items === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-ink-400" aria-label="Loading messages" />
      ) : items.length === 0 ? (
        <p className="text-[13px] text-ink-500">No messages yet — ask Synerax anything about this profile.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id} className={cn("flex", c.mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5", c.mine ? "bg-jade text-white" : "border border-line bg-surface text-ink-800")}>
                <p className={cn("text-[11px] font-semibold", c.mine ? "text-white/80" : "text-jade-700")}>
                  {c.mine ? "You" : c.author} · {timeAgo(c.created_at)}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[13.5px]">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
          rows={2}
          placeholder="Write a message to Synerax…"
          className="field-input h-auto flex-1 py-2"
          aria-label="Message to Synerax"
        />
        <Button onClick={send} loading={busy} disabled={!text.trim()} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

