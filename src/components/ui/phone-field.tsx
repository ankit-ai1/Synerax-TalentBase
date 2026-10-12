"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { COUNTRIES, PINNED, byIso, flag, formatPhone, parsePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const ordered = (() => {
  const pinned = PINNED.map((iso) => COUNTRIES.find((c) => c.iso === iso)!).filter(Boolean);
  return { pinned, rest: COUNTRIES.filter((c) => !PINNED.includes(c.iso)) };
})();

/**
 * Phone number with a country-code dropdown (every country; India first).
 * Value format: Indian numbers stay 10 digits ("9876543210"); others are "+971 501234567".
 */
export function PhoneField({
  label,
  value,
  onChange,
  required,
  hint,
  className,
  placeholder,
  name,
  inputClassName,
  id: idProp,
  autoComplete = "tel-national",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
  className?: string;
  placeholder?: string;
  /** also render a hidden input with this name (for plain HTML forms) */
  name?: string;
  inputClassName?: string;
  id?: string;
  autoComplete?: string;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const parsed = useMemo(() => parsePhone(value), [value]);
  const [iso, setIso] = useState(parsed.iso);
  // follow outside changes (e.g. a CV autofill) unless the user picked a country with the same code
  useEffect(() => {
    if (byIso(iso).dial !== byIso(parsed.iso).dial) setIso(parsed.iso);
  }, [parsed.iso]); // eslint-disable-line react-hooks/exhaustive-deps
  const country = byIso(iso);
  const national = parsed.national;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className={cn("field-input flex items-stretch gap-0 p-0 focus-within:border-jade/60 focus-within:ring-2 focus-within:ring-jade/15", inputClassName)}>
        <label className="relative flex shrink-0 items-center border-r border-line pl-2.5 pr-6 text-[14px] text-ink-800" title={country.name}>
          <span className="sr-only">Country code</span>
          <span aria-hidden className="pointer-events-none whitespace-nowrap">
            <span className="mr-1">{flag(country.iso)}</span>+{country.dial}
          </span>
          <ChevronDown className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-ink-400" aria-hidden />
          <select
            value={iso}
            onChange={(e) => {
              setIso(e.target.value);
              onChange(formatPhone(e.target.value, national));
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Country code"
          >
            <optgroup label="Popular">
              {ordered.pinned.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {flag(c.iso)} {c.name} (+{c.dial})
                </option>
              ))}
            </optgroup>
            <optgroup label="All countries">
              {ordered.rest.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {flag(c.iso)} {c.name} (+{c.dial})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          required={required}
          value={national}
          maxLength={16}
          placeholder={placeholder ?? (iso === "IN" ? "98765 43210" : "Phone number")}
          onChange={(e) => {
            const raw = e.target.value;
            // pasted with a code ("+971…" / "00971…"): switch the country automatically
            if (/^\s*(\+|00)/.test(raw)) {
              const p = parsePhone(raw);
              setIso(p.iso);
              return onChange(formatPhone(p.iso, p.national));
            }
            onChange(formatPhone(iso, raw));
          }}
          className="min-w-0 flex-1 appearance-none rounded-r-lg border-0 bg-transparent px-3 text-[14px] text-ink-900 shadow-none outline-none ring-0 placeholder:text-ink-400 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      {name && <input type="hidden" name={name} value={formatPhone(iso, national)} />}
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

/** for uncontrolled forms (FormData): keeps its own state and submits through a hidden input */
export function PhoneInput(props: Omit<React.ComponentProps<typeof PhoneField>, "value" | "onChange"> & { name: string; defaultValue?: string }) {
  const [v, setV] = useState(props.defaultValue ?? "");
  return <PhoneField {...props} value={v} onChange={setV} />;
}
