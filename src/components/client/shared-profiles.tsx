"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Columns3, ExternalLink, Loader2, MapPin, MessageSquare, Send, Sparkles, Star, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { portalRpc } from "@/lib/portal-rpc";
import type { ClientInterview, SharedProfile } from "@/lib/client-types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/fields";
import { StarInput } from "@/components/ui/interactive";
import { Avatar, Chip, EmptyState, MODE_ICON, MatchRing, SkillChip, TimeAgo, istDate, istTime, relTime } from "@/components/portal-ui/kit";
import { DecisionActions } from "./decision-actions";
import { decisionChip } from "@/lib/client-format";
import { cn, friendlyError, lpa, noticeLabel, years } from "@/lib/utils";

type Filter = "all" | "pending" | "approved" | "closed";


const inFilter = (p: SharedProfile, f: Filter) =>
  f === "all" ? true : f === "pending" ? p.decision === "Pending" : f === "approved" ? p.decision === "Approved" && p.stage !== "Closed" : p.decision === "Rejected" || p.stage === "Closed";

export function SharedProfiles({ jobId, profiles }: { jobId: string; profiles: SharedProfile[] }) {
  const [filter, setFilter] = useState<Filter>(profiles.some((p) => p.decision === "Pending") ? "pending" : "all");
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const list = profiles.filter((p) => inFilter(p, filter));
  const toggle = (id: string) =>
    setCompare((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id);
      if (c.length >= 3) {
        toast.message("Compare up to 3 profiles at a time");
        return c;
      }
      return [...c, id];
    });

  if (profiles.length === 0) {
    return <EmptyState icon={Sparkles} title="No profiles shared yet" text="Synerax is screening candidates for this role. You'll get an email and a notification as soon as profiles are ready." />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter profiles">
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
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              filter === k ? "border-jade bg-jade text-white shadow-glow" : "border-line bg-surface text-ink-600 hover:border-line-strong"
            )}
          >
            {label}
            <span className={cn("rounded-full px-1.5 text-[11px] tabular", filter === k ? "bg-white/20" : "bg-surface-3")}>{profiles.filter((p) => inFilter(p, k)).length}</span>
          </button>
        ))}
        <span className="ml-auto hidden text-[12.5px] text-ink-400 sm:block">Tick up to 3 profiles to compare side by side</span>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Sparkles} title="Nothing in this view" text="Try another filter." compact />
      ) : (
        <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {list.map((p) => (
            <ProfileCard key={p.application_id} p={p} jobId={jobId} selected={compare.includes(p.application_id)} onSelect={() => toggle(p.application_id)} />
          ))}
        </ul>
      )}

      {compare.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-pop backdrop-blur">
            <div className="flex -space-x-2">
              {compare.map((id) => {
                const p = profiles.find((x) => x.application_id === id);
                return p ? <Avatar key={id} name={p.name} size={30} ring /> : null;
              })}
            </div>
            <span className="text-[13px] font-medium text-ink-700">{compare.length} selected</span>
            <Button size="sm" onClick={() => setShowCompare(true)} disabled={compare.length < 2}>
              <Columns3 className="h-4 w-4" /> Compare
            </Button>
            <button onClick={() => setCompare([])} className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-3 hover:text-ink-800" aria-label="Clear selection">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <Dialog open={showCompare} onClose={() => setShowCompare(false)} title="Compare profiles" size="lg">
        <CompareTable profiles={compare.map((id) => profiles.find((p) => p.application_id === id)).filter((p): p is SharedProfile => !!p)} jobId={jobId} />
      </Dialog>
    </div>
  );
}

function ProfileCard({ p, jobId, selected, onSelect }: { p: SharedProfile; jobId: string; selected: boolean; onSelect: () => void }) {
  const chip = decisionChip(p);
  const next = p.interviews.find((i) => new Date(i.scheduled_at).getTime() > Date.now() - 3600e3 && i.status !== "Completed");
  const brief = `/client/jobs/${jobId}/profiles/${p.application_id}`;
  return (
    <li className={cn("portal-card flex flex-col p-5 transition-shadow", selected && "ring-2 ring-jade/50")}>
      <div className="flex items-start gap-3.5">
        <Avatar name={p.name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={brief} className="truncate text-[16.5px] font-semibold text-ink-900 hover:text-jade-700">
              {p.name}
            </Link>
            <Chip tone={chip.tone} pulse={p.decision === "Pending"}>
              {chip.label}
            </Chip>
          </div>
          <p className="truncate text-[13.5px] text-ink-600">{p.headline || p.current_designation || "—"}</p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-ink-500">
            {p.total_experience != null && <span>{years(p.total_experience)}</span>}
            {p.current_city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {p.current_city}
              </span>
            )}
            <span>{p.serving_notice ? "Serving notice" : `Notice ${noticeLabel(p.notice_period_days)}`}</span>
            <span>Expects {lpa(p.expected_ctc)}</span>
          </p>
        </div>
        <MatchRing value={p.match} size={56} />
      </div>

      {p.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.skills.slice(0, 6).map((s) => (
            <SkillChip key={s.name} name={s.name} years={s.years} tone={s.primary ? "jade" : "ink"} />
          ))}
          {p.skills.length > 6 && <span className="self-center text-[12px] text-ink-400">+{p.skills.length - 6} more</span>}
        </div>
      )}
      {p.recruiter_note && (
        <blockquote className="mt-4 rounded-xl border-l-[3px] border-jade bg-jade-50/50 px-3.5 py-2.5 text-[13.5px] text-ink-700">
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-jade-700">Synerax recruiter note</span>
          <span className="line-clamp-2">{p.recruiter_note}</span>
        </blockquote>
      )}
      {next && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-violet-50/70 px-3 py-2 text-[13px] text-violet-800 dark:bg-violet-400/10 dark:text-violet-200">
          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">
            <b className="font-semibold">{next.round}</b> · {istDate(next.scheduled_at, { weekday: "short", day: "numeric", month: "short" })}, {istTime(next.scheduled_at)}
          </span>
        </p>
      )}

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-[12.5px] text-ink-500 hover:text-ink-800">
            <input type="checkbox" checked={selected} onChange={onSelect} className="h-4 w-4 accent-[#0F766E]" /> Compare
          </label>
          <TimeAgo date={p.shared_at} prefix="Shared " className="text-[12px] text-ink-400" />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Link href={brief} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2">
              View brief
              {p.comments ? (
                <span className="inline-flex items-center gap-0.5 text-ink-400">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  {p.comments}
                </span>
              ) : null}
            </Link>
            {p.decision === "Pending" && <DecisionActions applicationId={p.application_id} name={p.name} size="sm" />}
          </div>
        </div>
      </div>
    </li>
  );
}

function CompareTable({ profiles, jobId }: { profiles: SharedProfile[]; jobId: string }) {
  const rows: { label: string; render: (p: SharedProfile) => React.ReactNode }[] = [
    { label: "Match", render: (p) => <MatchRing value={p.match} size={44} label={null} /> },
    { label: "Current role", render: (p) => p.current_designation ?? "—" },
    { label: "Experience", render: (p) => years(p.total_experience) },
    { label: "Notice", render: (p) => (p.serving_notice ? "Serving notice" : noticeLabel(p.notice_period_days)) },
    { label: "Expected CTC", render: (p) => lpa(p.expected_ctc) },
    { label: "Location", render: (p) => p.current_city ?? "—" },
    { label: "Education", render: (p) => (p.education[0] ? [p.education[0].degree, p.education[0].institute].filter(Boolean).join(", ") : (p.highest_qualification ?? "—")) },
    {
      label: "Top skills",
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.skills.slice(0, 5).map((s) => (
            <SkillChip key={s.name} name={s.name} years={s.years} />
          ))}
        </div>
      ),
    },
    { label: "Status", render: (p) => <Chip tone={decisionChip(p).tone}>{decisionChip(p).label}</Chip> },
  ];
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead>
          <tr>
            <th className="w-28" />
            {profiles.map((p) => (
              <th key={p.application_id} className="px-2 pb-3 align-bottom">
                <Avatar name={p.name} size={40} />
                <Link href={`/client/jobs/${jobId}/profiles/${p.application_id}`} className="mt-1.5 block font-semibold text-ink-900 hover:text-jade-700">
                  {p.name}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="py-2.5 pr-2 text-[12px] font-medium text-ink-400">
                {r.label}
              </th>
              {profiles.map((p) => (
                <td key={p.application_id} className="px-2 py-2.5 align-top text-ink-800">
                  {r.render(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Decision, interviews (with feedback) and final result for one shared profile — used on the candidate brief page */
export function ProfileWorkflow({ p }: { p: SharedProfile }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "select" | "notselect" | { feedback: ClientInterview }>(null);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const canFinal = p.decision === "Approved" && p.stage === "Interview";

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(ok);
    setDialog(null);
    setFeedback("");
    setRating(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {p.decision === "Pending" && (
        <div className="rounded-2xl border border-saffron/40 bg-saffron-50/60 p-4">
          <p className="text-[14px] font-semibold text-ink-900">Your decision</p>
          <p className="mb-3 text-[12.5px] text-ink-600">Approve to interview, or reject with a reason — Synerax uses it to refine the shortlist.</p>
          <DecisionActions applicationId={p.application_id} name={p.name} stretch />
        </div>
      )}
      {canFinal && (
        <div className="rounded-2xl border border-jade/30 bg-jade-50/50 p-4">
          <p className="text-[14px] font-semibold text-ink-900">Final result</p>
          <p className="mb-3 text-[12.5px] text-ink-600">Done with the interviews? Let Synerax know the outcome.</p>
          <div className="flex gap-2 [&>*]:flex-1">
            <Button variant="secondary" onClick={() => setDialog("notselect")}>
              Not selected
            </Button>
            <Button onClick={() => setDialog("select")}>
              <Trophy className="h-4 w-4" /> Selected
            </Button>
          </div>
        </div>
      )}
      {p.stage === "Offered" && (
        <p className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-[14px] text-emerald-800 dark:text-emerald-200">
          <Trophy className="h-4 w-4 shrink-0" aria-hidden /> You selected this candidate — Synerax is coordinating the offer and joining.
        </p>
      )}
      {p.stage === "Joined" && (
        <p className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-[14px] text-emerald-800 dark:text-emerald-200">
          <Trophy className="h-4 w-4 shrink-0" aria-hidden /> {p.name} has joined. Congratulations!
        </p>
      )}
      {p.decision === "Rejected" && (p.reject_reason || p.feedback) && (
        <div className="rounded-2xl bg-surface-2 px-4 py-3 text-[13.5px] text-ink-600">
          <p className="font-semibold text-ink-800">You rejected this profile</p>
          <p className="mt-0.5">
            {p.reject_reason}
            {p.feedback ? ` — ${p.feedback}` : ""}
          </p>
        </div>
      )}

      {p.interviews.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-900">Interviews</p>
          <ul className="space-y-2">
            {p.interviews.map((i) => {
              const Icon = MODE_ICON[i.mode] ?? CalendarClock;
              const upcoming = new Date(i.scheduled_at).getTime() > Date.now();
              return (
                <li key={i.id} className="rounded-2xl border border-line p-3.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink-900">{i.round}</p>
                      <p className="text-[12.5px] text-ink-500">
                        {istDate(i.scheduled_at, { weekday: "short", day: "numeric", month: "short" })}, {istTime(i.scheduled_at)} · {i.duration_min} min · {i.mode}
                        {i.location ? ` · ${i.location}` : ""}
                      </p>
                    </div>
                    <Chip tone={i.status === "Completed" ? "emerald" : upcoming ? "violet" : "ink"}>{i.status}</Chip>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:pl-[46px]">
                    {i.meeting_link && upcoming && (
                      <a href={i.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-violet-700">
                        Join meeting <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                    {i.client_feedback ? (
                      <p className="text-[13px] text-ink-600">
                        <span className="inline-flex items-center gap-1 font-medium text-ink-800">
                          Your feedback
                          {i.client_rating ? (
                            <span className="inline-flex items-center gap-0.5 text-saffron-600">
                              <Star className="h-3 w-3 fill-current" aria-hidden />
                              {i.client_rating}/5
                            </span>
                          ) : null}
                          :
                        </span>{" "}
                        {i.client_feedback}
                      </p>
                    ) : (
                      !upcoming && (
                        <button onClick={() => setDialog({ feedback: i })} className="text-[13px] font-semibold text-jade-700 hover:underline">
                          Add interview feedback
                        </button>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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
        description={typeof dialog === "object" && dialog ? `${p.name} · ${dialog.feedback.round} · ${istDate(dialog.feedback.scheduled_at)}` : undefined}
        footer={
          <Button
            loading={busy}
            disabled={!feedback.trim()}
            onClick={() => typeof dialog === "object" && dialog && run(() => portalRpc("client_interview_feedback", { p_interview: dialog.feedback.id, p_feedback: feedback, p_rating: rating }), "Feedback saved")}
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
    </div>
  );
}

type Comment = { id: string; body: string; author_role: "client" | "staff"; author: string; created_at: string; mine: boolean };

/** Conversation with Synerax about one profile */
export function Thread({ applicationId }: { applicationId: string }) {
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
    <div>
      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {items === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-400" aria-label="Loading messages" />
        ) : items.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-3 py-4 text-center text-[13px] text-ink-500">No messages yet — ask Synerax anything about this profile.</p>
        ) : (
          items.map((c) => (
            <div key={c.id} className={cn("flex gap-2", c.mine ? "flex-row-reverse" : "")}>
              <Avatar name={c.mine ? "You" : c.author} size={28} />
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2.5", c.mine ? "rounded-tr-md bg-jade text-white" : "rounded-tl-md border border-line bg-surface text-ink-800")}>
                <p className={cn("text-[11px] font-semibold", c.mine ? "text-white/80" : "text-jade-700")}>
                  {c.mine ? "You" : c.author} · <span suppressHydrationWarning>{relTime(c.created_at)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[13.5px]">{c.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
          rows={2}
          placeholder="Write a message to Synerax… (Ctrl+Enter to send)"
          className="field-input h-auto flex-1 py-2"
          aria-label="Message to Synerax"
        />
        <Button onClick={send} loading={busy} disabled={!text.trim()} aria-label="Send message" className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
