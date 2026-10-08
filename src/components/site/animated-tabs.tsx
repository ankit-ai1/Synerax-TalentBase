"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/utils";

export type TabItem = { id: string; label: React.ReactNode; content: React.ReactNode };

/** Tabs with a sliding pill indicator and cross-fading panels (keyboard: ←/→, Home/End) */
export function AnimatedTabs({
  items,
  className,
  listClassName,
  panelClassName,
  defaultId,
  ariaLabel,
  value,
  onChange,
}: {
  items: TabItem[];
  className?: string;
  listClassName?: string;
  panelClassName?: string;
  defaultId?: string;
  ariaLabel: string;
  value?: string;
  onChange?: (id: string) => void;
}) {
  const [inner, setInner] = useState(defaultId ?? items[0]?.id);
  const active = value ?? inner;
  const setActive = (id: string) => {
    setInner(id);
    onChange?.(id);
  };
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      setActive(items[next].id);
      refs.current[next]?.focus();
    }
  };

  const current = items.find((t) => t.id === active) ?? items[0];

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "relative flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-line bg-surface-2/80 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          listClassName
        )}
      >
        {items.map((t, i) => {
          const selected = t.id === current.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${base}-tab-${t.id}`}
              role="tab"
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "relative shrink-0 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors",
                selected ? "text-ink-900" : "text-ink-500 hover:text-ink-800"
              )}
            >
              {selected && (
                <m.span
                  layoutId={`${base}-pill`}
                  className="absolute inset-0 rounded-xl bg-surface shadow-[0_1px_2px_rgb(56_36_13/0.06),0_4px_12px_-4px_rgb(56_36_13/0.12)] ring-1 ring-line"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className={cn("relative", panelClassName)}>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={current.id}
            id={`${base}-panel-${current.id}`}
            role="tabpanel"
            aria-labelledby={`${base}-tab-${current.id}`}
            tabIndex={0}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="focus-visible:outline-none"
          >
            {current.content}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
