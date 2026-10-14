"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES, PINNED, byIso, flagSrc, formatPhone, parsePhone, phoneError, type Country } from "@/lib/phone";
import { cn } from "@/lib/utils";

const PINNED_LIST = PINNED.map((iso) => COUNTRIES.find((c) => c.iso === iso)!).filter(Boolean);
const REST = COUNTRIES.filter((c) => !PINNED.includes(c.iso));
/** extra words people search with */
const ALIASES: Record<string, string> = { AE: "uae emirates dubai abu dhabi", GB: "uk britain england great britain", US: "usa america", SA: "ksa", KR: "korea", NL: "holland" };

function matches(c: Country, q: string) {
  const s = q.trim().toLowerCase().replace(/^\+/, "");
  if (!s) return true;
  if (/^\d+$/.test(s)) return c.dial.startsWith(s);
  return c.name.toLowerCase().includes(s) || c.iso.toLowerCase() === s || (ALIASES[c.iso] ?? "").includes(s);
}

export function Flag({ iso, className }: { iso: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={flagSrc(iso)} alt="" width={20} height={14} loading="lazy" className={cn("h-3.5 w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10", className)} />;
}

/**
 * Phone number with a searchable country picker (every country; popular ones first).
 * Value: E.164 ("+971501744908"). Shows an inline message under the field when the number isn't valid.
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
  error,
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
  /** message from the server (e.g. "already registered") — shown under the field */
  error?: React.ReactNode;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-countries`;
  const initial = useMemo(() => parsePhone(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [iso, setIso] = useState(initial.iso);
  const [text, setText] = useState(initial.national);
  const [touched, setTouched] = useState(false);
  const emitted = useRef(value);

  // follow outside changes (CV autofill, form reset) — not our own echoes
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    const p = parsePhone(value, iso);
    setIso(p.iso);
    setText(p.national);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (nextIso: string, nextText: string) => {
    const v = formatPhone(nextIso, nextText);
    emitted.current = v;
    onChange(v);
  };

  // ---- picker
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => (q.trim() ? COUNTRIES.filter((c) => matches(c, q)) : [...PINNED_LIST, ...REST]), [q]);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, items.findIndex((c) => c.iso === iso)));
    requestAnimationFrame(() => searchRef.current?.focus());
    const close = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (c: Country) => {
    setIso(c.iso);
    setOpen(false);
    setQ("");
    emit(c.iso, text);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(items.length - 1, a + 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
    else if (e.key === "Enter") (e.preventDefault(), items[active] && pick(items[active]));
    else if (e.key === "Escape") (e.preventDefault(), e.stopPropagation(), setOpen(false));
  };

  const country = byIso(iso);
  const invalid = touched && text ? phoneError(formatPhone(iso, text), iso) : null;
  const message = error || invalid;
  const msgId = `${id}-msg`;

  return (
    <div className={className} ref={wrap}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <div
          className={cn(
            "field-input flex items-stretch gap-0 p-0 focus-within:border-jade/60 focus-within:ring-2 focus-within:ring-jade/15",
            message && "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/15",
            inputClassName
          )}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="relative flex shrink-0 items-center gap-1.5 border-r border-line pl-2.5 pr-6 text-[14px] text-ink-800"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={`Country code: ${country.name} +${country.dial}`}
            title={country.name}
            data-testid="phone-country"
          >
            <Flag iso={country.iso} />
            <span className="whitespace-nowrap">+{country.dial}</span>
            <ChevronDown className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-ink-400" aria-hidden />
          </button>
          <input
            ref={inputRef}
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete={autoComplete}
            required={required}
            value={text}
            maxLength={20}
            aria-invalid={!!message}
            aria-describedby={message ? msgId : undefined}
            placeholder={placeholder ?? (iso === "IN" ? "98765 43210" : "Phone number")}
            onBlur={() => setTouched(true)}
            onChange={(e) => {
              const raw = e.target.value;
              // typed/pasted with a code ("+971…" / "00971…"): switch the country automatically
              if (/^\s*(\+|00)\d/.test(raw)) {
                const p = parsePhone(raw, iso);
                setIso(p.iso);
                setText(p.national);
                return emit(p.iso, p.national);
              }
              const clean = raw.replace(/[^\d\s()-]/g, "");
              setText(clean);
              emit(iso, clean);
            }}
            className="min-w-0 flex-1 appearance-none rounded-r-lg border-0 bg-transparent px-3 text-[14px] text-ink-900 shadow-none outline-none ring-0 placeholder:text-ink-400 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-pop" data-testid="phone-picker">
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder="Search country or code"
                aria-label="Search country or code"
                aria-controls={listId}
                aria-activedescendant={items[active] ? `${listId}-${items[active].iso}` : undefined}
                className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-400 focus:ring-0"
              />
            </div>
            <ul ref={listRef} id={listId} role="listbox" aria-label="Countries" className="max-h-64 overflow-y-auto overscroll-contain py-1" data-lenis-prevent>
              {items.length === 0 && <li className="px-3 py-2 text-[13px] text-ink-500">No country found</li>}
              {items.map((c, i) => (
                <li key={c.iso} role="presentation">
                  {!q.trim() && i === PINNED_LIST.length && <div className="mx-3 my-1 border-t border-line" />}
                  <button
                    type="button"
                    role="option"
                    id={`${listId}-${c.iso}`}
                    aria-selected={c.iso === iso}
                    data-idx={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(c)}
                    className={cn("flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13.5px] text-ink-800", i === active && "bg-surface-2", c.iso === iso && "font-semibold")}
                  >
                    <Flag iso={c.iso} />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="text-ink-500">+{c.dial}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {name && <input type="hidden" name={name} value={formatPhone(iso, text)} />}
      {message ? (
        <p id={msgId} className="mt-1 text-xs text-red-600" role="alert" data-testid="phone-error">
          {message}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>
      )}
    </div>
  );
}

/** for uncontrolled forms (FormData): keeps its own state and submits through a hidden input */
export function PhoneInput(props: Omit<React.ComponentProps<typeof PhoneField>, "value" | "onChange"> & { name: string; defaultValue?: string }) {
  const [v, setV] = useState(props.defaultValue ?? "");
  return <PhoneField {...props} value={v} onChange={setV} />;
}
