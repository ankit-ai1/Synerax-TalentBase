"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Band, SectionCta, SectionHead, Wrap } from "../connection/motif";
import { IconTile } from "../ui";
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

// where cards stick: --stack-top below the viewport top (navbar is 64px), each next card --stack-step lower so the edges show
const STACK_VARS = "[--stack-top:76px] [--stack-step:8px] lg:[--stack-top:88px] lg:[--stack-step:16px]";

function ServiceCard({ s, i, dark }: { s: Service; i: number; dark: boolean }) {
  const Ill = ILLUSTRATION[s.slug];
  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-3xl border p-5 sm:p-8 lg:grid lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:p-12",
        dark ? "on-dark border-[rgb(var(--deep-line))] bg-[rgb(var(--deep))] shadow-[0_30px_70px_-30px_rgb(20_12_4/0.6)]" : "border-line bg-surface shadow-[0_30px_70px_-34px_rgb(56_36_13/0.28)]"
      )}
    >
      <div className="flex shrink-0 flex-col lg:min-h-0">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 items-center rounded-full border border-line px-3 text-[12.5px] font-semibold tabular text-ink-600">{String(i + 1).padStart(2, "0")} / 06</span>
          <IconTile name={s.icon} className="h-10 w-10" />
        </div>
        <h3 className="mt-4 text-[24px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink-900 sm:text-[32px] lg:mt-6 lg:text-[40px]">{s.title}</h3>
        <p className="mt-2 max-w-lg text-[14.5px] leading-snug text-ink-500 sm:text-[16px] lg:mt-3 lg:text-[17px] lg:leading-relaxed">{s.summary}</p>
        <ul className="mt-4 space-y-2 lg:mt-6 lg:space-y-2.5">
          {s.benefits.slice(0, 4).map((b, n) => (
            <li key={b} className={cn("items-center gap-3 text-[14px] leading-snug text-ink-700 lg:text-[15px]", n === 3 ? "hidden lg:flex" : "flex")}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-jade-50 text-jade-700 ring-1 ring-jade/20">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </span>
              {b}
            </li>
          ))}
        </ul>
        <Link href={`/services#${s.slug}`} className="group mt-auto inline-flex items-center gap-1.5 pt-4 text-[15px] font-semibold text-jade-700 lg:pt-7">
          Learn more <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          <span className="sr-only"> about {s.title}</span>
        </Link>
      </div>
      {/* phones: the illustration takes whatever height is left; short screens skip it */}
      <div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl max-lg:[@media(max-height:700px)]:hidden lg:mt-0 lg:h-full lg:min-h-[240px] lg:overflow-visible lg:rounded-none">
        <div className="absolute inset-0">{Ill && <Ill />}</div>
      </div>
    </article>
  );
}

/**
 * "Six ways to hire" — sticky stacking cards. Each card sticks near the top (a little lower than the one
 * before) and the next one slides up over it; covered cards scale to 0.94 and darken. The section ends
 * exactly with the last card (no spacer). Same on phones, with cards sized to fit the screen.
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
        const stick = parseFloat(getComputedStyle(items.current[i]!).top) || 0;
        const start = stick + h + 24; // where the next card's top sits before it starts covering
        const end = parseFloat(getComputedStyle(next).top) || 0; // where it sticks once it fully covers this one
        const p = Math.min(1, Math.max(0, (start - next.getBoundingClientRect().top) / Math.max(1, start - end)));
        card.style.transform = p ? `scale(${1 - 0.06 * p})` : "";
        if (shade) shade.style.opacity = String(p * 0.32);
      }
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    on(); // first measurement on the next frame, not during hydration (no forced layout)
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
          action={<SectionCta href="/services">All services</SectionCta>}
        />

        <div className={cn("space-y-6", STACK_VARS)} data-testid="service-stack">
          {site.services.map((s, i) => (
            <div
              key={s.slug}
              ref={(el) => {
                items.current[i] = el;
              }}
              className="sticky"
              style={{ top: `calc(var(--stack-top) + ${i} * var(--stack-step))`, zIndex: i + 1 }}
            >
              <div
                ref={(el) => {
                  cards.current[i] = el;
                }}
                className="relative h-[calc(100svh-132px)] max-h-[620px] min-h-[420px] origin-top will-change-transform lg:h-[min(70vh,560px)] lg:max-h-none lg:min-h-[480px]"
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
      </Wrap>
    </Band>
  );
}
