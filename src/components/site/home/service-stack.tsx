"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Band, SectionHead, Wrap } from "../connection/motif";
import { IconTile } from "../ui";
import { Reveal } from "../reveal";
import { ContractToHireVisual, PermanentVisual } from "../visuals";
import { CalendarFill, PipelineFlow, SpotlightFind, WaveGrid } from "./illustrations";

const ILLUSTRATION: Record<string, () => React.ReactNode> = {
  permanent: () => <PermanentVisual />,
  contract: () => <CalendarFill />,
  "contract-to-hire": () => <ContractToHireVisual />,
  rpo: () => <PipelineFlow />,
  executive: () => <SpotlightFind />,
  bulk: () => <WaveGrid />,
};

type Service = (typeof site.services)[number];

const TOP = 88; // px below the viewport top where the first card sticks (navbar is 64px)
const STEP = 16; // each following card sticks a little lower, so the stack edges show

function ServiceCard({ s, i, dark, compact }: { s: Service; i: number; dark: boolean; compact?: boolean }) {
  const Ill = ILLUSTRATION[s.slug];
  return (
    <article
      className={cn(
        "relative grid h-full overflow-hidden rounded-3xl border p-7 sm:p-9 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:p-12",
        dark ? "on-dark border-[rgb(var(--deep-line))] bg-[rgb(var(--deep))] shadow-[0_30px_70px_-30px_rgb(20_12_4/0.6)]" : "border-line bg-surface shadow-[0_30px_70px_-34px_rgb(56_36_13/0.28)]"
      )}
    >
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 items-center rounded-full border border-line px-3 text-[12.5px] font-semibold tabular text-ink-600">{String(i + 1).padStart(2, "0")} / 06</span>
          <IconTile name={s.icon} className="h-10 w-10" />
        </div>
        <h3 className="mt-6 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink-900 sm:text-[34px] lg:text-[40px]">{s.title}</h3>
        <p className="mt-3 max-w-lg text-[16px] leading-relaxed text-ink-500 sm:text-[17px]">{s.summary}</p>
        <ul className="mt-6 space-y-2.5">
          {s.benefits.slice(0, 4).map((b) => (
            <li key={b} className="flex items-center gap-3 text-[15px] text-ink-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-jade-50 text-jade-700 ring-1 ring-jade/20">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </span>
              {b}
            </li>
          ))}
        </ul>
        <Link href={`/services#${s.slug}`} className="group mt-auto inline-flex items-center gap-1.5 pt-7 text-[15px] font-semibold text-jade-700">
          Learn more <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
      <div className={cn("relative mt-7 lg:mt-0", compact ? "h-56" : "h-full min-h-[240px]")}>
        <div className="absolute inset-0">{Ill && <Ill />}</div>
      </div>
    </article>
  );
}

/**
 * "Six ways to hire" — sticky stacking cards. Each card sticks near the top (a little lower than the one
 * before) and the next one slides up over it; covered cards scale to 0.94 and darken. The section ends
 * exactly with the last card (no spacer). Mobile: plain cards with a reveal.
 */
export function ServiceStack() {
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const shades = useRef<(HTMLDivElement | null)[]>([]);
  const n = site.services.length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      for (let i = 0; i < n - 1; i++) {
        const card = cards.current[i],
          shade = shades.current[i],
          next = items.current[i + 1];
        if (!card || !next || getComputedStyle(next).position !== "sticky") continue;
        const h = card.offsetHeight;
        const stick = TOP + i * STEP;
        const start = stick + h + 24; // where the next card's top sits before it starts covering
        const end = TOP + (i + 1) * STEP; // where it sticks once it fully covers this one
        const p = Math.min(1, Math.max(0, (start - next.getBoundingClientRect().top) / Math.max(1, start - end)));
        card.style.transform = p ? `scale(${1 - 0.06 * p})` : "";
        if (shade) shade.style.opacity = String(p * 0.32);
      }
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
  }, [n]);

  return (
    <Band tone="light" index="03" label="Solutions" className="py-24 sm:py-32">
      <Wrap>
        <SectionHead
          index="03"
          label="Staffing solutions"
          title="Six ways to hire, one partner"
          highlight="one partner"
          description="Permanent, contract or at scale — every model runs on the same screening and the same transparent process."
          action={
            <Link href="/services" className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-jade-700">
              All services <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          }
        />

        {/* desktop: sticky stack */}
        <div className="hidden space-y-6 lg:block">
          {site.services.map((s, i) => (
            <div
              key={s.slug}
              ref={(el) => {
                items.current[i] = el;
              }}
              className="sticky"
              style={{ top: TOP + i * STEP, zIndex: i + 1 }}
            >
              <div
                ref={(el) => {
                  cards.current[i] = el;
                }}
                className="relative h-[min(70vh,560px)] min-h-[480px] origin-top will-change-transform"
              >
                <ServiceCard s={s} i={i} dark={i % 2 === 1} />
                <div
                  aria-hidden
                  ref={(el) => {
                    shades.current[i] = el;
                  }}
                  className="pointer-events-none absolute inset-0 rounded-3xl bg-[rgb(28_17_5)] opacity-0"
                />
              </div>
            </div>
          ))}
        </div>

        {/* mobile / tablet: plain cards that fade + slide in */}
        <div className="space-y-5 lg:hidden">
          {site.services.map((s, i) => (
            <Reveal key={s.slug}>
              <ServiceCard s={s} i={i} dark={i % 2 === 1} compact />
            </Reveal>
          ))}
        </div>
      </Wrap>
    </Band>
  );
}
