import Link from "next/link";
import { DatabaseBackup, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/misc";
import { cn, fileSize, formatDateTime, timeAgo } from "@/lib/utils";

export const metadata = { title: "Backups" };

type Run = {
  id: number;
  kind: "backup" | "restore_test";
  status: "success" | "failed";
  started_at: string | null;
  finished_at: string;
  size_bytes: number | null;
  location: string | null;
  run_url: string | null;
  details: { error?: string; failed_checks?: string[]; checks?: number; restore_seconds?: number; counts?: Record<string, number> };
};

const badge = (r: Run) =>
  r.status === "success"
    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300"
    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300";
const label = (r: Run) => (r.kind === "restore_test" ? (r.status === "success" ? "PASS" : "FAIL") : r.status === "success" ? "OK" : "Failed");

function Summary({ title, run, icon, empty }: { title: string; run: Run | undefined; icon: React.ReactNode; empty: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-ink-500">
        {icon} {title}
      </div>
      {run ? (
        <>
          <p className="mt-2 text-[22px] font-semibold text-ink-900">{timeAgo(run.finished_at)}</p>
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            {formatDateTime(run.finished_at)}
            {run.size_bytes ? ` · ${fileSize(run.size_bytes)}` : ""}
            {run.details.restore_seconds != null ? ` · restored in ${run.details.restore_seconds}s` : ""}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[14px] text-ink-500">{empty}</p>
      )}
    </Card>
  );
}

export default async function BackupsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("backup_runs").select("*").order("finished_at", { ascending: false }).limit(60);
  const runs = (data ?? []) as Run[];
  const lastBackup = runs.find((r) => r.kind === "backup");
  const lastGoodBackup = runs.find((r) => r.kind === "backup" && r.status === "success");
  const lastPass = runs.find((r) => r.kind === "restore_test" && r.status === "success");
  const stale = !lastGoodBackup || Date.now() - new Date(lastGoodBackup.finished_at).getTime() > 36 * 3600 * 1000;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backups"
        description="Encrypted nightly backups (02:00 IST, kept 30 days in GitHub + Google Drive) and a weekly restore test. See docs/RESTORE.md to restore."
      />
      {stale && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[13.5px] text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          No successful backup in the last 36 hours. Check the “Daily DB backup” workflow in GitHub Actions.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary title="Last backup" run={lastBackup} icon={<DatabaseBackup className="h-4 w-4" />} empty="No backup logged yet" />
        <Summary title="Last successful backup" run={lastGoodBackup} icon={<DatabaseBackup className="h-4 w-4" />} empty="None yet" />
        <Summary title="Last successful restore test" run={lastPass} icon={<ShieldCheck className="h-4 w-4" />} empty="No passing restore test yet" />
      </div>

      <Card>
        <CardHeader title="History" description="Backups and restore tests reported by GitHub Actions." />
        {runs.length === 0 ? (
          <EmptyState icon={<DatabaseBackup />} title="Nothing logged yet" description="Run the “Daily DB backup” workflow once from GitHub → Actions (see README → Backups)." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-5 py-2.5 font-medium">When</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Size</th>
                  <th className="px-3 py-2.5 font-medium">Location / result</th>
                  <th className="px-5 py-2.5 font-medium">Run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {runs.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-2.5 text-ink-700">{formatDateTime(r.finished_at)}</td>
                    <td className="px-3 py-2.5 text-ink-700">{r.kind === "backup" ? "Backup" : "Restore test"}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold", badge(r))}>{label(r)}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular text-ink-600">{r.size_bytes ? fileSize(r.size_bytes) : "—"}</td>
                    <td className="max-w-[420px] px-3 py-2.5 text-ink-600">
                      <span className="break-words">{r.location ?? "—"}</span>
                      {r.kind === "restore_test" && r.details.checks != null && <span className="block text-[12px] text-ink-400">{r.details.checks} checks</span>}
                      {r.details.error && <span className="block text-[12px] text-red-600">{r.details.error}</span>}
                      {r.details.failed_checks?.slice(0, 5).map((c) => (
                        <span key={c} className="block text-[12px] text-red-600">
                          {c}
                        </span>
                      ))}
                    </td>
                    <td className="px-5 py-2.5">
                      {r.run_url ? (
                        <Link href={r.run_url} target="_blank" rel="noopener" className="text-jade-700 hover:underline">
                          Open
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
