"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/phone-field";
import { CURRENCIES, PINNED_CURRENCIES } from "@/lib/money";
import { cn, formatDateTime, friendlyError } from "@/lib/utils";

export type RateRow = { currency: string; auto_rate: number | null; auto_source: string | null; auto_at: string | null; manual_rate: number | null; manual_at: string | null };

const FRESH_MS = 3 * 86400e3;
const fmt = (n: number | null | undefined) => (n == null ? "—" : Number(n) >= 100 ? Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }) : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 4 }));

export function RatesTable({ rows }: { rows: RateRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const by = useMemo(() => new Map(rows.map((r) => [r.currency, r])), [rows]);
  const list = CURRENCIES.filter((c) => c.code !== "INR")
    .filter((c) => (all || q ? true : PINNED_CURRENCIES.includes(c.code)))
    .filter((c) => !q || `${c.code} ${c.name} ${c.aliases ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(PINNED_CURRENCIES.includes(b.code)) - Number(PINNED_CURRENCIES.includes(a.code)) || PINNED_CURRENCIES.indexOf(a.code) - PINNED_CURRENCIES.indexOf(b.code) || a.code.localeCompare(b.code));

  async function refresh() {
    setBusy("refresh");
    const res = await fetch("/api/admin/fx/refresh", { method: "POST" }).catch(() => null);
    const j = (await res?.json().catch(() => ({}))) as { updated?: number; recomputed?: Record<string, number>; errors?: string[] };
    setBusy(null);
    if (!res?.ok) return toast.error(j.errors?.[0] ?? "Could not fetch rates");
    const n = Object.values(j.recomputed ?? {}).reduce((a, b) => a + b, 0);
    toast.success(`${j.updated} rates updated · ${n} salary equivalent${n === 1 ? "" : "s"} recalculated`);
    router.refresh();
  }
  async function saveManual(code: string) {
    const v = (edits[code] ?? "").trim();
    const rate = v === "" ? null : Number(v);
    if (rate != null && !(rate > 0)) return toast.error("Enter a positive number (₹ per 1 unit), or leave empty");
    setBusy(code);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("exchange_rates").upsert({ currency: code, manual_rate: rate, manual_at: new Date().toISOString(), updated_by: user?.id ?? null }, { onConflict: "currency" });
    setBusy(null);
    if (error) return toast.error(friendlyError(error.message));
    setEdits((e) => ({ ...e, [code]: undefined as unknown as string }));
    toast.success(rate == null ? `Manual rate for ${code} removed` : `Manual rate for ${code} saved — salaries update at the next refresh`);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search currency" aria-label="Search currency" className="field-input h-8 w-48 text-[13px]" />
        <label className="inline-flex items-center gap-1.5 text-[13px] text-ink-600">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show all currencies
        </label>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={refresh} loading={busy === "refresh"} data-testid="fx-refresh">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh rates now
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13px]" data-testid="fx-rates">
          <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
            <tr className="border-y border-line">
              <th className="px-5 py-2.5 font-medium">Currency</th>
              <th className="px-3 py-2.5 text-right font-medium">Automatic</th>
              <th className="px-3 py-2.5 font-medium">Source</th>
              <th className="px-3 py-2.5 font-medium">Manual fallback</th>
              <th className="px-5 py-2.5 text-right font-medium">In use</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((c) => {
              const r = by.get(c.code);
              const fresh = r?.auto_rate != null && r.auto_at && Date.now() - new Date(r.auto_at).getTime() < FRESH_MS;
              const used = fresh ? r!.auto_rate : r?.manual_rate ?? r?.auto_rate ?? null;
              const usedFrom = fresh ? "automatic" : r?.manual_rate != null ? "manual" : r?.auto_rate != null ? "automatic (stale)" : null;
              const edit = edits[c.code] ?? (r?.manual_rate != null ? String(r.manual_rate) : "");
              return (
                <tr key={c.code}>
                  <td className="px-5 py-2">
                    <span className="flex items-center gap-2">
                      <Flag iso={c.countries[0]} />
                      <span className="w-10 font-semibold text-ink-900">{c.code}</span>
                      <span className="text-ink-500">{c.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular">{fmt(r?.auto_rate)}</td>
                  <td className="px-3 py-2 text-[12px] text-ink-500">{r?.auto_at ? `${r.auto_source ?? ""} · ${formatDateTime(r.auto_at)}` : "—"}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <input
                        value={edit}
                        onChange={(e) => setEdits((x) => ({ ...x, [c.code]: e.target.value.replace(/[^\d.]/g, "") }))}
                        inputMode="decimal"
                        placeholder="₹ per 1"
                        aria-label={`Manual rate for ${c.code}`}
                        className="field-input h-8 w-28 text-[13px] tabular"
                      />
                      {edits[c.code] !== undefined && (
                        <Button size="xs" onClick={() => saveManual(c.code)} loading={busy === c.code}>
                          Save
                        </Button>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-2 text-right">
                    <span className="tabular font-semibold text-ink-900">{fmt(used)}</span>
                    {usedFrom && <span className={cn("block text-[11px]", usedFrom === "automatic" ? "text-emerald-700" : "text-amber-700")}>{usedFrom}</span>}
                    {!usedFrom && <span className="block text-[11px] text-red-600">no rate — add a manual one</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
