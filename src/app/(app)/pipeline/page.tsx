import Link from "next/link";
import { Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, PageHeader, StageBadge } from "@/components/ui/misc";
import { FilterChip } from "@/components/ui/filter-chip";
import { STAGES } from "@/lib/constants";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";

export const metadata = { title: "Active pipeline" };

type Row = {
  id: string;
  stage: string;
  stage_changed_at: string;
  updated_at: string;
  owner: { id: string; full_name: string } | null;
  candidate: { id: string; first_name: string; last_name: string | null; current_designation: string | null } | null;
  job: { id: string; title: string; job_code: string; client: { id: string; name: string } | null } | null;
};

type SP = { job?: string; client?: string; stage?: string; owner?: string; group?: string };

/**
 * Every active application in OPEN jobs (not withdrawn, not Joined / Rejected / Dropped).
 * Rows come from active_pipeline() — the same definition as the dashboard's "Active pipeline" card.
 */
export default async function PipelinePage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("active_pipeline")
    .select(
      "id, stage, stage_changed_at, updated_at, owner:profiles!applications_owner_id_fkey(id, full_name), candidate:candidates(id, first_name, last_name, current_designation), job:jobs(id, title, job_code, client:clients(id, name))"
    )
    .order("stage_changed_at", { ascending: true });
  const all = (data ?? []) as unknown as Row[];

  // filter options from the full set
  const uniq = <T,>(xs: (T | null | undefined)[], key: (x: T) => string) => [...new Map(xs.filter(Boolean).map((x) => [key(x as T), x as T])).values()];
  const jobs = uniq(all.map((r) => r.job), (j) => j.id).sort((a, b) => a.title.localeCompare(b.title));
  const clients = uniq(all.map((r) => r.job?.client), (c) => c.id).sort((a, b) => a.name.localeCompare(b.name));
  const owners = uniq(all.map((r) => r.owner), (o) => o.id).sort((a, b) => a.full_name.localeCompare(b.full_name));
  const stages = STAGES.filter((s) => all.some((r) => r.stage === s));

  const rows = all.filter(
    (r) =>
      (!sp.job || r.job?.id === sp.job) &&
      (!sp.client || r.job?.client?.id === sp.client) &&
      (!sp.stage || r.stage === sp.stage) &&
      (!sp.owner || (sp.owner === "none" ? !r.owner : r.owner?.id === sp.owner))
  );
  const filtered = !!(sp.job || sp.client || sp.stage || sp.owner);
  const grouped = sp.group === "stage";
  const groups = grouped ? STAGES.map((s) => ({ stage: s, items: rows.filter((r) => r.stage === s) })).filter((g) => g.items.length) : [{ stage: "", items: rows }];
  const days = (d: string) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400e3));
  const qs = (extra: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...extra }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return s ? `/pipeline?${s}` : "/pipeline";
  };

  return (
    <>
      <PageHeader title="Active pipeline" description="Every active application in open jobs — from Applied/Sourced to Offered. Joined, rejected, dropped and withdrawn are not included." />

      <form className="mb-4 flex flex-wrap items-end gap-2" action="/pipeline">
        {grouped && <input type="hidden" name="group" value="stage" />}
        <Select name="job" label="Job" value={sp.job} options={jobs.map((j) => [j.id, `${j.title} · ${j.job_code}`])} />
        <Select name="client" label="Client" value={sp.client} options={clients.map((c) => [c.id, c.name])} />
        <Select name="stage" label="Stage" value={sp.stage} options={stages.map((s) => [s, s])} />
        <Select name="owner" label="Owner" value={sp.owner} options={[...owners.map((o) => [o.id, o.full_name] as [string, string]), ["none", "No owner"]]} />
        <button className="h-9 rounded-md border border-line px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2">Apply</button>
        <div className="ml-auto flex overflow-hidden rounded-lg border border-line text-[13px]" role="group" aria-label="Layout">
          <Link href={qs({ group: undefined })} className={cn("px-3 py-1.5", !grouped ? "bg-surface-2 font-semibold text-ink-900" : "text-ink-500 hover:text-ink-800")} aria-current={!grouped}>
            List
          </Link>
          <Link href={qs({ group: "stage" })} className={cn("border-l border-line px-3 py-1.5", grouped ? "bg-surface-2 font-semibold text-ink-900" : "text-ink-500 hover:text-ink-800")} aria-current={grouped}>
            Group by stage
          </Link>
        </div>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-500">
          <span className="font-semibold tabular text-ink-900" data-total={rows.length}>
            {rows.length}
          </span>{" "}
          active application{rows.length === 1 ? "" : "s"}
          {filtered && <span className="text-ink-400"> (of {all.length})</span>}
        </p>
        {filtered && <FilterChip label="Filters" clearHref={grouped ? "/pipeline?group=stage" : "/pipeline"} />}
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<Users className="h-5 w-5" />} title={filtered ? "No applications match these filters" : "No active applications"} description="Candidates appear here once they are added to an open job." />
        </Card>
      ) : (
        <div className="space-y-5" data-rows={rows.length}>
          {groups.map((g) => (
            <section key={g.stage || "all"}>
              {grouped && (
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-700">
                  <StageBadge stage={g.stage} /> <span className="tabular text-ink-400">{g.items.length}</span>
                </h3>
              )}
              <Card className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-[13px]">
                  <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                    <tr className="border-b border-line">
                      <th className="px-5 py-2.5 font-medium">Candidate</th>
                      <th className="px-3 py-2.5 font-medium">Job</th>
                      <th className="px-3 py-2.5 font-medium">Client</th>
                      <th className="px-3 py-2.5 font-medium">Stage</th>
                      <th className="px-3 py-2.5 text-right font-medium">Days in stage</th>
                      <th className="px-3 py-2.5 font-medium">Last activity</th>
                      <th className="px-5 py-2.5 font-medium">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {g.items.map((r) => {
                      const name = [r.candidate?.first_name, r.candidate?.last_name].filter(Boolean).join(" ");
                      const last = new Date(r.updated_at) > new Date(r.stage_changed_at) ? r.updated_at : r.stage_changed_at;
                      const d = days(r.stage_changed_at);
                      return (
                        <tr key={r.id} className="hover:bg-surface-2" data-row>
                          <td className="px-5 py-2.5">
                            <Link href={`/candidates/${r.candidate?.id}`} className="font-medium text-ink-900 hover:text-jade-700">
                              {name || "—"}
                            </Link>
                            {r.candidate?.current_designation && <span className="block text-[12px] text-ink-400">{r.candidate.current_designation}</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <Link href={`/jobs/${r.job?.id}`} className="text-ink-700 hover:text-jade-700 hover:underline">
                              {r.job?.title}
                            </Link>
                            <span className="block text-[12px] text-ink-400">{r.job?.job_code}</span>
                          </td>
                          <td className="px-3 py-2.5 text-ink-600">{r.job?.client?.name ?? "—"}</td>
                          <td className="px-3 py-2.5">
                            <StageBadge stage={r.stage} />
                          </td>
                          <td className={cn("px-3 py-2.5 text-right tabular", d >= 14 ? "font-semibold text-red-600 dark:text-red-400" : d >= 7 ? "font-medium text-saffron-800" : "text-ink-600")}>{d}</td>
                          <td className="px-3 py-2.5 text-ink-500" title={formatDateTime(last)}>
                            {timeAgo(last)}
                          </td>
                          <td className="px-5 py-2.5 text-ink-600">{r.owner?.full_name ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: [string, string][] }) {
  return (
    <label className="text-[12px] text-ink-500">
      {label}
      <select name={name} defaultValue={value ?? ""} className="field-input mt-1 block h-9 w-auto max-w-[220px] pr-8 text-[13px]">
        <option value="">All</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
