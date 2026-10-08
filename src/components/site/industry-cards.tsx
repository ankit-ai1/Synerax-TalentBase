"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, Check, ChevronDown, X } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { SpotlightCard } from "./cards";
import { IconTile } from "./ui";
import { Reveal } from "./reveal";

/** Home: 4-per-row flip cards — the back reveals roles and key facts (hover / focus on desktop) */
export function IndustryFlipCards() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
      {site.industries.map((ind, i) => (
        <Reveal as="li" key={ind.title} delay={i * 60} variant="scale">
          <Link href="/industries" className="flip block h-full rounded-[1.25rem] focus-visible:outline-none" aria-label={`${ind.title}: ${ind.roles.join(", ")}`}>
            <div className="flip-inner h-full min-h-[270px]">
              <div className="flip-face card-premium flex h-full flex-col p-6">
                <div className="flex items-start justify-between">
                  <IconTile name={ind.icon} className="h-12 w-12" />
                  <span className="text-[12px] font-semibold tabular text-jade-700/60">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.01em] text-ink-900">{ind.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{ind.description}</p>
                <p className="mt-auto pt-4 text-[12.5px] font-medium text-jade-700">
                  {ind.roles.length} role families · {ind.skills.length} core skills
                  <span className="ml-1 hidden lg:inline">— hover to see roles</span>
                </p>
              </div>
              <div className="flip-face flip-back section-dark flex flex-col overflow-hidden rounded-[1.25rem] p-6">
                <div aria-hidden className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[rgb(var(--p-600)/0.5)] blur-3xl" />
                <p className="relative text-[11.5px] font-semibold uppercase tracking-[0.14em] text-jade-700">{ind.title}</p>
                <ul className="relative mt-3 space-y-1.5">
                  {ind.roles.map((r) => (
                    <li key={r} className="flex items-center gap-2 text-[14px] text-ink-800">
                      <Check className="h-3.5 w-3.5 text-jade-700" aria-hidden /> {r}
                    </li>
                  ))}
                </ul>
                <div className="relative mt-auto grid grid-cols-3 gap-2 pt-4 text-center">
                  {[
                    [String(ind.roles.length), "role families"],
                    [String(ind.skills.length), "skills screened"],
                    ["4", "hiring models"],
                  ].map(([v, l]) => (
                    <div key={l} className="rounded-xl bg-fg/[0.05] px-1 py-2">
                      <p className="text-[18px] font-semibold text-ink-900">{v}</p>
                      <p className="text-[10.5px] leading-tight text-ink-500">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        </Reveal>
      ))}
      <Reveal as="li" delay={site.industries.length * 60} variant="scale">
        <Link href="/contact" className="gradient-border group flex h-full min-h-[270px] flex-col justify-between overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-jade-50 to-surface p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-jade text-white shadow-glow">
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
          <div>
            <h3 className="text-[19px] font-semibold text-ink-900">Hiring in another sector?</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">We regularly hire beyond these industries. Tell us about the role.</p>
            <p className="mt-4 text-[14px] font-semibold text-jade-700">Talk to us →</p>
          </div>
        </Link>
      </Reveal>
    </ul>
  );
}

/** Industries page: spotlight cards that expand into a detail panel (layout animation) */
export function IndustryExplorer() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <m.ul layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {site.industries.map((ind, i) => {
        const expanded = open === i;
        return (
          <m.li
            key={ind.title}
            layout
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className={cn(expanded && "sm:col-span-2 lg:col-span-4")}
          >
            <SpotlightCard className={cn("h-full", !expanded && "lift")} data-active={expanded ? "true" : undefined}>
              <button
                onClick={() => setOpen(expanded ? null : i)}
                aria-expanded={expanded}
                aria-controls={`industry-${i}`}
                className="flex w-full items-start gap-4 p-6 text-left"
              >
                <IconTile name={ind.icon} className="h-12 w-12 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-semibold text-ink-900">{ind.title}</span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-ink-500">{ind.description}</span>
                  <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-400">
                    <span>
                      <b className="font-semibold text-ink-800">{ind.roles.length}</b> role families
                    </span>
                    <span>
                      <b className="font-semibold text-ink-800">{ind.skills.length}</b> core skills
                    </span>
                  </span>
                </span>
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-500 transition-transform", expanded && "rotate-180")} aria-hidden>
                  {expanded ? <X className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <m.div
                    id={`industry-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-6 border-t border-line px-6 py-6 md:grid-cols-[1fr_1fr_auto]">
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400">Roles we hire for</p>
                        <ul className="mt-3 space-y-2">
                          {ind.roles.map((r) => (
                            <li key={r} className="flex items-center gap-2 text-[14.5px] text-ink-700">
                              <Check className="h-4 w-4 text-jade" aria-hidden /> {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400">Skills we screen for</p>
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {ind.skills.map((s) => (
                            <li key={s} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[13px] text-ink-600">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-end">
                        <Link href="/employers#request" className="inline-flex h-11 items-center gap-2 rounded-xl bg-jade px-5 text-[14px] font-semibold text-white shadow-glow hover:brightness-110">
                          Hire in {ind.title} <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </SpotlightCard>
          </m.li>
        );
      })}
      <m.li layout className="sm:col-span-1 lg:col-span-1">
        <div className="flex h-full flex-col justify-center rounded-[1.25rem] border border-dashed border-line-strong bg-surface-2/60 p-6">
          <h3 className="text-[18px] font-semibold text-ink-900">Don&apos;t see your industry?</h3>
          <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-ink-500">
            We regularly hire for other sectors too. Tell us about your requirement and we&apos;ll tell you honestly if we can help.
          </p>
          <Link href="/contact" className="group mt-4 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-jade-700">
            Talk to us <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </m.li>
    </m.ul>
  );
}
