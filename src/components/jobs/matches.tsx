"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, RefreshCw, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, Card, EmptyState, ScoreRing, Skeleton, StatusBadge } from "@/components/ui/misc";
import { Checkbox } from "@/components/ui/interactive";
import { cn, friendlyError, lpa, noticeLabel, years } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const PARTS: { key: string; label: string; weight: string }[] = [
  { key: "skill", label: "Skills", weight: "50%" },
  { key: "experience", label: "Experience", weight: "20%" },
  { key: "ctc", label: "Budget", weight: "10%" },
  { key: "notice", label: "Notice", weight: "10%" },
  { key: "location", label: "Location", weight: "10%" },
];

export function Matches({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<any[] | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [min, setMin] = useState(0);

  const load = async () => {
    setItems(null);
    const { data, error } = await createClient().rpc("match_candidates", { p_job: jobId, p_limit: 60 });
    if (error) {
      toast.error(friendlyError(error.message));
      setItems([]);
      return;
    }
    setItems((data as any[]) ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function add(ids: string[]) {
    setAdding(true);
    const { data, error } = await createClient().rpc("add_to_job", { p_job: jobId, p_candidates: ids, p_stage: "Sourced" });
    setAdding(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(`${data} candidate(s) added to pipeline`);
    setItems((l) => (l ?? []).filter((x) => !ids.includes(x.id)));
    setSel([]);
    router.refresh();
  }

  const shown = (items ?? []).filter((x) => x.fit.score >= min);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-jade/25 bg-gradient-to-r from-jade-50 to-transparent p-4 sm:flex-row sm:items-center">
        <Sparkles className="h-5 w-5 shrink-0 text-jade-700" />
        <p className="flex-1 text-sm text-ink-700">
          Candidates in the database are scored against this job's skills, experience, budget, notice and location. Those already in the pipeline, or marked Placed/Blacklisted, are not shown.
        </p>
        <div className="flex items-center gap-2">
          <select value={min} onChange={(e) => setMin(Number(e.target.value))} className="field-input h-8 w-auto pr-8 text-[13px]" aria-label="Minimum score">
            <option value={0}>All scores</option>
            <option value={50}>50+ score</option>
            <option value={70}>70+ score</option>
            <option value={85}>85+ score</option>
          </select>
          <Button variant="secondary" size="sm" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {sel.length > 0 && (
        <div className="sticky top-16 z-10 mb-3 flex items-center justify-between rounded-xl border border-line bg-ink-900 px-4 py-2.5 text-surface shadow-pop">
          <span className="text-sm font-medium">{sel.length} selected</span>
          <div className="flex gap-2">
            <button onClick={() => setSel([])} className="rounded-md px-2.5 py-1 text-xs text-surface/70 hover:text-surface">
              Clear
            </button>
            <Button size="sm" onClick={() => add(sel)} loading={adding}>
              <Plus className="h-3.5 w-3.5" /> Add to pipeline
            </Button>
          </div>
        </div>
      )}

      {items === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="No matching candidates found"
            description="Add skills or a role category to the job, or add more candidates to the database."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((c) => {
            const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
            const on = sel.includes(c.id);
            return (
              <div
                key={c.id}
                className={cn(
                  "grid gap-4 rounded-xl border bg-surface p-4 shadow-card transition-colors lg:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto]",
                  on ? "border-jade ring-1 ring-jade" : "border-line"
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox checked={on} onChange={(v) => setSel((s) => (v ? [...s, c.id] : s.filter((x) => x !== c.id)))} label={`${name} select`} />
                  <ScoreRing value={c.fit.score} size={52} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Avatar name={name} size="xs" />
                    <Link href={`/candidates/${c.id}`} className="font-semibold text-ink-900 hover:text-jade-700">
                      {name}
                    </Link>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-ink-500">{c.headline || [c.current_designation, c.current_company].filter(Boolean).join(" @ ")}</p>
                  <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-500">
                    <span>{years(c.total_experience)}</span>
                    <span>
                      {lpa(c.current_ctc)} → {lpa(c.expected_ctc)}
                    </span>
                    <span>{noticeLabel(c.notice_period_days)}</span>
                    {c.current_city && <span>{c.current_city}</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(c.fit.matched ?? []).map((s: string) => (
                      <span key={s} className="rounded-md bg-saffron-50 px-1.5 py-0.5 text-[11px] font-medium text-saffron-800 ring-1 ring-inset ring-saffron/40">
                        {s}
                      </span>
                    ))}
                    {(c.fit.missing ?? []).map((s: string) => (
                      <span key={s} className="rounded-md px-1.5 py-0.5 text-[11px] text-ink-400 line-through decoration-ink-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2 self-center lg:grid-cols-1 lg:gap-1">
                  {PARTS.map((p) => {
                    const v = Number(c.fit[p.key] ?? 0);
                    return (
                      <div key={p.key} className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-2" title={`${p.label} (${p.weight}): ${v}`}>
                        <span className="w-16 text-[10.5px] text-ink-400">{p.label}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                          <div className={cn("h-full rounded-full", v >= 80 ? "bg-jade" : v >= 50 ? "bg-saffron" : "bg-red-400")} style={{ width: `${v}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center lg:justify-end">
                  <Button size="sm" variant="soft" onClick={() => add([c.id])} disabled={adding}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
