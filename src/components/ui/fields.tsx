"use client";

import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseProps {
  label?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

function Label({ htmlFor, label, required }: { htmlFor: string; label?: string; required?: boolean }) {
  if (!label) return null;
  return (
    <label htmlFor={htmlFor} className="field-label">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function Hint({ hint }: { hint?: string }) {
  return hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null;
}

export function TextField({
  label,
  hint,
  required,
  className,
  value,
  onChange,
  prefix,
  suffix,
  ...rest
}: BaseProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "prefix"> & {
    value: string;
    onChange: (v: string) => void;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
  }) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={required} />
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-400">
            {prefix}
          </span>
        )}
        <input
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={cn("field-input", prefix ? "pl-8" : "", suffix ? "pr-14" : "")}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-400">
            {suffix}
          </span>
        )}
      </div>
      <Hint hint={hint} />
    </div>
  );
}

export function TextArea({
  label,
  hint,
  required,
  className,
  value,
  onChange,
  rows = 3,
  ...rest
}: BaseProps &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
    value: string;
    onChange: (v: string) => void;
  }) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={required} />
      <textarea
        id={id}
        rows={rows}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="field-input h-auto py-2.5 leading-relaxed"
        {...rest}
      />
      <Hint hint={hint} />
    </div>
  );
}

export function SelectField({
  label,
  hint,
  required,
  className,
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  options: readonly (string | { value: string; label: string })[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={required} />
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn("field-input appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9", !value && "text-ink-300")}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237A849C' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v} className="text-ink-800">
              {l}
            </option>
          );
        })}
      </select>
      <Hint hint={hint} />
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-jade" : "bg-line-strong"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-surface shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block text-sm font-medium text-ink-700">{label}</span>
        {description && <span className="block text-xs text-ink-400">{description}</span>}
      </label>
    </div>
  );
}

/** Free text chips (tags, languages, locations) — add with Enter or comma */
export function ChipInput({
  label,
  hint,
  value,
  onChange,
  suggestions = [],
  placeholder = "Type and press Enter",
  className,
}: BaseProps & {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, "");
    if (!v) return;
    if (!value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setText("");
  };

  const filtered = suggestions
    .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
    .filter((s) => s.toLowerCase().includes(text.toLowerCase()))
    .slice(0, 8);

  return (
    <div className={cn("relative", className)}>
      <Label htmlFor={id} label={label} />
      <div
        className="flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 transition-colors focus-within:border-jade focus-within:ring-2 focus-within:ring-jade/15 hover:border-ink-300"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-ink-800/[0.06] py-0.5 pl-2 pr-1 text-[13px] text-ink-700">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(value.filter((x) => x !== v))}
              className="rounded p-0.5 text-ink-400 hover:bg-ink-800/10 hover:text-ink-800"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          value={text}
          onChange={(e) => {
            if (e.target.value.endsWith(",")) add(e.target.value);
            else setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={value.length ? "" : placeholder}
          className="h-7 min-w-[120px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-ink-300"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-surface p-1 shadow-pop animate-pop-in">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(s);
              }}
              className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-ink-700 hover:bg-canvas"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <Hint hint={hint} />
    </div>
  );
}
