"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Briefcase, Quote, Star, TrendingUp, UserRound } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

type T = (typeof site.testimonials)[number];
type Audience = "employers" | "candidates";
const DURATION = 6.5; // seconds per slide

const initials = (s: string) =>
  s
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
const GRAD = ["from-[rgb(var(--p-400))] to-[rgb(var(--p-700))]", "from-amber-400 to-orange-600", "from-sky-400 to-indigo-600", "from-fuchsia-400 to-purple-600"];

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5 text-saffron" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn("h-4 w-4", i < n ? "fill-current" : "opacity-30")} aria-hidden />
      ))}
    </span>
  );
}

function Person({ t, idx, size = "md" }: { t: T; idx: number; size?: "md" | "lg" }) {
  return (
    <span className="flex items-center gap-3">
      <span
        className={cn("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-4 ring-surface", GRAD[idx % GRAD.length], size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-[13px]")}
        aria-hidden
      >
        {initials(t.name)}
      </span>
      <span className="min-w-0">
        <span className={cn("block truncate font-semibold text-ink-900", size === "lg" ? "text-[16px]" : "text-[14px]")}>{t.name}</span>
        <span className="block truncate text-[12.5px] text-ink-500">
          {t.role} · {t.company}
        </span>
      </span>
    </span>
  );
}

/** 2–3 testimonials at a time: a featured card + smaller ones, autoplay with progress, arrows, dots, swipe on mobile */
export function TestimonialsCarousel() {
  const reduce = useReducedMotion();
  const [aud, setAud] = useState<Audience>("employers");
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const list = site.testimonials.filter((t) => t.audience === aud);
  const n = list.length;
  const go = (to: number, d = 1) => {
    setDir(d);
    setI(((to % n) + n) % n);
  };
  useEffect(() => setI(0), [aud]);
  const auto = !reduce && typeof navigator !== "undefined" && !navigator.webdriver;

  const featured = list[i];
  const side = [list[(i + 1) % n], list[(i + 2) % n]];
  const startIdx = site.testimonials.indexOf(featured);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-2xl border border-line bg-surface/70 p-1 backdrop-blur" role="tablist" aria-label="Testimonials by audience">
          {(
            [
              ["employers", "Employers", Briefcase],
              ["candidates", "Candidates", UserRound],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              role="tab"
              aria-selected={aud === k}
              onClick={() => setAud(k)}
              className={cn("relative flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-semibold transition-colors", aud === k ? "text-white" : "text-ink-600 hover:text-ink-900")}
            >
              {aud === k && <m.span layoutId="testimonial-tab" className="absolute inset-0 rounded-xl bg-jade shadow-glow" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <Icon className="relative h-4 w-4" aria-hidden />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => go(i - 1, -1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-700 transition hover:border-jade/50 hover:text-jade-700" aria-label="Previous testimonial">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button onClick={() => go(i + 1, 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-jade text-white shadow-glow transition hover:brightness-110" aria-label="Next testimonial">
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* featured */}
        <div className="relative [perspective:1400px] lg:col-span-8">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <m.figure
              key={`${aud}-${i}`}
              custom={dir}
              initial={{ opacity: 0, x: 50 * dir, rotateY: -10 * dir }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              exit={{ opacity: 0, x: -50 * dir, rotateY: 10 * dir }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(i + 1, 1);
                else if (info.offset.x > 60) go(i - 1, -1);
              }}
              className="card-premium border-beam relative flex h-full min-h-[360px] cursor-grab flex-col overflow-hidden p-7 active:cursor-grabbing sm:p-10"
            >
              <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-jade/15 blur-3xl" />
              <Quote className="absolute right-8 top-8 h-16 w-16 text-jade/10" aria-hidden />
              <div className="relative flex flex-wrap items-center gap-3">
                <Stars n={featured.rating} />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron-50 px-3 py-1 text-[12.5px] font-semibold text-saffron-800">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden /> {featured.metric}
                </span>
              </div>
              <blockquote className="relative mt-6 text-balance text-[21px] font-medium leading-[1.45] tracking-[-0.015em] text-ink-900 sm:text-[27px]">“{featured.quote}”</blockquote>
              <figcaption className="relative mt-auto pt-8">
                <Person t={featured} idx={startIdx} size="lg" />
              </figcaption>
            </m.figure>
          </AnimatePresence>
        </div>

        {/* side cards */}
        <div className="hidden flex-col gap-5 lg:col-span-4 lg:flex">
          {side.map((t, k) => (
            <button
              key={`${aud}-${t.name}`}
              onClick={() => go(i + k + 1, 1)}
              className="card-premium lift group flex flex-1 flex-col p-6 text-left"
              aria-label={`Show testimonial from ${t.name}`}
            >
              <div className="flex items-center justify-between">
                <Stars n={t.rating} />
                <span className="text-[11.5px] font-semibold text-jade-700">{t.metric}</span>
              </div>
              <p className="mt-3 line-clamp-3 text-[14.5px] leading-relaxed text-ink-700">“{t.quote}”</p>
              <div className="mt-auto pt-4">
                <Person t={t} idx={site.testimonials.indexOf(t)} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* dots + autoplay progress */}
      <div className="mt-6 flex items-center gap-4">
        <div className="flex gap-2" role="tablist" aria-label="Choose testimonial">
          {list.map((t, k) => (
            <button
              key={t.name}
              role="tab"
              aria-selected={k === i}
              aria-label={`Testimonial ${k + 1} of ${n}`}
              onClick={() => go(k, k > i ? 1 : -1)}
              className={cn("h-2 rounded-full transition-all duration-300", k === i ? "w-8 bg-jade" : "w-2 bg-jade/25 hover:bg-jade/50")}
            />
          ))}
        </div>
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-jade/10" aria-hidden>
          {auto && (
            <span
              key={`${aud}-${i}`}
              onAnimationEnd={() => go(i + 1, 1)}
              className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-gradient-to-r from-jade to-saffron"
              style={{ animation: `progress-x ${DURATION}s linear forwards`, animationPlayState: paused ? "paused" : "running" }}
            />
          )}
        </div>
        <span className="text-[12.5px] font-semibold tabular text-ink-500">
          {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
