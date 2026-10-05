"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Click-to-open dropdown menu — portal + fixed position, so it isn't clipped by scroll containers */
export function Menu({
  trigger,
  children,
  align = "end",
  side = "bottom",
  width = "w-56",
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  width?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const place = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ph = panel.current?.offsetHeight ?? 280;
    const style: React.CSSProperties = { position: "fixed" };
    const openUp = side === "top" || (r.bottom + ph + 12 > vh && r.top > ph + 12);
    if (openUp) style.bottom = vh - r.top + 6;
    else style.top = r.bottom + 6;
    if (align === "end") style.right = Math.max(8, vw - r.right);
    else style.left = Math.max(8, r.left);
    setPos(style);
  };

  useEffect(() => {
    if (!open) return;
    place();
    const raf = requestAnimationFrame(place);
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || panel.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onScroll = (e: Event) => {
      if (panel.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open &&
        createPortal(
          <div
            ref={panel}
            role="menu"
            style={pos}
            className={cn("z-[70] max-h-[min(70vh,520px)] overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-pop animate-pop-in", width)}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body
        )}
    </div>
  );
}

export function MenuItem({
  onClick,
  icon,
  children,
  danger,
  hint,
  disabled,
}: {
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
  hint?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors disabled:opacity-40",
        danger ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" : "text-ink-700 hover:bg-surface-3"
      )}
    >
      {icon && <span className={cn("shrink-0", danger ? "" : "text-ink-400")}>{icon}</span>}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs text-ink-400">{hint}</span>}
    </button>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-2.5 pb-1 pt-2 text-[11.5px] font-medium text-ink-400">{children}</p>;
}

export function MenuDivider() {
  return <div className="my-1 h-px bg-line" />;
}

/** Segmented control */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; title?: string }[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-lg border border-line bg-surface-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          title={o.title}
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all",
            size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
            value === o.value ? "bg-surface text-ink-900 shadow-card ring-1 ring-line" : "text-ink-500 hover:text-ink-800"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Right-side drawer */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px] animate-fade-in dark:bg-black/50" onClick={onClose} />
      <div className={cn("absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-surface shadow-pop animate-slide-in", width)}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink-900">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-ink-400">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-surface-3 hover:text-ink-800" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Simple tabs (client side) */
export function Tabs({
  tabs,
  initial,
  className,
  onChange,
}: {
  tabs: { id: string; label: React.ReactNode; count?: number; icon?: React.ReactNode; content: React.ReactNode }[];
  initial?: string;
  className?: string;
  onChange?: (id: string) => void;
}) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.slice(1);
      if (hash && tabs.some((t) => t.id === hash)) setActive(hash);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={className}>
      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => {
              setActive(t.id);
              onChange?.(t.id);
              history.replaceState(null, "", `#${t.id}`);
            }}
            className={cn(
              "relative -mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm transition-colors",
              active === t.id ? "border-ink-900 font-medium text-ink-900" : "border-transparent text-ink-400 hover:text-ink-700"
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-[11px] tabular", active === t.id ? "bg-ink-900 text-surface" : "bg-ink-800/[0.06] text-ink-600")}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" hidden={active !== t.id}>
          {active === t.id && t.content}
        </div>
      ))}
    </div>
  );
}

/** Small rating input */
export function StarInput({ value, onChange, size = 20 }: { value: number | null; onChange: (v: number | null) => void; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star`}
          onClick={() => onChange(value === n ? null : n)}
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <svg width={size} height={size} viewBox="0 0 24 24" className={(value ?? 0) >= n ? "fill-saffron" : "fill-ink-300/50"}>
            <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  indeterminate,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  indeterminate?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(!checked);
      }}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        checked || indeterminate ? "border-jade bg-jade text-white" : "border-line-strong bg-surface hover:border-ink-400",
        className
      )}
    >
      {indeterminate ? (
        <span className="h-0.5 w-2 rounded bg-white" />
      ) : checked ? (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M2.5 6.2 5 8.5l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
  );
}
