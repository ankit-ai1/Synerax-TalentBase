"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  ClipboardCheck,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Video,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDialogs } from "@/components/dialogs/provider";
import { Avatar, Card, EmptyState, ResultBadge, Stars } from "@/components/ui/misc";
import { Menu, MenuItem, Segmented } from "@/components/ui/interactive";
import { cn, dayLabel, formatTime, friendlyError, istDateKey, todayIST } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const MODE_ICON: Record<string, React.ReactNode> = {
  Video: <Video className="h-3.5 w-3.5" />,
  Phone: <Phone className="h-3.5 w-3.5" />,
  "In-person": <MapPin className="h-3.5 w-3.5" />,
};

export function InterviewsView({ interviews, meId }: { interviews: any[]; meId: string }) {
  const [tab, setTab] = useState<"upcoming" | "feedback" | "past">("upcoming");
  const [who, setWho] = useState("all");
  const now = Date.now();

  const base = useMemo(() => interviews.filter((i) => who === "all" || i.created_by === meId), [interviews, who, meId]);
  const upcoming = base.filter((i) => i.status === "Scheduled" && new Date(i.scheduled_at).getTime() + i.duration_min * 60e3 >= now);
  const feedback = base.filter((i) => (i.status === "Scheduled" && new Date(i.scheduled_at).getTime() + i.duration_min * 60e3 < now) || (i.status === "Completed" && i.result === "Pending"));
  const past = base.filter((i) => !upcoming.includes(i) && !feedback.includes(i)).reverse();
  const list = tab === "upcoming" ? upcoming : tab === "feedback" ? feedback : past;

  // next 7 days density
  const today = todayIST();
  const week = Array.from({ length: 7 }, (_, d) => {
    const dt = new Date(Date.parse(today + "T00:00:00Z") + d * 86400e3);
    const key = dt.toISOString().slice(0, 10);
    return { key, label: d === 0 ? "Today" : dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }), day: dt.getUTCDate(), n: upcoming.filter((i) => istDateKey(i.scheduled_at) === key).length };
  });
  const maxN = Math.max(1, ...week.map((w) => w.n));

  const groups: { key: string; items: any[] }[] = [];
  for (const i of list) {
    const k = istDateKey(i.scheduled_at);
    let g = groups.find((x) => x.key === k);
    if (!g) groups.push((g = { key: k, items: [] }));
    g.items.push(i);
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-7 gap-2">
        {week.map((w, i) => (
          <div key={w.key} className={cn("rounded-xl border bg-surface p-3 shadow-card", i === 0 ? "border-jade/50" : "border-line")}>
            <p className={cn("text-[11.5px]", i === 0 ? "font-medium text-jade-700" : "text-ink-400")}>{w.label}</p>
            <p className="text-lg font-semibold leading-tight tabular text-ink-900">{w.day}</p>
            <div className="mt-2 flex h-6 items-end gap-0.5">
              {Array.from({ length: Math.min(w.n, 8) }).map((_, k) => (
                <span key={k} className="w-1.5 rounded-sm bg-violet-500" style={{ height: `${40 + (60 * (k + 1)) / Math.max(maxN, 1)}%` }} />
              ))}
              {w.n === 0 && <span className="text-[11px] text-ink-300">—</span>}
            </div>
            <p className="mt-1 text-[11px] text-ink-500">{w.n ? `${w.n} interview${w.n > 1 ? "s" : ""}` : "Free"}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: <>Upcoming <Count n={upcoming.length} /></> },
            { value: "feedback", label: <>Feedback pending <Count n={feedback.length} warn /></> },
            { value: "past", label: <>Past <Count n={past.length} /></> },
          ]}
        />
        <Segmented
          size="sm"
          className="ml-auto"
          value={who}
          onChange={setWho}
          options={[
            { value: "all", label: "Everyone's" },
            { value: "mine", label: "Scheduled by me" },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={tab === "feedback" ? <ClipboardCheck className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
            title={tab === "upcoming" ? "No upcoming interviews" : tab === "feedback" ? "All feedback is filled in" : "No past interviews"}
            description={tab === "upcoming" ? "Schedule a candidate's interview from the job pipeline." : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-ink-700">
                {dayLabel(g.key + "T06:30:00Z")}
                <span className="text-xs font-normal text-ink-400">
                  {new Date(g.key + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "UTC" })}
                </span>
              </h3>
              <Card className="divide-y divide-line overflow-hidden">
                {g.items.map((i) => (
                  <InterviewRow key={i.id} i={i} />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Count({ n, warn }: { n: number; warn?: boolean }) {
  return <span className={cn("rounded-full px-1.5 text-[11px] tabular", warn && n ? "bg-saffron text-[#3A2503]" : "bg-surface-3 text-ink-500")}>{n}</span>;
}

export function InterviewRow({ i, compact }: { i: any; compact?: boolean }) {
  const router = useRouter();
  const d = useDialogs();
  const c = i.application.candidate;
  const name = `${c.first_name} ${c.last_name ?? ""}`.trim();
  const start = new Date(i.scheduled_at);
  const live = Date.now() >= start.getTime() - 10 * 60e3 && Date.now() <= start.getTime() + i.duration_min * 60e3 && i.status === "Scheduled";
  const needsFeedback = (i.status === "Scheduled" && start.getTime() + i.duration_min * 60e3 < Date.now()) || (i.status === "Completed" && i.result === "Pending");

  async function cancel() {
    if (!confirm("Cancel this interview?")) return;
    const { error } = await createClient().from("interviews").update({ status: "Cancelled" }).eq("id", i.id);
    if (error) return toast.error(friendlyError(error.message));
    toast.success("Interview cancelled");
    router.refresh();
  }

  return (
    <div className={cn("flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center", live && "bg-violet-50/60 dark:bg-violet-400/5")}>
      <div className="flex w-28 shrink-0 items-center gap-3 sm:block">
        <p className="text-[15px] font-semibold tabular text-ink-900">{formatTime(i.scheduled_at)}</p>
        <p className="flex items-center gap-1 text-xs text-ink-400">
          {MODE_ICON[i.mode]} {i.mode} · {i.duration_min}m
        </p>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm">
            <Link href={`/candidates/${c.id}`} className="font-semibold text-ink-900 hover:text-jade-700">
              {name}
            </Link>
            <span className="text-ink-400"> · Round {i.round_no}: {i.round_name}</span>
          </p>
          <p className="truncate text-xs text-ink-500">
            <Link href={`/jobs/${i.application.job.id}`} className="hover:underline">
              {i.application.job.title}
            </Link>
            {i.application.job.client?.name && ` — ${i.application.job.client.name}`}
            {i.interviewers && ` · with ${i.interviewers}`}
          </p>
          {!compact && i.feedback && <p className="mt-1 line-clamp-1 text-xs text-ink-500">“{i.feedback}”</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {i.rating ? <Stars value={i.rating} size={12} /> : null}
        {i.status === "Cancelled" || i.status === "No-show" ? (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-400/10 dark:text-stone-300">{i.status}</span>
        ) : i.result !== "Pending" ? (
          <ResultBadge result={i.result} />
        ) : null}
        {live && i.meeting_link && (
          <a href={i.meeting_link} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-xs font-medium text-white hover:bg-violet-700">
            <Video className="h-3.5 w-3.5" /> Join
          </a>
        )}
        {needsFeedback && (
          <button onClick={() => d.openFeedback(i.id)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-saffron-50 px-3 text-xs font-medium text-saffron-800 ring-1 ring-inset ring-saffron/50 hover:bg-saffron-100">
            <ClipboardCheck className="h-3.5 w-3.5" /> Give feedback
          </button>
        )}
        <Menu
          width="w-52"
          trigger={({ toggle }) => (
            <button onClick={toggle} className="rounded-md p-1.5 text-ink-400 hover:bg-surface-3 hover:text-ink-800" aria-label="Options">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => (close(), d.openFeedback(i.id))}>
                Feedback / result
              </MenuItem>
              <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => (close(), d.openInterview({ id: i.id }))}>
                Reschedule / edit
              </MenuItem>
              <MenuItem
                icon={<MessageCircle className="h-4 w-4" />}
                onClick={() =>
                  (close(),
                  d.openMessage({
                    candidates: [c],
                    vars: {
                      job_title: i.application.job.title,
                      round: i.round_name,
                      interview_date: start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
                      interview_time: formatTime(i.scheduled_at),
                      meeting_link: i.meeting_link ? `Link: ${i.meeting_link}` : "",
                    },
                  }))
                }
              >
                Message candidate
              </MenuItem>
              {i.status === "Scheduled" && (
                <MenuItem danger icon={<XCircle className="h-4 w-4" />} onClick={() => (close(), cancel())}>
                  Cancel interview
                </MenuItem>
              )}
            </>
          )}
        </Menu>
      </div>
    </div>
  );
}
