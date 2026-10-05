"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Search…",
}: {
  label: string;
  options: { id: string; name: string; group?: string; aliases?: string[] }[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return options
      .filter((o) => !value.includes(o.id))
      .filter((o) => !s || o.name.toLowerCase().includes(s) || o.aliases?.some((a) => a.toLowerCase().includes(s)))
      .slice(0, 30);
  }, [q, options, value]);

  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && list[0]) {
              e.preventDefault();
              onChange([...value, list[0].id]);
              setQ("");
            }
          }}
          placeholder={placeholder}
          className="field-input h-9 pl-8 text-[13px]"
          aria-label={label}
        />
        {open && list.length > 0 && (
          <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-surface p-1 shadow-pop animate-pop-in">
            {list.map((o) => (
              <button
                key={o.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange([...value, o.id]);
                  setQ("");
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] text-ink-700 hover:bg-canvas"
              >
                {o.name}
                {o.group && <span className="text-[11px] text-ink-400">{o.group}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-md bg-ink-900 py-0.5 pl-2 pr-1 text-xs text-surface">
              {byId.get(id)?.name ?? "…"}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== id))} className="rounded p-0.5 hover:bg-white/20" aria-label="Remove">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function CheckList({
  label,
  options,
  value,
  onChange,
  renderLabel,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  renderLabel?: (o: string) => React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="space-y-0.5">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
              className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-[13px] text-ink-700 hover:bg-canvas"
            >
              <span className={cn("flex h-4 w-4 items-center justify-center rounded border", on ? "border-jade bg-jade text-white" : "border-ink-300 bg-surface")}>
                {on && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              {renderLabel ? renderLabel(o) : o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
