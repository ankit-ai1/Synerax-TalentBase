"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, CalendarClock, CalendarPlus, ChevronDown, ClipboardList, ExternalLink, Trophy } from "lucide-react";
import { toast } from "sonner";
import { portalRpc } from "@/lib/portal-rpc";
import { PORTAL_STEPS, type MyApplication } from "@/lib/portal-types";
import { ApplicationProgress } from "@/components/portal/ui";
import { Chip, DateBlock, EmptyState, MODE_ICON, istDate, istDateTime, istTime, relTime } from "@/components/portal-ui/kit";
import { ContactRow } from "@/components/portal-ui/team-card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { cn, friendlyError } from "@/lib/utils";

type Tab = "active" | "interviews" | "offers" | "closed";
const TABS: { id: Tab; label: string; match: (a: MyApplication) => boolean }[] = [
  { id: "active", label: "Active", match: (a) => !a.withdrawn && a.step >= 0 && a.step < 4 },
  { id: "interviews", label: "Interviews", match: (a) => !a.withdrawn && a.step === 3 },
  { id: "offers", label: "Offers", match: (a) => !a.withdrawn && a.step >= 4 },
  { id: "closed", label: "Closed", match: (a) => a.withdrawn || a.step < 0 },
];

const toCal = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function ApplicationsList({ apps, initialTab }: { apps: MyApplication[]; initialTab?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>((TABS.find((t) => t.id === initialTab)?.id as Tab) ?? "active");
  const [open, setOpen] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<MyApplication | null>(null);
  const [busy, setBusy] = useState(false);
  const list = apps.filter(TABS.find((t) => t.id === tab)!.match);

  async function withdraw() {
    if (!withdrawing) return;
    setBusy(true);
    const { error } = await portalRpc("candidate_withdraw", { p_application: withdrawing.id });
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success("Application withdrawn");
    setWithdrawing(null);
    router.refresh();
  }

  return (
    <>
      <div className="mb-5 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Application status">
        {TABS.map((t) => {
          const n = apps.filter(t.match).length;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-medium transition-colors",
                tab === t.id ? "bg-ink-900 text-surface shadow-card dark:bg-surface-3 dark:text-ink-900" : "text-ink-500 hover:bg-surface-3 hover:text-ink-900"
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular", tab === t.id ? "bg-white/15 dark:bg-surface" : "bg-surface-3")}>{n}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={tab === "offers" ? Trophy : tab === "interviews" ? CalendarClock : tab === "closed" ? Archive : ClipboardList}
          title={tab === "offers" ? "No offers yet" : tab === "interviews" ? "No interviews right now" : tab === "closed" ? "Nothing closed" : "No active applications"}
          text={tab === "active" ? "Find a role that fits and apply in one click." : "Keep applying — your recruiter will update you at every step."}
          action={tab === "active" ? { href: "/portal/jobs", label: "Find jobs" } : undefined}
        />
      ) : (
        <ul className="space-y-4">
          {list.map((a) => {
            const expanded = open === a.id;
            const closed = a.withdrawn || a.step < 0;
            const upcoming = a.interviews.filter((i) => new Date(i.scheduled_at).getTime() > Date.now() - 3600e3);
            const timeline = [
              ...(a.history ?? [{ step: 0, at: a.applied_at }]).map((h) => ({ at: h.at, label: h.step === 0 ? (a.origin === "Candidate applied" ? "You applied" : "Synerax put you forward") : `Moved to ${PORTAL_STEPS[h.step]}` })),
              ...a.interviews.map((i) => ({ at: i.scheduled_at, label: `${i.round} interview (${i.mode})` })),
              ...(closed && a.closed_at ? [{ at: a.closed_at, label: a.withdrawn ? "You withdrew" : "Not selected this time" }] : []),
            ].sort((x, y) => x.at.localeCompare(y.at));
            return (
              <li key={a.id} className="portal-card overflow-hidden">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/portal/jobs/${a.job_id}`} className="text-[17px] font-semibold text-ink-900 hover:text-jade-700">
                        {a.job_title}
                      </Link>
                      <p className="mt-0.5 text-[13px] text-ink-500">
                        {a.company}
                        {a.locations.length > 0 && ` · ${a.locations.slice(0, 2).join(", ")}`}
                        {a.work_mode && ` · ${a.work_mode}`}
                      </p>
                      <p className="mt-1 text-[12px] text-ink-400" suppressHydrationWarning>
                        {a.origin === "Candidate applied" ? "Applied" : "Put forward by Synerax"} {istDate(a.applied_at)} · updated {relTime(a.updated_at)}
                      </p>
                    </div>
                    <Chip tone={closed ? "ink" : a.step >= 4 ? "emerald" : a.step === 3 ? "violet" : a.step === 2 ? "sky" : "jade"} pulse={!closed && a.step === 3}>
                      {a.status_label}
                    </Chip>
                  </div>

                  {!closed && (
                    <div className="mt-5">
                      <ApplicationProgress app={a} />
                    </div>
                  )}
                  {a.step < 0 && !a.withdrawn && (
                    <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-[14px] text-ink-600">
                      Thank you for your interest. The employer has decided not to move forward this time — we&apos;ll keep your profile in mind for other roles.
                    </p>
                  )}

                  {upcoming.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {upcoming.map((i) => {
                        const Icon = MODE_ICON[i.mode] ?? CalendarClock;
                        const end = new Date(new Date(i.scheduled_at).getTime() + i.duration_min * 60000).toISOString();
                        return (
                          <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-50/60 p-3 dark:bg-violet-400/5">
                            <DateBlock date={i.scheduled_at} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-semibold text-ink-900">{i.round} interview</p>
                              <p className="flex items-center gap-1.5 text-[12.5px] text-ink-600">
                                <Icon className="h-3.5 w-3.5 text-violet-500" aria-hidden /> {istTime(i.scheduled_at)} · {i.duration_min} min · {i.mode}
                                {i.location ? ` · ${i.location}` : ""}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {i.meeting_link && (
                                <a href={i.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-700">
                                  Join <ExternalLink className="h-3 w-3" aria-hidden />
                                </a>
                              )}
                              <a
                                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${i.round} — ${a.job_title}`)}&dates=${toCal(i.scheduled_at)}/${toCal(end)}${i.location ? `&location=${encodeURIComponent(i.location)}` : ""}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] font-medium text-ink-700 hover:bg-surface-2"
                              >
                                <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> Calendar
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/50 px-5 py-2.5 sm:px-6">
                  <button onClick={() => setOpen(expanded ? null : a.id)} aria-expanded={expanded} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-700 hover:bg-surface-3">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden />
                    {expanded ? "Hide timeline" : "Full timeline"}
                  </button>
                  {a.can_withdraw && (
                    <button onClick={() => setWithdrawing(a)} className="ml-auto rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-500 hover:text-red-600">
                      Withdraw
                    </button>
                  )}
                </div>
                {expanded && (
                  <div className="grid grid-cols-1 gap-6 border-t border-line px-5 py-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_300px]">
                    <ol className="relative space-y-4 border-l border-line pl-5">
                      {timeline.map((t, i) => (
                        <li key={i} className="relative">
                          <span className={cn("absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-surface", i === timeline.length - 1 ? "bg-jade" : "bg-line-strong")} aria-hidden />
                          <p className="text-[13.5px] font-medium text-ink-800">{t.label}</p>
                          <p className="text-[12px] text-ink-400" suppressHydrationWarning>
                            {istDateTime(t.at)}
                          </p>
                        </li>
                      ))}
                    </ol>
                    {a.recruiter && (
                      <div className="rounded-2xl border border-line p-4">
                        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-400">Your recruiter for this role</p>
                        <ContactRow person={a.recruiter} message={`Hi ${a.recruiter.name.split(" ")[0]}, about my application for ${a.job_title}…`} />
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        onConfirm={withdraw}
        loading={busy}
        danger
        title="Withdraw this application?"
        description={`You'll be removed from consideration for ${withdrawing?.job_title ?? "this role"}. You can apply again later if the job is still open.`}
        confirmLabel="Withdraw"
      />
    </>
  );
}
