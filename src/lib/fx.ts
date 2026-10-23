import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { CURRENCIES } from "@/lib/money";

/**
 * Daily exchange rates (INR per 1 unit of each currency) → exchange_rates.auto_rate, then the INR-annual
 * equivalents of every non-INR salary are recomputed (fx_recompute).
 *  1) ECB reference rates via Frankfurter (≈30 major currencies)
 *  2) open.er-api.com (ExchangeRate-API's free feed) for the rest — incl. AED, SAR, QAR, OMR, KWD, BHD
 * If both fail, the admin-editable manual rates are used (fx_rate() falls back after 3 days).
 */
const KNOWN = new Set(CURRENCIES.map((c) => c.code));

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000), headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/** pure: { code: units per 1 INR } → { code: INR per unit } (rounded, sane values only) */
export function invertRates(perInr: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const [code, r] of Object.entries(perInr)) {
    const c = code.toUpperCase();
    if (c === "INR" || !KNOWN.has(c) || !(r > 0) || !Number.isFinite(r)) continue;
    out[c] = Math.round((1 / r) * 1e8) / 1e8;
  }
  return out;
}

export async function refreshRates() {
  const rows = new Map<string, { rate: number; source: string }>();
  const errors: string[] = [];
  try {
    const ecb = (await getJson("https://api.frankfurter.dev/v1/latest?base=INR")) as { rates?: Record<string, number>; date?: string };
    for (const [c, rate] of Object.entries(invertRates(ecb.rates ?? {}))) rows.set(c, { rate, source: `ECB ${ecb.date ?? ""}`.trim() });
  } catch (e) {
    errors.push(`ECB: ${e instanceof Error ? e.message : e}`);
  }
  try {
    const er = (await getJson("https://open.er-api.com/v6/latest/INR")) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
    if (er.result !== "success") throw new Error("not successful");
    for (const [c, rate] of Object.entries(invertRates(er.rates ?? {}))) if (!rows.has(c)) rows.set(c, { rate, source: "ExchangeRate-API" });
  } catch (e) {
    errors.push(`ExchangeRate-API: ${e instanceof Error ? e.message : e}`);
  }
  const db = createAdminClient();
  const now = new Date().toISOString();
  if (rows.size) {
    const payload = [...rows].map(([currency, r]) => ({ currency, auto_rate: r.rate, auto_source: r.source, auto_at: now }));
    for (let i = 0; i < payload.length; i += 200) {
      const { error } = await db.from("exchange_rates").upsert(payload.slice(i, i + 200), { onConflict: "currency" });
      if (error) errors.push(error.message);
    }
  }
  const { data: recomputed, error } = await db.rpc("fx_recompute");
  if (error) errors.push(error.message);
  return { updated: rows.size, recomputed, errors };
}
