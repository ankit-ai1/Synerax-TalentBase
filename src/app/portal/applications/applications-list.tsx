"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ExternalLink, MapPin, Phone, Video } from "lucide-react";
import { toast } from "sonner";
import { portalRpc } from "@/lib/portal-rpc";
import type { MyApplication } from "@/lib/portal-types";
import { StageTracker } from "@/components/portal/ui";
import { ConfirmDialog } from "@/components/ui/dialog";
import { cn, dayLabel, formatDate, formatTime, friendlyError } from "@/lib/utils";

const MODE_ICON = { Video, Phone, "In-person": MapPin } as Record<string, typeof Video>;

export function ApplicationsList({ apps }: { apps: MyApplication[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "closed">("active");
  const [withdrawing, setWithdrawing] = useState<MyApplication | null>(null);
  const [busy, setBusy] = useState(false);

  const active = apps.filter((a) => a.step >= 0 && !a.withdrawn);
  const closed = apps.filter((a) => a.step < 0 || a.withdrawn);
  const list = tab === "active" ? active : closed;

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
      <div className="mb-5 inline-flex rounded-xl border border-line bg-surface-2 p-1" role="tablist" aria-label="Application status">
        {(
          [
            ["active", `Active (${active.length})`],
            ["closed", `Closed (${closed.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("rounded-lg px-4 py-2 text-[14px] font-medium", tab === k ? "bg-surface text-ink-900 shadow-card" : "text-ink-500 hover:text-ink-800")}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong p-8 text-center text-sm text-ink-500">
          {tab === "active" ? "No active applications." : "Nothing here yet."}
        </p>
      ) : (
        <ul className="space-y-4">
          {list.map((a) => (
            <li key={a.id} className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/portal/jobs/${a.job_id}`} className="text-[17px] font-semibold text-ink-900 hover:text-jade-700">
                    {a.job_title}
                  </Link>
                  <p className="mt-0.5 text-[13.5px] text-ink-500">
                    {a.company}
                    {a.locations.length > 0 && ` · ${a.locations.slice(0, 2).join(", ")}`}
                    {a.work_mode && ` · ${a.work_mode}`}
                  </p>
                  <p className="mt-1 text-[12px] text-ink-400">
                    {a.origin === "Candidate applied" ? "Applied" : "Put forward by Synerax"} on {formatDate(a.applied_at)} · Updated {formatDate(a.updated_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold",
                    a.step < 0 || a.withdrawn ? "bg-surface-3 text-ink-500" : a.step >= 4 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-jade-50 text-jade-700"
                  )}
                >
                  {a.status_label}
                </span>
              </div>

              {a.step >= 0 && !a.withdrawn && (
                <div className="mt-5">
                  <StageTracker step={a.step} label={a.status_label} />
                </div>
              )}
              {a.step < 0 && !a.withdrawn && (
                <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-[14px] text-ink-600">
                  Thank you for your interest. The employer has decided not to move forward this time — we&apos;ll keep your profile in mind for other roles.
                </p>
              )}

              {a.interviews.length > 0 && (
                <div className="mt-5 space-y-2">
                  {a.interviews.map((i) => {
                    const Icon = MODE_ICON[i.mode] ?? CalendarClock;
                    return (
                      <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-50/60 px-4 py-3 dark:bg-violet-400/5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-ink-900">{i.round} interview</p>
                          <p className="text-[13px] text-ink-600">
                            {dayLabel(i.scheduled_at)}, {formatTime(i.scheduled_at)} · {i.duration_min} min · {i.mode}
                            {i.location ? ` · ${i.location}` : ""}
                          </p>
                        </div>
                        {i.meeting_link && (
                          <a href={i.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-violet-700">
                            Join <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {a.can_withdraw && (
                <div className="mt-4 flex justify-end">
                  <button onClick={() => setWithdrawing(a)} className="text-[13px] font-medium text-ink-500 hover:text-red-600">
                    Withdraw application
                  </button>
                </div>
              )}
            </li>
          ))}
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
