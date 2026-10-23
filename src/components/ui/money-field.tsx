"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES } from "@/lib/phone";
import { CURRENCIES, PINNED_CURRENCIES, currencyOf, defaultPeriod, hintLpa, searchCurrencies, toLpa, type Currency, type Period } from "@/lib/money";
import { Flag } from "./phone-field";
import { cn } from "@/lib/utils";

/** form state for a salary (amount kept as text while typing) */
export type MoneyInput = { amount: string; currency: string; period: Period };
export type MoneyRangeInput = { min: string; max: string; currency: string; period: Period };

const COUNTRY_NAME = new Map(COUNTRIES.map((c) => [c.iso, c.name]));
const countryName = (iso: string) => (iso === "EU" ? "European Union" : COUNTRY_NAME.get(iso) ?? "");
const PINNED = PINNED_CURRENCIES.map((c) => currencyOf(c));
const REST = CURRENCIES.filter((c) => !PINNED_CURRENCIES.includes(c.code)).sort((a, b) => a.name.localeCompare(b.name));

// ---------------------------------------------------------------- rates (INR per unit) for the "≈ ₹X LPA" hint
let ratesCache: Promise<Record<string, number>> | null = null;
function loadRates() {
  ratesCache ??= (async () => {
    try {
      const { data } = await createClient().from("exchange_rates").select("currency, auto_rate, auto_at, manual_rate");
      const out: Record<string, number> = { INR: 1 };
      const fresh = Date.now() - 3 * 86400e3;
      for (const r of data ?? []) {
        const auto = r.auto_rate != null && r.auto_at && new Date(r.auto_at).getTime() > fresh ? Number(r.auto_rate) : null;
        const v = auto ?? (r.manual_rate != null ? Number(r.manual_rate) : r.auto_rate != null ? Number(r.auto_rate) : null);
        if (v) out[r.currency] = v;
      }
      return out;
    } catch {
      return { INR: 1 };
    }
  })();
  return ratesCache;
}
export function useRates() {
  const [rates, setRates] = useState<Record<string, number>>({ INR: 1 });
  useEffect(() => {
    let live = true;
    loadRates().then((r) => live && setRates(r));
    return () => {
      live = false;
    };
  }, []);
  return rates;
}

// ---------------------------------------------------------------- currency picker
export function CurrencySelect({ value, onChange, className, label = "Currency" }: { value: string; onChange: (code: string) => void; className?: string; label?: string }) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const items: Currency[] = useMemo(() => (q.trim() ? searchCurrencies(q, countryName) : [...PINNED, ...REST]), [q]);
  const cur = currencyOf(value);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, items.findIndex((c) => c.code === cur.code)));
    requestAnimationFrame(() => searchRef.current?.focus());
    const close = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (c: Currency) => {
    onChange(c.code);
    setOpen(false);
    setQ("");
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(items.length - 1, a + 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
    else if (e.key === "Enter") (e.preventDefault(), items[active] && pick(items[active]));
    else if (e.key === "Escape") (e.preventDefault(), e.stopPropagation(), setOpen(false));
  };

  return (
    <div className={cn("relative", className)} ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-full w-full items-center gap-1.5 pl-2.5 pr-6 text-[14px] text-ink-800"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${cur.name} (${cur.code})`}
        title={cur.name}
        data-testid="currency-select"
      >
        <Flag iso={cur.countries[0]} />
        <span className="font-medium">{cur.code}</span>
        <ChevronDown className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-ink-400" aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-pop" data-testid="currency-picker">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search: dirham, AED, UAE…"
              aria-label="Search currency by name, code or country"
              aria-controls={listId}
              aria-activedescendant={items[active] ? `${listId}-${items[active].code}` : undefined}
              className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-400 focus:ring-0"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" aria-label="Currencies" className="max-h-64 overflow-y-auto overscroll-contain py-1" data-lenis-prevent>
            {items.length === 0 && <li className="px-3 py-2 text-[13px] text-ink-500">No currency found</li>}
            {items.map((c, i) => (
              <li key={c.code} role="presentation">
                {!q.trim() && i === PINNED.length && <div className="mx-3 my-1 border-t border-line" />}
                <button
                  type="button"
                  role="option"
                  id={`${listId}-${c.code}`}
                  aria-selected={c.code === cur.code}
                  data-idx={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(c)}
                  className={cn("flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13.5px] text-ink-800", i === active && "bg-surface-2", c.code === cur.code && "font-semibold")}
                >
                  <Flag iso={c.countries[0]} />
                  <span className="w-10 shrink-0 font-medium">{c.code}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-600">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div role="radiogroup" aria-label="Pay period" className="flex shrink-0 items-center gap-0.5 border-l border-line px-1">
      {(["annual", "monthly"] as const).map((p) => (
        <button key={p} type="button" role="radio" aria-checked={value === p} onClick={() => onChange(p)} className={cn("rounded-md px-2 py-1 text-[12.5px] font-medium", value === p ? "bg-jade-50 text-jade-700" : "text-ink-500 hover:text-ink-800")} data-testid={`period-${p}`}>
          {p === "annual" ? "Annual" : "Monthly"}
        </button>
      ))}
    </div>
  );
}

const unitHint = (m: { currency: string; period: Period }) => (m.currency === "INR" && m.period === "annual" ? "in lakhs per year (LPA)" : `${currencyOf(m.currency).code} per ${m.period === "monthly" ? "month" : "year"}`);
const placeholderFor = (m: { currency: string; period: Period }) => (m.currency === "INR" && m.period === "annual" ? "e.g. 12.5" : m.currency === "INR" ? "e.g. 50000" : m.period === "monthly" ? "e.g. 30000" : "e.g. 90000");

/** when the currency changes, pick its usual period (Gulf → monthly, others → annual) */
const withCurrency = <T extends { currency: string; period: Period }>(v: T, code: string): T => ({ ...v, currency: code, period: defaultPeriod(code) });

/**
 * Salary input: amount + currency (searchable, flags, popular first) + Annual / Monthly.
 * INR + Annual is entered in lakhs (12.5 = ₹12.5 LPA) like before; everything else in plain units.
 */
export function MoneyField({ label, value, onChange, required, hint, className, error, name }: { label?: string; value: MoneyInput; onChange: (v: MoneyInput) => void; required?: boolean; hint?: string; className?: string; error?: string; name?: string }) {
  const id = useId();
  const rates = useRates();
  const amount = value.amount === "" ? null : Number(value.amount);
  const lpa = amount != null && Number.isFinite(amount) && !(value.currency === "INR" && value.period === "annual") ? toLpa({ amount, currency: value.currency, period: value.period }, rates) : null;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className={cn("field-input flex items-stretch gap-0 p-0 focus-within:border-jade/60 focus-within:ring-2 focus-within:ring-jade/15", error && "border-red-400")}>
        <CurrencySelect value={value.currency} onChange={(c) => onChange(withCurrency(value, c))} className="shrink-0 border-r border-line" />
        <input
          id={id}
          name={name}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          required={required}
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
          placeholder={placeholderFor(value)}
          aria-describedby={`${id}-hint`}
          className="min-w-0 flex-1 appearance-none border-0 bg-transparent px-3 text-[14px] text-ink-900 shadow-none outline-none ring-0 placeholder:text-ink-400 focus:ring-0"
          data-testid="money-amount"
        />
        <PeriodToggle value={value.period} onChange={(p) => onChange({ ...value, period: p })} />
      </div>
      <p id={`${id}-hint`} className={cn("mt-1 text-xs", error ? "text-red-600" : "text-ink-400")}>
        {error ?? (
          <>
            {hint ?? unitHint(value)}
            {lpa != null && <span className="ml-1 font-medium text-ink-600" data-testid="money-hint">≈ {hintLpa(lpa)}</span>}
          </>
        )}
      </p>
    </div>
  );
}

/** budget range: min + max sharing one currency and period */
export function MoneyRangeField({ label, value, onChange, className, hint }: { label?: string; value: MoneyRangeInput; onChange: (v: MoneyRangeInput) => void; className?: string; hint?: string }) {
  const id = useId();
  const rates = useRates();
  const conv = (s: string) => (s === "" || (value.currency === "INR" && value.period === "annual") ? null : toLpa({ amount: Number(s), currency: value.currency, period: value.period }, rates));
  const lo = conv(value.min), hi = conv(value.max);
  const input = "min-w-0 flex-1 appearance-none border-0 bg-transparent px-3 text-[14px] text-ink-900 shadow-none outline-none ring-0 placeholder:text-ink-400 focus:ring-0";
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <div className="field-input flex items-stretch gap-0 p-0 focus-within:border-jade/60 focus-within:ring-2 focus-within:ring-jade/15">
        <CurrencySelect value={value.currency} onChange={(c) => onChange(withCurrency(value, c))} className="shrink-0 border-r border-line" />
        <input id={id} type="number" inputMode="decimal" min={0} step="any" value={value.min} onChange={(e) => onChange({ ...value, min: e.target.value })} placeholder="Min" aria-label="Minimum" className={input} data-testid="money-min" />
        <span className="self-center text-ink-400" aria-hidden>
          –
        </span>
        <input type="number" inputMode="decimal" min={0} step="any" value={value.max} onChange={(e) => onChange({ ...value, max: e.target.value })} placeholder="Max" aria-label="Maximum" className={input} data-testid="money-max" />
        <PeriodToggle value={value.period} onChange={(p) => onChange({ ...value, period: p })} />
      </div>
      <p className="mt-1 text-xs text-ink-400">
        {hint ?? unitHint(value)}
        {(lo != null || hi != null) && (
          <span className="ml-1 font-medium text-ink-600">
            ≈ {[lo, hi].filter((x) => x != null).map((x) => hintLpa(x)!.replace(/ LPA$/, "")).join("–")} LPA
          </span>
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- helpers for forms
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
