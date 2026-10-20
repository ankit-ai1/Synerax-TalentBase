import Link from "next/link";
import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageTitle } from "@/components/portal-ui/kit";
import { ACTION_LABEL, type ClientMember } from "@/lib/client-labels";
import type { ClientJob } from "@/lib/client-types";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Activity" };

type SP = { member?: string; job?: string; action?: string; from?: string; to?: string };
type Row = { id: number; action: string; created_at: string; actor: string; job_id: string | null; job_title: string | null; details: Record<string, unknown> };

/** client_admin: everything that happened in the company's workspace (filter by member, job, action, date) */
export default async function ClientActivityPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole("client");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: me } = await supabase.rpc("client_me");
  if ((me as { user?: { role?: string } } | null)?.user?.role !== "client_admin") redirect("/client");
  const [{ data }, { data: members }, { data: jobs }] = await Promise.all([
    supabase.rpc("client_activity", { p: { member: sp.member ?? "", job: sp.job ?? "", action: sp.action ?? "", from: sp.from ?? "", to: sp.to ?? "" } }),
    supabase.rpc("client_members"),
    supabase.rpc("client_jobs"),
  ]);
  const rows = (data ?? []) as Row[];
  const detail = (r: Row) => {
    const d = r.details ?? {};
    if (r.action === "member_role_changed") return `${d.from} → ${d.to}`;
    if (r.action === "member_deactivated" && d.transferred_to_name) return `${d.name}: ${d.jobs} job(s), ${d.tasks} task(s) → ${d.transferred_to_name}`;
    if (r.action === "job_transferred" && d.to_name) return `to ${d.to_name}`;
    if (typeof d.title === "string") return d.title;
    if (typeof d.reason === "string") return d.reason;
    if (typeof d.name === "string") return d.name;
    if (d.rating) return `${d.rating}/5`;
    return "";
  };

  return (
    <div className="portal-in">
      <PageTitle eyebrow="Client portal" title="Activity" subtitle="Who did what — jobs, decisions, tasks and team changes." />
      <form className="mb-4 flex flex-wrap items-end gap-2" action="/client/activity">
        <select name="member" defaultValue={sp.member ?? ""} className="field-input h-9 w-auto pr-8 text-[13px]" aria-label="Member">
          <option value="">All members</option>
          {((members ?? []) as ClientMember[]).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select name="job" defaultValue={sp.job ?? ""} className="field-input h-9 w-auto max-w-[220px] pr-8 text-[13px]" aria-label="Job">
          <option value="">All jobs</option>
          {((jobs ?? []) as ClientJob[]).map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        <select name="action" defaultValue={sp.action ?? ""} className="field-input h-9 w-auto pr-8 text-[13px]" aria-label="Action">
          <option value="">All actions</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={sp.from ?? ""} className="field-input h-9 w-auto text-[13px]" aria-label="From" />
        <input type="date" name="to" defaultValue={sp.to ?? ""} className="field-input h-9 w-auto text-[13px]" aria-label="To" />
        <button className="h-9 rounded-lg border border-line px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2">Apply</button>
      </form>
      {rows.length === 0 ? (
        <EmptyState icon={History} title="No activity for these filters" compact />
      ) : (
        <div className="portal-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="text-[11.5px] uppercase tracking-wider text-ink-400">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-3 py-3 font-medium">Who</th>
                <th className="px-3 py-3 font-medium">What</th>
                <th className="px-3 py-3 font-medium">Job</th>
                <th className="px-5 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} data-action={r.action}>
                  <td className="whitespace-nowrap px-5 py-2.5 text-ink-500">{formatDateTime(r.created_at)}</td>
                  <td className="px-3 py-2.5 font-medium text-ink-800">{r.actor}</td>
                  <td className="px-3 py-2.5 text-ink-700">{ACTION_LABEL[r.action] ?? r.action}</td>
                  <td className="px-3 py-2.5">
                    {r.job_id ? (
                      <Link href={`/client/jobs/${r.job_id}`} className="text-jade-700 hover:underline">
                        {r.job_title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-ink-500">{detail(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
