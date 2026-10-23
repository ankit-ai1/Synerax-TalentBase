/**
 * Salary form helpers (plain module — usable from server pages and client components).
 * The inputs themselves are in src/components/ui/money-field.tsx.
 */
import { defaultPeriod, type Period } from "./money";

/** form state for a salary (amount kept as text while typing) */
export type MoneyInput = { amount: string; currency: string; period: Period };
export type MoneyRangeInput = { min: string; max: string; currency: string; period: Period };

/** form state from a DB row (falls back to the LPA column for rows saved before multi-currency) */
export function moneyInputFrom(row: Record<string, unknown> | null | undefined, prefix: "current_ctc" | "expected_ctc" | "offered_ctc", fallbackCurrency = "INR"): MoneyInput {
  const amt = row?.[`${prefix}_amount`] ?? row?.[prefix];
  const hasAmount = row?.[`${prefix}_amount`] != null;
  const currency = hasAmount ? String(row?.[`${prefix}_currency`] ?? "INR") : amt != null && amt !== "" ? "INR" : fallbackCurrency;
  const period = (hasAmount ? (row?.[`${prefix}_period`] as Period) : null) ?? (amt != null && amt !== "" ? "annual" : defaultPeriod(currency));
  return { amount: amt == null ? "" : String(amt), currency, period: period === "monthly" ? "monthly" : "annual" };
}
export function rangeInputFrom(job: Record<string, unknown> | null | undefined, fallbackCurrency = "INR"): MoneyRangeInput {
  const has = job?.ctc_min_amount != null || job?.ctc_max_amount != null;
  const min = has ? job?.ctc_min_amount : job?.ctc_min;
  const max = has ? job?.ctc_max_amount : job?.ctc_max;
  const currency = has ? String(job?.ctc_currency ?? "INR") : min != null || max != null ? "INR" : fallbackCurrency;
  const period: Period = has ? (job?.ctc_period === "monthly" ? "monthly" : "annual") : min != null || max != null ? "annual" : defaultPeriod(currency);
  return { min: min == null ? "" : String(min), max: max == null ? "" : String(max), currency, period };
}
const num = (s: string) => (s === "" || s == null ? null : Number(s));
/** RPC / table keys for a salary */
export const moneyPayload = (prefix: "current_ctc" | "expected_ctc" | "offered_ctc", m: MoneyInput) => ({ [`${prefix}_amount`]: num(m.amount), [`${prefix}_currency`]: m.currency, [`${prefix}_period`]: m.period });
export const rangePayload = (r: MoneyRangeInput) => ({ ctc_min_amount: num(r.min), ctc_max_amount: num(r.max), ctc_currency: r.currency, ctc_period: r.period });
