"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkline, Bar } from "./kit";
import { cn } from "@/lib/utils";

/** Counts up from 0 once visible (skipped with reduced motion) */
export function CountUp({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const [n, setN] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !value || window.matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.webdriver) return;
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 900);
        setN(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return (
    <span ref={ref} className="tabular">
      {n.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  sub,
  subTone = "ink",
  href,
  spark,
  progress,
  urgent,
  decimals,
  suffix,
  tone = "jade",
  className,
}: {
  label: string;
  value: number;
  /** an icon element, e.g. <Briefcase /> (elements can cross the server → client boundary; components can't) */
  icon: React.ReactNode;
  sub?: React.ReactNode;
  subTone?: "ink" | "up" | "warn";
  href?: string;
  spark?: number[];
  progress?: { value: number; max: number; label?: string };
  urgent?: boolean;
  decimals?: number;
  suffix?: string;
  tone?: "jade" | "saffron" | "violet";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    ref.current!.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current!.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const iconTone = urgent ? "bg-saffron-50 text-saffron-800 ring-saffron/30" : { jade: "bg-jade-50 text-jade-700 ring-jade/20", saffron: "bg-saffron-50 text-saffron-800 ring-saffron/30", violet: "bg-violet-50 text-violet-700 ring-violet-500/20 dark:bg-violet-400/10 dark:text-violet-300" }[tone];

  const body = (
    <div ref={ref} onMouseMove={onMove} className={cn("portal-card spotlight flex h-full flex-col overflow-hidden p-4 sm:p-5", href && "interactive", urgent && "urgent-glow")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium text-ink-500">{label}</p>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset [&>svg]:h-[18px] [&>svg]:w-[18px]", iconTone)} aria-hidden>
          {icon}
        </span>
      </div>
      <p className="-mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink-900 sm:text-[34px]">
        <CountUp value={value} decimals={decimals} suffix={suffix} />
      </p>
      {sub && (
        <p className={cn("mt-2 truncate text-[12px]", subTone === "up" ? "font-medium text-emerald-600 dark:text-emerald-400" : subTone === "warn" ? "font-medium text-saffron-600" : "text-ink-500")}>{sub}</p>
      )}
      <div className="mt-auto pt-3">
        {spark && spark.some((v) => v > 0) ? (
          <Sparkline data={spark} tone={urgent ? "saffron" : tone} />
        ) : progress ? (
          <div>
            <Bar value={progress.value} max={progress.max} tone={urgent ? "saffron" : tone === "violet" ? "violet" : "jade"} />
            {progress.label && <p className="mt-1.5 text-[11px] text-ink-400">{progress.label}</p>}
          </div>
        ) : (
          <div className="h-7" aria-hidden />
        )}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className={cn("block h-full rounded-[1.25rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade", className)}>
      {body}
    </Link>
  ) : (
    <div className={cn("h-full", className)}>{body}</div>
  );
}
