"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bookmark,
  Briefcase,
  CalendarPlus,
  CheckSquare,
  ExternalLink,
  MessageCircle,
  Phone,
  Printer,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { staffEvent } from "@/lib/portal-rpc";
import { useDialogs } from "@/components/dialogs/provider";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, EmptyState, ScoreRing, StageBadge } from "@/components/ui/misc";
import { Checkbox, Menu, MenuItem } from "@/components/ui/interactive";
import { InterviewRow } from "@/components/interviews/interviews-view";
import { ACTIVE_STAGES, STAGES, STAGE_STYLE } from "@/lib/constants";
import { cn, dayLabel, formatDate, formatTime, friendlyError, lpa, timeAgo } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Cand = { id: string; first_name: string; last_name: string | null; phone: string | null; email: string | null };

export function CandidateQuickActions({ c }: { c: Cand }) {
  const d = useDialogs();
  const name = `${c.first_name} ${c.last_name ?? ""}`.trim();
  const opt = { id: c.id, label: name };
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="soft" size="sm" onClick={() => d.openAddToJob([c.id])}>
        <Briefcase className="h-3.5 w-3.5" /> Add to job
      </Button>
      <Button variant="secondary" size="sm" onClick={() => d.openInterview({ candidate: opt })}>
        <CalendarPlus className="h-3.5 w-3.5" /> Interview
      </Button>
      <Button variant="secondary" size="sm" onClick={() => d.openMessage({ candidates: [c] })}>
        <MessageCircle className="h-3.5 w-3.5" /> Message
      </Button>
      {c.phone && (
        <a href={`tel:${c.phone}`} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink-800 shadow-card hover:bg-surface-2">
          <Phone className="h-3.5 w-3.5" /> Call
        </a>
      )}
      <Button variant="secondary" size="sm" onClick={() => d.openTask({ candidate: opt })}>
        <CheckSquare className="h-3.5 w-3.5" /> Follow-up
      </Button>
      <Button variant="secondary" size="sm" onClick={() => d.openShortlist([c.id])}>
        <Bookmark className="h-3.5 w-3.5" /> Shortlist
      </Button>
      <LinkButton href={`/print/candidates/${c.id}`} variant="secondary" size="sm" target="_blank">
        <Printer className="h-3.5 w-3.5" /> Client profile
      </LinkButton>
    </div>
  );
}

const NEEDS_DIALOG = ["Rejected", "Dropped", "Offered", "Joined"];

export function CandidateJobs({ cand, apps }: { cand: Cand; apps: any[] }) {
  const router = useRouter();
  const d = useDialogs();
  const name = `${cand.first_name} ${cand.last_name ?? ""}`.trim();

  async function move(a: any, to: string) {
    if (a.stage === to) return;
    if (NEEDS_DIALOG.includes(to)) return d.openStage({ applicationId: a.id, candidateName: name, from: a.stage, to });
    const { error } = await createClient().from("applications").update({ stage: to }).eq("id", a.id);
    if (error) return toast.error(friendlyError(error.message));
    staffEvent("stage", a.id);
    toast.success(`${a.job.title}: ${to}`);
    router.refresh();
  }

  if (apps.length === 0)
    return (
      <Card>
        <EmptyState
          icon={<Briefcase className="h-5 w-5" />}
          title="Not in any job pipeline"
          description="Add this candidate to an open job — the match score is calculated automatically."
          action={
            <Button onClick={() => d.openAddToJob([cand.id])}>
              <Briefcase className="h-4 w-4" /> Add to job
            </Button>
          }
        />
      </Card>
    );

  return (
    <div className="space-y-3">
      {apps.map((a) => {
        const stageIdx = STAGES.indexOf(a.stage);
        const closed = a.stage === "Rejected" || a.stage === "Dropped";
        const next = (a.interviews ?? []).filter((i: any) => i.status === "Scheduled" && new Date(i.scheduled_at) > new Date()).sort((x: any, y: any) => x.scheduled_at.localeCompare(y.scheduled_at))[0];
        return (
          <Card key={a.id} className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {a.match_score != null && <ScoreRing value={a.match_score} size={44} />}
                <div className="min-w-0">
                  <Link href={`/jobs/${a.job.id}`} className="font-semibold text-ink-900 hover:text-jade-700">
                    {a.job.title}
                  </Link>
                  <p className="truncate text-[13px] text-ink-500">
                    {a.job.client?.name ?? "Internal"} · added {timeAgo(a.created_at)}
                    {a.owner?.full_name && ` by ${a.owner.full_name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StageBadge stage={a.stage} />
                <Menu
                  width="w-48"
                  trigger={({ toggle }) => (
                    <Button variant="secondary" size="sm" onClick={toggle}>
                      Change stage
                    </Button>
                  )}
                >
                  {(close) =>
                    STAGES.map((s) => (
                      <MenuItem key={s} icon={<span className={cn("block h-2 w-2 rounded-full", STAGE_STYLE[s].dot)} />} onClick={() => (close(), move(a, s))} disabled={s === a.stage}>
                        {s}
                      </MenuItem>
                    ))
                  }
                </Menu>
                <Button variant="ghost" size="icon-sm" onClick={() => d.openInterview({ applicationId: a.id, job: { id: a.job.id, label: a.job.title }, candidate: { id: cand.id, label: name } })} aria-label="Schedule interview" title="Schedule interview">
                  <CalendarPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* stage progress */}
            {!closed && (
              <div className="mt-4 flex items-center gap-1">
                {ACTIVE_STAGES.map((s, i) => (
                  <div key={s} className="flex-1">
                    <div className={cn("h-1.5 rounded-full", i <= stageIdx ? STAGE_STYLE[s].dot : "bg-surface-3")} />
                    <p className={cn("mt-1 hidden text-[10.5px] sm:block", i === stageIdx ? "font-medium text-ink-800" : "text-ink-400")}>{s}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-500">
              {next && (
                <span className="font-medium text-violet-700 dark:text-violet-300">
                  Next: {next.round_name}, {dayLabel(next.scheduled_at)} {formatTime(next.scheduled_at)}
                </span>
              )}
              {a.offered_ctc && <span className="font-medium text-saffron-800">Offered {lpa(a.offered_ctc)}</span>}
              {a.expected_joining && <span>Expected joining {formatDate(a.expected_joining)}</span>}
              {a.joined_at && <span className="font-medium text-emerald-700 dark:text-emerald-300">Joined {formatDate(a.joined_at)}</span>}
              {a.rejection_reason && <span className="text-red-600 dark:text-red-400">Reason: {a.rejection_reason}</span>}
              <span>In this stage since {timeAgo(a.stage_changed_at)}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function CandidateInterviews({ interviews, cand }: { interviews: any[]; cand: Cand }) {
  const d = useDialogs();
  if (interviews.length === 0)
    return (
      <Card>
        <EmptyState
          icon={<CalendarPlus className="h-5 w-5" />}
          title="No interviews yet"
          action={
            <Button onClick={() => d.openInterview({ candidate: { id: cand.id, label: `${cand.first_name} ${cand.last_name ?? ""}` } })}>
              <CalendarPlus className="h-4 w-4" /> Schedule interview
            </Button>
          }
        />
      </Card>
    );
  return (
    <Card className="divide-y divide-line overflow-hidden">
      {interviews.map((i) => (
        <div key={i.id}>
          <p className="bg-surface-2 px-4 py-1.5 text-[11.5px] font-medium text-ink-500">{formatDate(i.scheduled_at, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
          <InterviewRow i={i} />
        </div>
      ))}
    </Card>
  );
}

export function CandidateTasks({ tasks, cand }: { tasks: any[]; cand: Cand }) {
  const router = useRouter();
  const d = useDialogs();
  const opt = { id: cand.id, label: `${cand.first_name} ${cand.last_name ?? ""}` };
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-sm font-semibold text-ink-900">Follow-ups</p>
        <Button size="sm" variant="soft" onClick={() => d.openTask({ candidate: opt })}>
          <CheckSquare className="h-3.5 w-3.5" /> New
        </Button>
      </div>
      {tasks.length === 0 ? (
        <EmptyState compact title="No follow-ups" description="Call-backs, document collection — all reminders live here." />
      ) : (
        <ul className="divide-y divide-line">
          {tasks.map((t) => {
            const overdue = t.status === "Open" && t.due_at && new Date(t.due_at) < new Date();
            return (
              <li key={t.id} className="group flex items-start gap-3 px-5 py-3">
                <Checkbox
                  checked={t.status === "Done"}
                  className="mt-0.5 rounded-full"
                  onChange={async (v) => {
                    await createClient().from("tasks").update({ status: v ? "Done" : "Open", done_at: v ? new Date().toISOString() : null }).eq("id", t.id);
                    router.refresh();
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", t.status === "Done" ? "text-ink-400 line-through" : "text-ink-900")}>{t.title}</p>
                  <p className={cn("text-xs", overdue ? "text-red-600 dark:text-red-400" : "text-ink-400")}>
                    {t.due_at ? `${dayLabel(t.due_at)}, ${formatTime(t.due_at)}` : "No due date"}
                    {t.assignee?.full_name && ` · ${t.assignee.full_name}`}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await createClient().from("tasks").delete().eq("id", t.id);
                    router.refresh();
                  }}
                  className="rounded p-1 text-ink-300 opacity-0 hover:text-red-600 group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function ShortlistChips({ lists }: { lists: { id: string; name: string }[] }) {
  if (!lists.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {lists.map((l) => (
        <Link key={l.id} href={`/shortlists/${l.id}`} className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-2 py-0.5 text-xs text-ink-600 hover:text-ink-900">
          <Bookmark className="h-3 w-3" /> {l.name}
          <ExternalLink className="h-2.5 w-2.5 opacity-50" />
        </Link>
      ))}
    </div>
  );
}
