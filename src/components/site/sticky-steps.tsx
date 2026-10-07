"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type StickyStep = { title: string; text: string; visual: React.ReactNode };

/**
 * Desktop: step texts scroll on the left while a sticky visual on the right swaps
 * to match the active step. Mobile: each step shows its visual inline.
 */
export function StickyScrollSteps({ steps }: { steps: StickyStep[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 [&>*]:min-w-0">
      <ol className="min-w-0 space-y-6 lg:space-y-0">
        {steps.map((s, i) => (
          <li key={s.title}>
            <div
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-step={i}
              className="flex min-w-0 flex-col justify-center lg:min-h-[44vh]"
            >
              <div className={cn("rounded-2xl border p-6 transition-all duration-500 lg:border-transparent lg:p-0", "border-line bg-surface lg:bg-transparent")}>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold transition-colors duration-500",
                      active === i ? "bg-jade text-white shadow-glow" : "bg-surface-3 text-ink-500"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">Step {i + 1}</span>
                </div>
                <h3
                  className={cn(
                    "mt-4 text-[24px] font-semibold tracking-[-0.02em] transition-colors duration-500 sm:text-[30px]",
                    active === i ? "text-ink-900" : "text-ink-900 lg:text-ink-400"
                  )}
                >
                  {s.title}
                </h3>
                <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-ink-500">{s.text}</p>
                <div className="mt-6 lg:hidden">{s.visual}</div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="relative hidden lg:block">
        <div className="sticky top-28 h-[440px]">
          {steps.map((s, i) => (
            <div
              key={s.title}
              aria-hidden={active !== i}
              className={cn(
                "absolute inset-0 transition-all duration-500 ease-out",
                active === i ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-[0.98] opacity-0"
              )}
            >
              {s.visual}
            </div>
          ))}
          <div className="absolute -bottom-10 left-0 right-0 flex justify-center gap-2" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.title} className={cn("h-1.5 rounded-full transition-all duration-500", active === i ? "w-8 bg-jade" : "w-1.5 bg-ink-300")} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
