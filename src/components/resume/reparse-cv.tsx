"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, ScanText, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/utils";
import { isEmptyValue, reparseCandidateCv, type ResumeFields } from "@/lib/resume/client";
import { suggestionsFrom, type CvKey, type CvSuggestion } from "./cv-autofill";
import { FromCvBadge } from "./cv-ui";

const same = (a: unknown, b: unknown) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/**
 * Staff "Re-parse CV": reads the candidate's current CV again, refreshes the stored CV text
 * (used by search) and shows what the CV says. Values are only written when staff choose to.
 */
export function ReparseCvButton({ candidateId, current }: { candidateId: string; current: Partial<Record<CvKey, unknown>> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ fields: ResumeFields; warnings: string[] } | null>(null);
  const [vals, setVals] = useState(current);
  const [applying, setApplying] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    const r = await reparseCandidateCv(candidateId);
    setBusy(false);
    setVals(current);
    setRes({ fields: r.fields, warnings: r.warnings });
  }

  async function apply(list: CvSuggestion[], tag: string) {
    if (!list.length) return;
    setApplying(tag);
    const patch = Object.fromEntries(list.map((s) => [s.key, s.value === "" ? null : s.value]));
    const supabase = createClient();
    const { error } = await supabase.from("candidates").update(patch).eq("id", candidateId);
    if (!error) await supabase.rpc("refresh_candidate_search", { p_id: candidateId });
    setApplying(null);
    if (error) return toast.error(friendlyError(error.message));
    setVals((v) => ({ ...v, ...patch }));
    toast.success(list.length === 1 ? `${list[0].label} updated` : `${list.length} fields filled from the CV`);
    router.refresh();
  }

  const sugg = res ? suggestionsFrom(res.fields, { noticeAsOption: true }) : [];
  const empty = sugg.filter((s) => isEmptyValue(vals[s.key]));
  const diffs = sugg.filter((s) => !isEmptyValue(vals[s.key]) && !same(vals[s.key], s.value));

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink-800 shadow-card hover:bg-canvas disabled:opacity-60"
        title="Read the current CV again and refresh CV search"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ScanText className="h-4 w-4" aria-hidden />}
        {busy ? "Reading CV…" : "Re-parse CV"}
      </button>

      {res && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-10" role="dialog" aria-modal="true" aria-label="Re-parse CV" onClick={() => setRes(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold text-ink-900">What the CV says</h2>
                <p className="text-[13px] text-ink-500">CV text re-indexed for search. Nothing on the profile changes unless you choose it below.</p>
              </div>
              <button type="button" onClick={() => setRes(null)} className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-2 hover:text-ink-800" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {res.warnings.map((w) => (
              <p key={w} className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
                {w}
              </p>
            ))}

            {empty.length > 0 && (
              <div className="mt-5">
                <p className="text-[13px] font-semibold text-ink-900">Empty on the profile ({empty.length})</p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {empty.map((s) => (
                    <li key={s.key} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px]">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11.5px] text-ink-400">{s.label}</span>
                        <span className="block truncate font-medium text-ink-800">{s.display}</span>
                      </span>
                      <FromCvBadge confidence={s.confidence} label="From CV" />
                    </li>
                  ))}
                </ul>
                <button type="button" disabled={!!applying} onClick={() => apply(empty, "empty")} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-jade px-3.5 text-[13px] font-semibold text-white hover:bg-[rgb(var(--jade-hover))] disabled:opacity-60">
                  {applying === "empty" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />} Fill empty fields
                </button>
              </div>
            )}

            {diffs.length > 0 && (
              <div className="mt-5">
                <p className="text-[13px] font-semibold text-ink-900">Different from the profile</p>
                <ul className="mt-1 divide-y divide-line">
                  {diffs.map((s) => (
                    <li key={s.key} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">
                      <span className="w-36 shrink-0 text-ink-500">{s.label}</span>
                      <span className="min-w-0 flex-1">
                        <span className="text-ink-800">{String(vals[s.key])}</span>
                        <span className="ml-2 text-ink-500">
                          CV says: <b className="font-semibold text-jade-700">{s.display}</b>
                        </span>
                      </span>
                      <button type="button" disabled={!!applying} onClick={() => apply([s], s.key)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-jade/40 px-3 text-[12.5px] font-semibold text-jade-700 hover:bg-jade-50">
                        {applying === s.key && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Use this
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {res.fields.skills?.value.length ? (
              <p className="mt-5 text-[12.5px] text-ink-600">
                <span className="font-semibold text-ink-800">Skills in the CV:</span> {res.fields.skills.value.join(", ")}
              </p>
            ) : null}
            {!empty.length && !diffs.length && !res.warnings.length && <p className="mt-5 text-[13px] text-ink-600">The profile already matches the CV.</p>}
          </div>
        </div>
      )}
    </>
  );
}
