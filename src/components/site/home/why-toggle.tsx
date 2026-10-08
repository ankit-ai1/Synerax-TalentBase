"use client";

import { useEffect, useRef, useState } from "react";
import { animate, m, useReducedMotion } from "motion/react";
import { Check, Minus } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Band, SectionHead, Wrap } from "../connection/motif";
import { MagneticButton } from "../magnetic-button";

// Illustrative comparison — "typical agency" reflects common practice, not any specific company
const METRICS = [
  { label: "Time to first shortlist", unit: "days", typical: 14, synerax: 3, better: "lower" as const, max: 14 },
  { label: "Profiles screened per shortlist", unit: "", typical: 6, synerax: 40, better: "higher" as const, max: 40 },
  { label: "Replacement guarantee", unit: "days", typical: 30, synerax: 90, better: "higher" as const, max: 90 },
];

/** Number that counts to its new value */
function CountTo({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = String(value);
      return;
    }
    const c = animate(prev.current, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => (el.textContent = String(Math.round(v))) });
    prev.current = value;
    return () => c.stop();
  }, [value, reduce]);
  return <span ref={ref}>{value}</span>;
}

/** "Typical agency ⇄ Synerax" switch: liquid toggle, panel crossfades graphite ↔ ember, bars race, numbers count */
export function WhyToggle() {
  const [on, setOn] = useState(true);
  const toggle = (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className="group inline-flex items-center gap-3 rounded-full border border-line bg-surface p-1.5 pr-4 text-[14px] font-semibold text-ink-800 shadow-card"
    >
      <span className={cn("relative h-8 w-16 rounded-full transition-colors duration-500", on ? "bg-gradient-to-r from-[rgb(var(--ember-a))] to-[rgb(var(--ember-b))]" : "bg-fg/15")}>
        {/* liquid thumb: stretches while it travels, then settles */}
        <m.span
          key={String(on)}
          initial={{ width: 24 }}
          animate={{ width: [24, 40, 24] }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], times: [0, 0.45, 1] }}
          className={cn("absolute top-1 h-6 rounded-full bg-white shadow-[0_2px_8px_rgb(20_12_4/0.25)]", on ? "right-1" : "left-1")}
        />
      </span>
      <span>
        <span className={on ? "text-ink-500" : "text-ink-900"}>Typical agency</span> <span aria-hidden>⇄</span> <span className={on ? "text-ink-900" : "text-ink-500"}>Synerax</span>
      </span>
    </button>
  );
  const grid = (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className={cn("relative isolate overflow-hidden rounded-[28px] border p-6 transition-colors duration-700 sm:p-8 lg:col-span-6", on ? "border-[rgb(var(--p-500)/0.4)]" : "border-line")}>
        <div aria-hidden className="absolute inset-0 -z-10 bg-surface" />
        <div aria-hidden className={cn("absolute inset-0 -z-10 bg-[radial-gradient(90%_80%_at_100%_0%,rgb(var(--p-500)/0.22),transparent_60%),linear-gradient(160deg,rgb(var(--p-500)/0.08),transparent_55%)] transition-opacity duration-700", on ? "opacity-100" : "opacity-0")} />
        <div aria-hidden className={cn("absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgb(var(--fg)/0.06),transparent_60%)] transition-opacity duration-700", on ? "opacity-0" : "opacity-100")} />
        <p className="relative text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-400">{on ? "With Synerax" : "With a typical agency"}</p>
        <ul className="relative mt-6 space-y-7">
          {METRICS.map((mt) => {
            const v = on ? mt.synerax : mt.typical;
            const good = on;
            return (
              <li key={mt.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium text-ink-700">{mt.label}</span>
                  <m.span key={`${mt.label}-${on}`} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn("text-[34px] font-semibold leading-none tracking-[-0.03em] tabular", good ? "text-jade-700" : "text-ink-500")}>
                    <CountTo value={v} />
                    {mt.unit && <span className="ml-1 text-[14px] font-medium text-ink-500">{mt.unit}</span>}
                  </m.span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-fg/[0.06]">
                  <m.div
                    initial={false}
                    animate={{ width: `${(v / mt.max) * 100}%` }}
                    transition={{ type: "spring", stiffness: 90, damping: 16, mass: 0.8 }}
                    className={cn("h-full rounded-full", good ? "bg-gradient-to-r from-[rgb(var(--ember-a))] to-[rgb(var(--ember-b))]" : "bg-fg/25")}
                  />
                </div>
                <p className="mt-1.5 text-[11.5px] text-ink-500">{mt.better === "lower" ? "Lower is better" : "Higher is better"}</p>
              </li>
            );
          })}
        </ul>
        <p className="relative mt-6 text-[11.5px] text-ink-400">Illustrative comparison. “Typical agency” reflects common industry practice, not any specific company.</p>
      </div>

      <div className="rounded-[28px] border border-line bg-surface shadow-card lg:col-span-6">
        <ul key={String(on)}>
          {site.comparison.rows.map((r, i) => {
            const yes = on ? r.values[0] : r.values[1];
            return (
              <m.li
                key={r.label}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-center gap-4 border-b border-fg/[0.07] px-6 py-4 last:border-0"
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors", yes ? (on ? "bg-jade text-white shadow-[0_0_18px_rgb(var(--p-500)/0.45)]" : "bg-fg/15 text-ink-800") : "bg-fg/[0.05] text-ink-400")}>
                  {yes ? <Check className="h-4 w-4" aria-hidden /> : <Minus className="h-4 w-4" aria-hidden />}
                  <span className="sr-only">{yes ? "Yes" : "No"}</span>
                </span>
                <span className={cn("text-[15px]", yes ? "text-ink-800" : "text-ink-500 line-through decoration-fg/20")}>{r.label}</span>
              </m.li>
            );
          })}
        </ul>
        <div className="border-t border-fg/[0.07] p-6">
          <MagneticButton href="/employers" size="md">
            See how we work with employers
          </MagneticButton>
        </div>
      </div>
    </div>

  );
  return (
    <Band tone="alt" index="06" label="Why Synerax" className="py-24 sm:py-32">
      <Wrap>
        <SectionHead
          index="06"
          label="Why Synerax"
          title="Flip the switch on how hiring feels"
          highlight="Flip the switch"
          description="Compare a typical agency with how Synerax works — toggle to see the difference."
          action={toggle}
        />

        {grid}
      </Wrap>
    </Band>
  );
}
