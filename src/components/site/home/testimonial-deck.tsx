"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Briefcase, Quote, Star, TrendingUp, UserRound } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Band, SectionHead, Wrap } from "../connection/motif";
import { SampleBadge } from "../ui";

type T = (typeof site.testimonials)[number];
const GRAD = ["from-[rgb(var(--ember-a))] to-[rgb(var(--ember-b))]", "from-[rgb(143_69_5)] to-[rgb(56_36_13)]", "from-[rgb(var(--p-300))] to-[rgb(var(--p-700))]", "from-[rgb(169_133_85)] to-[rgb(92_48_5)]"];
/** the phrase in each quote that gets the ember marker swipe */
const KEY: Record<string, string> = {
  "Ritika Malhotra": "shortlist within three days",
  "Vikas Bansal": "end to end",
  "Ananya Rao": "completely hands-off",
  "Dr. Sameer Kulkarni": "without overpaying",
  "Karthik Iyer": "much better offer",
  "Neha Sharma": "only roles that actually fit me",
  "Mohammed Arif": "never paid a single rupee",
  "Pooja Desai": "got me back in",
};
const initials = (s: string) =>
  s
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

function Card({ t, idx, top }: { t: T; idx: number; top: boolean }) {
  const key = KEY[t.name];
  const at = key ? t.quote.indexOf(key) : -1;
  const parts = at >= 0 ? [t.quote.slice(0, at), key, t.quote.slice(at + key.length)] : [t.quote, "", ""];
  let wi = 0;
  const words = (str: string) =>
    str
      .split(" ")
      .filter(Boolean)
      .map((w) => {
        const i = wi++;
        return (
          <span key={i} className="qword" style={{ transitionDelay: top ? `${i * 35}ms` : "0ms", color: top ? "rgb(var(--ink-900))" : "rgb(var(--ink-600))" }}>
            {w}{" "}
          </span>
        );
      });
  return (
    <figure className={cn("flex h-full flex-col rounded-[28px] border border-line bg-surface p-7 shadow-[0_30px_70px_-30px_rgb(var(--deep)/0.45)] sm:p-9", top && "deck-top")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex gap-0.5 text-success" aria-label={`${t.rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={cn("h-[18px] w-[18px]", i < t.rating ? "fill-current" : "opacity-30")} aria-hidden />
          ))}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--success)/0.14)] px-3 py-1 text-[13px] font-bold text-jade-700">
          <TrendingUp className="h-4 w-4" aria-hidden /> {t.metric}
        </span>
      </div>
      <Quote className="mt-6 h-9 w-9 text-[rgb(var(--accent-b))]" aria-hidden />
      <blockquote className="mt-3 text-[20px] font-medium leading-[1.5] tracking-[-0.01em] sm:text-[24px]">
        {words(parts[0])}
        {parts[1] && <mark className={cn("rounded-[0.2em] bg-transparent text-inherit", top && "marker")}>{words(parts[1])}</mark>}
        {words(parts[2])}
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-3 pt-8">
        <m.span
          key={t.name}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className={cn("flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-[15px] font-semibold text-white", GRAD[idx % GRAD.length])}
          aria-hidden
        >
          {initials(t.name)}
        </m.span>
        <span>
          <span className="block text-[16px] font-semibold text-ink-900">{t.name}</span>
          <span className="block text-[13.5px] text-ink-600">
            {t.role} · {t.company}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/** Stacked deck: 3 cards visible, the top one can be dragged/swiped away; auto-advances (pauses on hover) */
export function TestimonialDeck() {
  const reduce = useReducedMotion();
  const [aud, setAud] = useState<"employers" | "candidates">("employers");
  const list = site.testimonials.filter((t) => t.audience === aud);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = list.length;
  useEffect(() => setI(0), [aud]);
  useEffect(() => {
    if (reduce || paused || navigator.webdriver) return;
    const t = setTimeout(() => setI((x) => (x + 1) % n), 7000);
    return () => clearTimeout(t);
  }, [i, paused, reduce, n, aud]);
  const go = (d: number) => setI((x) => (x + d + n) % n);
  const stack = [0, 1, 2].map((k) => list[(i + k) % n]);

  return (
    <Band tone="light" index="07" label="Testimonials" className="py-24 sm:py-32">
      <Wrap>
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHead stack index="07" label="Testimonials" title="Both sides of the hire, in their words" highlight="in their words" description="Hiring managers and candidates on what working with Synerax felt like." />
            <div className="inline-flex rounded-2xl border border-jade/20 bg-surface p-1" role="tablist" aria-label="Testimonials by audience">
              {(
                [
                  ["employers", "Employers", Briefcase],
                  ["candidates", "Candidates", UserRound],
                ] as const
              ).map(([k, l, Icon]) => (
                <button key={k} role="tab" aria-selected={aud === k} onClick={() => setAud(k)} className={cn("relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold transition-colors", aud === k ? "text-white" : "text-ink-700 hover:text-ink-900")}>
                  {aud === k && <m.span layoutId="deck-tab" className="absolute inset-0 rounded-xl bg-jade" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <Icon className="relative h-4 w-4" aria-hidden />
                  <span className="relative">{l}</span>
                </button>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-3">
              <button onClick={() => go(-1)} aria-label="Previous testimonial" className="flex h-12 w-12 items-center justify-center rounded-full border border-jade/25 bg-surface text-ink-800 transition hover:border-jade">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button onClick={() => go(1)} aria-label="Next testimonial" className="flex h-12 w-12 items-center justify-center rounded-full bg-jade text-white shadow-glow">
                <ArrowRight className="h-5 w-5" />
              </button>
              <span className="ml-2 text-[14px] font-semibold tabular text-ink-700">
                {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </span>
              <SampleBadge className="ml-auto" />
            </div>
          </div>

          <div className="lg:col-span-7" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="relative mx-auto h-[500px] max-w-[640px] sm:h-[460px]">
              <AnimatePresence initial={false}>
                {stack
                  .map((t, k) => ({ t, k }))
                  .reverse()
                  .map(({ t, k }) => (
                    <m.div
                      key={`${aud}-${t.name}`}
                      className="absolute inset-0"
                     
                      style={{ zIndex: 3 - k, transformPerspective: 1400 }}
                      initial={{ opacity: 0, x: 90, y: 40, rotate: 9, rotateY: -28, scale: 0.86 }}
                      animate={{ opacity: k === 2 ? 0.55 : 1, y: k * 22, x: k * 18, rotate: k === 0 ? 0 : k === 1 ? 2.5 : 5, rotateY: 0, scale: 1 - k * 0.05 }}
                      exit={{ opacity: 0, x: -280, rotate: -14, rotateY: 22, transition: { duration: 0.45, ease: [0.55, 0, 0.45, 1] } }}
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      drag={k === 0 ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.6}
                      onDragEnd={(_, info) => {
                        if (Math.abs(info.offset.x) > 90) go(info.offset.x < 0 ? 1 : -1);
                      }}
                      aria-hidden={k !== 0}
                    >
                      <div className={cn("h-full", k === 0 && "cursor-grab active:cursor-grabbing")}>
                        <Card t={t} idx={site.testimonials.indexOf(t)} top={k === 0} />
                      </div>
                    </m.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Wrap>
    </Band>
  );
}
