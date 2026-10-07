"use client";

import { useRef } from "react";
import { m, useScroll, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

/**
 * Vertical timeline whose progress line fills as you scroll through it.
 * `layout="alternate"` zig-zags on wide screens; `layout="left"` keeps one column (for narrow spaces).
 */
export function ScrollTimeline({
  items,
  className,
  layout = "alternate",
}: {
  items: readonly { title: string; text: string; tag?: string }[];
  className?: string;
  layout?: "alternate" | "left";
}) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const alt = layout === "alternate";

  return (
    <ol ref={ref} className={cn("relative mx-auto max-w-3xl", className)}>
      <span aria-hidden className={cn("absolute bottom-3 left-[19px] top-3 w-px bg-line-strong", alt && "sm:left-1/2 sm:-translate-x-1/2")} />
      <m.span
        aria-hidden
        style={{ scaleY }}
        className={cn(
          "absolute bottom-3 left-[18.5px] top-3 w-[2px] origin-top rounded-full bg-gradient-to-b from-jade via-jade to-saffron",
          alt && "sm:left-1/2 sm:-translate-x-1/2"
        )}
      />
      {items.map((it, i) => {
        const right = i % 2 === 1;
        return (
          <li key={it.title} className={cn("relative grid grid-cols-[40px_minmax(0,1fr)] gap-4 pb-8 last:pb-0", alt && "sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] sm:gap-6")}>
            {alt && <div className={cn("hidden sm:block", right ? "sm:order-1" : "sm:order-3")} />}
            <div className="relative z-10 flex justify-center sm:order-2">
              <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-[13px] font-semibold text-jade-700 shadow-card">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <Reveal className={cn("card-premium p-5 sm:p-6", alt && (right ? "sm:order-3" : "sm:order-1 sm:text-right"))} delay={60}>
              {it.tag && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-saffron-600">{it.tag}</p>}
              <h3 className="mt-1 text-[17px] font-semibold text-ink-900">{it.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-500">{it.text}</p>
            </Reveal>
          </li>
        );
      })}
    </ol>
  );
}
