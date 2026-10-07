"use client";

import { useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Briefcase, Plus, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedTabs } from "./animated-tabs";

type Item = { q: string; a: string };

/** Smooth accordion */
export function Faq({ items }: { items: readonly Item[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <div className="card-premium divide-y divide-line overflow-hidden">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} className={cn("transition-colors", isOpen && "bg-surface-2/60")}>
            <h3>
              <button
                id={`${base}-q${i}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-a${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-[15.5px] font-semibold text-ink-900 sm:px-6"
              >
                {it.q}
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line transition-all duration-300",
                    isOpen ? "rotate-45 border-jade/40 bg-jade text-white" : "text-ink-400"
                  )}
                  aria-hidden
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <m.div
                  id={`${base}-a${i}`}
                  role="region"
                  aria-labelledby={`${base}-q${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-500 sm:px-6">{it.a}</p>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/** FAQ grouped by audience with animated tabs */
export function FaqTabs({ employers, candidates }: { employers: readonly Item[]; candidates: readonly Item[] }) {
  return (
    <AnimatedTabs
      ariaLabel="FAQ categories"
      listClassName="mb-5 w-fit"
      items={[
        {
          id: "employers",
          label: (
            <>
              <Briefcase className="h-4 w-4" aria-hidden /> Employers
            </>
          ),
          content: <Faq items={employers} />,
        },
        {
          id: "candidates",
          label: (
            <>
              <UserRound className="h-4 w-4" aria-hidden /> Candidates
            </>
          ),
          content: <Faq items={candidates} />,
        },
      ]}
    />
  );
}
