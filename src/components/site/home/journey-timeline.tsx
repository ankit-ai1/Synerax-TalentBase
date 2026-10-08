"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Check, ClipboardList, ListChecks, PartyPopper, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Band, SectionHead, Wrap } from "../connection/motif";
import { Odometer } from "./metric-board";

const STEPS = [
  { title: "Understand", time: "Day 0", text: "A short call to calibrate the role, must-haves, budget and notice period.", icon: ClipboardList },
  { title: "Source", time: "Day 1–2", text: "Our talent pool, referrals and job boards — matched against your brief.", icon: Search },
  { title: "Screen", time: "Day 3", text: "Skills, experience, CTC and notice verified. Every profile gets a match score.", icon: ListChecks },
  { title: "Deliver", time: "Day 7–30", text: "Interviews, offer and joining — we stay in touch until day one.", icon: BadgeCheck },
];

const STATS = [
  { value: 72, suffix: " hrs", label: "Shortlist in", note: "for standard roles" },
  { value: 3, suffix: " steps", label: "Screening", note: "skills · experience · fit" },
  { value: 90, suffix: " days", label: "Replacement guarantee", note: "on permanent hires" },
];

/** Small UI illustration for each step; animates when its step becomes active */
function StepArt({ i, on }: { i: number; on: boolean }) {
  if (i === 0)
    return (
      <div className="space-y-2.5">
        {[
          ["Role", 78],
          ["Skills", 92],
          ["Budget", 60],
        ].map(([l, w], k) => (
          <div key={l as string} className="flex items-center gap-2.5">
            <span className="w-12 text-[11px] font-semibold text-ink-500">{l}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-fg/[0.07]">
              <span className="block h-full rounded-full bg-gradient-to-r from-[rgb(var(--ember-a))] to-[rgb(var(--ember-b))] transition-[width] duration-700 ease-out" style={{ width: on ? `${w}%` : "0%", transitionDelay: `${0.15 + k * 0.18}s` }} />
            </span>
          </div>
        ))}
      </div>
    );
  if (i === 1)
    return (
      <div className="relative h-[74px]">
        {["AS", "KM", "NP"].map((t, k) => (
          <div
            key={t}
            className="absolute inset-x-0 flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-2 shadow-card transition-all duration-500 ease-out"
            style={{ top: k * 12, transform: on ? `translate3d(0,0,0) scale(${1 - (2 - k) * 0.04})` : "translate3d(0,24px,0)", opacity: on ? 1 : 0, transitionDelay: `${0.12 + k * 0.14}s`, zIndex: k }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(var(--ember-a))] to-[rgb(var(--ember-b))] text-[9px] font-bold text-white">{t}</span>
            <span className="h-1.5 w-20 rounded-full bg-fg/10" />
          </div>
        ))}
      </div>
    );
  if (i === 2)
    return (
      <div className="flex items-center gap-4">
        <ul className="flex-1 space-y-1.5">
          {["Skills", "Experience", "CTC & notice"].map((l, k) => (
            <li key={l} className="flex items-center gap-2 text-[12px] text-ink-700">
              <span className={cn("flex h-4 w-4 items-center justify-center rounded-full transition-colors duration-300", on ? "bg-jade text-white" : "bg-fg/10 text-transparent")} style={{ transitionDelay: `${0.2 + k * 0.2}s` }}>
                <Check className="h-2.5 w-2.5" aria-hidden />
              </span>
              {l}
            </li>
          ))}
        </ul>
        <svg viewBox="0 0 40 40" className="h-14 w-14 -rotate-90" aria-hidden>
          <circle cx="20" cy="20" r="16" fill="none" strokeWidth="4" className="stroke-fg/10" />
          <circle cx="20" cy="20" r="16" fill="none" strokeWidth="4" strokeLinecap="round" stroke="rgb(var(--accent-b))" strokeDasharray="100.5" strokeDashoffset={on ? 100.5 * 0.08 : 100.5} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1) 0.5s" }} />
        </svg>
      </div>
    );
  return (
    <div className="relative flex h-[74px] items-center justify-center">
      <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-jade px-3.5 py-1.5 text-[12.5px] font-bold text-white shadow-glow transition-all duration-500", on ? "scale-100 opacity-100" : "scale-75 opacity-0")}>
        <PartyPopper className="h-4 w-4" aria-hidden /> Offer accepted
      </span>
      {on &&
        Array.from({ length: 18 }).map((_, k) => {
          const a = (k / 18) * Math.PI * 2;
          const d = 46 + (k % 3) * 16;
          return (
            <span
              key={k}
              aria-hidden
              className={cn("confetti absolute left-1/2 top-1/2 rounded-full", k % 4 === 0 ? "h-1 w-2.5" : "h-1.5 w-1.5")}
              style={{ background: k % 2 ? "rgb(var(--ember-a))" : "rgb(var(--ember-b))", ["--cx" as string]: `${Math.cos(a) * d}px`, ["--cy" as string]: `${Math.sin(a) * d * 0.6}px`, ["--d" as string]: `${0.35 + (k % 5) * 0.02}s` }}
            />
          );
        })}
    </div>
  );
}

function StepCard({ i, on, vertical }: { i: number; on: boolean; vertical?: boolean }) {
  const s = STEPS[i];
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-5 shadow-card transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]", on ? "translate-y-0 opacity-100" : "translate-y-4 opacity-40", vertical ? "" : "mt-8")}>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-jade-700">{s.time}</p>
      <h3 className="mt-1 text-[19px] font-semibold tracking-[-0.02em] text-ink-900">{s.title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">{s.text}</p>
      <div className="mt-4 border-t border-line pt-4">
        <StepArt i={i} on={on} />
      </div>
    </div>
  );
}

function Node({ i, on }: { i: number; on: boolean }) {
  const Icon = STEPS[i].icon;
  return (
    <span className="relative flex h-12 w-12 items-center justify-center">
      {on && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[rgb(var(--p-500)/0.25)] [animation-iteration-count:2]" />}
      <span className={cn("relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500", on ? "border-transparent bg-gradient-to-br from-[rgb(var(--ember-a))] to-[rgb(var(--ember-b))] text-white shadow-[0_0_24px_rgb(var(--p-500)/0.45)]" : "border-line bg-surface text-ink-400")}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
    </span>
  );
}

/**
 * "How it works" — a scroll-drawn timeline (not pinned). As the section moves through the viewport the
 * ember line draws left → right with a glowing dot; each step lights up and its card rises in. Compact.
 */
export function JourneyTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.webdriver) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      // starts when the timeline is 85% down the viewport, completes when it reaches ~35%
      const v = (innerHeight * 0.85 - r.top) / Math.max(1, innerHeight * 0.5 + r.height * 0.25);
      setP(Math.min(1, Math.max(0, v)));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", on);
      removeEventListener("resize", on);
    };
  }, []);
  const active = (i: number) => p * (STEPS.length - 1) >= i - 0.02;

  return (
    <Band tone="alt" index="04" label="How it works" className="py-24 sm:py-28">
      <Wrap>
        <SectionHead index="04" label="How it works" title="The journey of one profile" highlight="one profile" description="From your brief to day one — four steps, with you in the loop at every stage." />

        <div ref={ref}>
          {/* desktop: horizontal timeline */}
          <div className="relative hidden lg:block">
            <div className="relative mx-[12.5%] h-12">
              <span aria-hidden className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-fg/10" />
              <span aria-hidden className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[rgb(var(--ember-a))] to-[rgb(var(--ember-b))]" style={{ width: `${p * 100}%` }} />
              <span aria-hidden className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(var(--p-500))] shadow-[0_0_0_5px_rgb(var(--p-500)/0.18),0_0_22px_rgb(var(--p-500)/0.9)]" style={{ left: `${p * 100}%`, opacity: p > 0 && p < 1 ? 1 : 0, transition: "opacity 0.3s" }} />
            </div>
            <ol className="-mt-12 grid grid-cols-4 gap-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex flex-col items-center">
                  <Node i={i} on={active(i)} />
                  <div className="w-full">
                    <StepCard i={i} on={active(i)} />
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* mobile / tablet: vertical timeline */}
          <ol className="relative space-y-6 pl-16 lg:hidden">
            <span aria-hidden className="absolute bottom-6 left-6 top-6 w-[2px] -translate-x-1/2 rounded-full bg-fg/10" />
            <span aria-hidden className="absolute left-6 top-6 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[rgb(var(--ember-a))] to-[rgb(var(--ember-b))]" style={{ height: `calc((100% - 3rem) * ${p})` }} />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="absolute -left-16 top-0">
                  <Node i={i} on={active(i)} />
                </span>
                <StepCard i={i} on={active(i)} vertical />
              </li>
            ))}
          </ol>
        </div>

        {/* slim stat row */}
        <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-baseline justify-between gap-4 bg-surface px-6 py-5">
              <dt>
                <span className="block text-[14px] font-semibold text-ink-800">{s.label}</span>
                <span className="block text-[12.5px] text-ink-500">{s.note}</span>
              </dt>
              <dd className="text-[30px] font-semibold tracking-[-0.03em] text-ink-900">
                <Odometer value={s.value} suffix={s.suffix} />
              </dd>
            </div>
          ))}
        </dl>
      </Wrap>
    </Band>
  );
}
