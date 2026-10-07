"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("en-IN");

/**
 * Count-up number. The server renders the FINAL value (so it is always visible
 * without JS, in print and in screenshots); it only animates from 0 when it
 * scrolls into view in a real browser. An invisible copy of the final value
 * reserves the width, so there is no layout shift or clipping.
 */
export function NumberTicker({
  value,
  suffix = "",
  prefix = "",
  duration = 1600,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || navigator.webdriver || !("IntersectionObserver" in window)) return;

    let raf = 0;
    const run = () => {
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        setN(p >= 1 ? value : Math.round(value * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const r = el.getBoundingClientRect();
    const visibleNow = r.top < window.innerHeight && r.bottom > 0;
    if (!visibleNow) setN(0);

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  const final = `${prefix}${fmt(value)}${suffix}`;
  return (
    <span ref={ref} className={cn("relative inline-grid whitespace-nowrap py-[0.08em] leading-[1.1] tabular", className)}>
      <span className="sr-only">{final}</span>
      <span className="invisible col-start-1 row-start-1" aria-hidden>
        {final}
      </span>
      <span className="col-start-1 row-start-1 text-left" aria-hidden>
        {prefix}
        {fmt(n)}
        {suffix}
      </span>
    </span>
  );
}
