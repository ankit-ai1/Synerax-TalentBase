import Link from "next/link";
import { Briefcase, ChevronRight, Inbox, MapPin, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClientJob } from "@/lib/client-types";
import { JobStatusBadge } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My jobs" };

export default async function ClientJobsPage() {
  await requireRole("client");
  const supabase = await createClient();
  const { data } = await supabase.rpc("client_jobs");
  const jobs = (data ?? []) as ClientJob[];
  const active = jobs.filter((j) => ["Pending review", "Open", "On Hold", "Draft"].includes(j.status));
  const closed = jobs.filter((j) => !active.includes(j));

  const List = ({ items }: { items: ClientJob[] }) => (
    <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      {items.map((j) => (
        <li key={j.id}>
          <Link href={`/client/jobs/${j.id}`} className="group flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-surface-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-[15.5px] font-semibold text-ink-900 group-hover:text-jade-700">{j.title}</p>
                <JobStatusBadge status={j.status} />
              </div>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-ink-500">
                <span className="font-mono text-[12px] text-ink-400">{j.job_code}</span>
                {(j.locations.length > 0 || j.work_mode) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden /> {[j.locations.join(", "), j.work_mode].filter(Boolean).join(" · ")}
                  </span>
                )}
                <span>
                  {j.openings} opening{j.openings === 1 ? "" : "s"}
                </span>
                <span>Posted {formatDate(j.created_at)}</span>
              </p>
            </div>
            <div className="flex items-center gap-5 text-center">
              <div>
                <p className="text-[18px] font-semibold tabular text-ink-900">{j.shared}</p>
                <p className="text-[11px] text-ink-400">Shared</p>
              </div>
              <div>
                <p className={j.pending_decision ? "text-[18px] font-semibold tabular text-saffron-600" : "text-[18px] font-semibold tabular text-ink-900"}>{j.pending_decision}</p>
                <p className="text-[11px] text-ink-400">To review</p>
              </div>
              <div>
                <p className="text-[18px] font-semibold tabular text-ink-900">{j.joined}</p>
                <p className="text-[11px] text-ink-400">Hired</p>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-300" aria-hidden />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900">My jobs</h1>
          <p className="mt-1 text-[15px] text-ink-500">Every role you&apos;ve shared with Synerax and the profiles we&apos;ve sent.</p>
        </div>
        <Link href="/client/jobs/new" className="inline-flex h-11 items-center gap-2 rounded-xl bg-jade px-5 text-[14.5px] font-semibold text-white shadow-glow hover:brightness-110">
          <Plus className="h-4 w-4" aria-hidden /> Post a job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line-strong p-10 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-ink-300" aria-hidden />
          <p className="mt-3 text-[15px] font-medium text-ink-800">No jobs yet</p>
          <p className="mt-1 text-sm text-ink-500">Post your first requirement — Synerax reviews it and starts sourcing.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              <Inbox className="h-4 w-4" aria-hidden /> Active ({active.length})
            </h2>
            {active.length ? <List items={active} /> : <p className="text-sm text-ink-500">No active jobs.</p>}
          </section>
          {closed.length > 0 && (
            <section>
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-400">Closed ({closed.length})</h2>
              <List items={closed} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
