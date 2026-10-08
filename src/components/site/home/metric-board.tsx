"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { SiteIcon } from "../site-icon";

type Stat = { value: number; suffix?: string; prefix?: string; label: string; context?: string; icon?: string };

const DIGITS = "0123456789".split("");

/**
 * Odometer: each digit is a vertical strip that rolls to its value with a soft motion blur.
 * The server renders the final value (readable without JS); it rolls up from 0 when scrolled into view.
 */
export function Odometer({ value, prefix = "", suffix = "", delay = 0 }: { value: number; prefix?: string; suffix?: string; delay?: number }) {
  const text = value.toLocaleString("en-IN");
  const ref = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<"final" | "zero" | "roll">("final");
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.webdriver) return;
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) return; // already on screen: keep the final value
    setPhase("zero");
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        requestAnimationFrame(() => setPhase("roll"));
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  let d = 0;
  return (
    <span ref={ref} className={cn("odo", phase === "roll" && "rolling")}>
      <span className="sr-only">
        {prefix}
        {text}
        {suffix}
      </span>
      <span aria-hidden className="inline-flex items-end">
        {prefix}
        {text.split("").map((ch, i) => {
          if (!/\d/.test(ch)) return <span key={i}>{ch}</span>;
          const n = phase === "zero" ? 0 : Number(ch);
          const dl = delay + d++ * 0.08;
          return (
            <span key={i} className="odo-col">
              <span className="odo-strip" style={{ ["--n" as string]: n, ["--d" as string]: `${dl}s`, transition: phase === "zero" ? "none" : undefined }}>
                {DIGITS.map((g) => (
                  <span key={g}>{g}</span>
                ))}
              </span>
            </span>
          );
        })}
        {suffix && <span className="ml-0.5 text-[0.5em] font-semibold text-[rgb(var(--accent-b))]">{suffix.trim()}</span>}
      </span>
    </span>
  );
}

const BARS = [0.86, 0.7, 0.62, 0.92];

/** Graphite metric cards: odometer numbers, a thin ember bar that grows, and a cursor-following spotlight */
export function MetricBoard({ stats }: { stats: readonly Stat[] }) {
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s, i) => (
        <div key={s.label} onPointerMove={onMove} className="spotlight card-premium relative overflow-hidden rounded-[24px] p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">{s.label}</span>
            {s.icon && <SiteIcon name={s.icon} className="h-5 w-5 text-[rgb(var(--accent-b))]" />}
          </div>
          <p className="mt-6 text-[44px] font-semibold tracking-[-0.03em] text-ink-900 sm:text-[52px]">
            <Odometer value={s.value} prefix={s.prefix} suffix={s.suffix} delay={i * 0.12} />
          </p>
          {s.context && <p className="mt-3 text-[13.5px] text-ink-500">{s.context}</p>}
          <div className="mt-6 h-[3px] overflow-hidden rounded-full bg-fg/[0.08]" aria-hidden>
            <div className="bar-fill h-full rounded-full bg-gradient-to-r from-[rgb(var(--ember-a))] to-[rgb(var(--ember-b))]" style={{ ["--v" as string]: BARS[i % BARS.length], ["--d" as string]: `${0.35 + i * 0.12}s` }} />
          </div>
        </div>
      ))}
    </Reveal>
  );
}
