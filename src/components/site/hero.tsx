"use client";

import { useEffect, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, HeroBackdrop, HeroTitle, SiteIcon } from "./ui";
import { MagneticButton } from "./magnetic-button";
import { FloatingBadges } from "./floating-badges";

export function Hero() {
  const h = site.hero;
  return (
    <section className="relative isolate overflow-hidden">
      <HeroBackdrop />
      <Container className="relative grid items-center gap-14 pb-16 pt-10 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_1fr] lg:gap-10 lg:pb-24 lg:pt-20">
        <div className="text-center lg:text-left">
          <div className="rise-in">
            <Eyebrow>{h.eyebrow}</Eyebrow>
          </div>
          <HeroTitle text={h.title} highlight={h.highlight} className="mt-6 text-[42px] leading-[1.02] sm:text-[60px] lg:text-[70px]" />
          <p className="rise-in mx-auto mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-ink-500 sm:text-[18px] lg:mx-0" style={{ ["--d" as string]: "420ms" }}>
            {h.subtitle}
          </p>
          <div className="rise-in mt-9 flex flex-wrap justify-center gap-3 lg:justify-start" style={{ ["--d" as string]: "540ms" }}>
            <MagneticButton href={h.primaryCta.href}>{h.primaryCta.label}</MagneticButton>
            <MagneticButton href={h.secondaryCta.href} variant="secondary">
              {h.secondaryCta.label}
            </MagneticButton>
          </div>
          <ul className="rise-in mt-9 flex flex-wrap justify-center gap-2 lg:justify-start" style={{ ["--d" as string]: "660ms" }}>
            {h.trust.map((t) => (
              <li key={t.label} className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-600">
                <SiteIcon name={t.icon} className="h-4 w-4 text-jade" />
                {t.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="rise-in relative" style={{ ["--d" as string]: "250ms" }}>
          <LivePipeline />
        </div>
      </Container>
    </section>
  );
}

const STAGES = [
  { stage: "Sourced", dot: "bg-slate-400" },
  { stage: "Screened", dot: "bg-sky-500" },
  { stage: "Interview", dot: "bg-violet-500" },
  { stage: "Hired", dot: "bg-emerald-500" },
];

const CANDIDATES = [
  { id: "AS", role: "React dev", score: 94 },
  { id: "KM", role: "Data analyst", score: 88 },
  { id: "VB", role: "QA engineer", score: 81 },
  { id: "NP", role: "DevOps", score: 90 },
  { id: "RG", role: "Java dev", score: 86 },
  { id: "PI", role: "UI designer", score: 79 },
];
const START = [0, 0, 1, 1, 2, 3];

/** Illustrative live pipeline — cards move Sourced → Screened → Interview → Hired every few seconds */
function LivePipeline() {
  const reduce = useReducedMotion();
  const [cols, setCols] = useState(START);
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      setTurn((n) => n + 1);
      setCols((prev) => {
        const next = [...prev];
        // move the candidate furthest along that isn't hired yet; hired ones restart
        const order = [...next.keys()].sort((a, b) => next[b] - next[a]);
        const hired = order.find((i) => next[i] === 3);
        if (hired !== undefined && next.filter((c) => c === 3).length > 1) next[hired] = 0;
        const mover = order.find((i) => next[i] < 3 && (turn + i) % 2 === 0) ?? order.find((i) => next[i] < 3);
        if (mover !== undefined) next[mover] += 1;
        return next;
      });
    }, 2400);
    return () => clearInterval(t);
  }, [reduce, turn]);

  const featured = CANDIDATES[0];

  return (
    <figure className="relative mx-auto w-full max-w-[560px]" aria-label="Illustration of candidates moving through a hiring pipeline">
      <div className="card-premium relative overflow-hidden rounded-[28px] p-4 shadow-pop sm:p-5">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-b from-jade/10 to-transparent" />
        <div className="relative mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-ink-400">Hiring pipeline</p>
            <p className="truncate text-[15px] font-semibold text-ink-900">Senior React Developer</p>
          </div>
          <div className="flex items-center gap-3">
            <ScoreRing value={featured.score} />
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-jade-50 px-2.5 py-1 text-[11.5px] font-medium text-jade-700 sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-jade" />
              </span>
              Live
            </span>
          </div>
        </div>

        <div className="relative grid grid-cols-4 gap-1.5 sm:gap-2">
          {STAGES.map((s, ci) => {
            const here = CANDIDATES.filter((_, i) => cols[i] === ci);
            return (
              <div key={s.stage} className="min-h-[190px] rounded-2xl bg-surface-3/70 p-1.5 sm:min-h-[250px]">
                <div className="mb-2 flex items-center justify-between gap-1 px-1 pt-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
                    <span className="truncate text-[10.5px] font-semibold text-ink-600 sm:text-[11.5px]">{s.stage}</span>
                  </span>
                  <span className="text-[10px] font-medium tabular text-ink-400">{here.length}</span>
                </div>
                <div className="space-y-1.5">
                  {here.map((c) => (
                    <m.div
                      key={c.id}
                      layoutId={`cand-${c.id}`}
                      layout
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      className={cn(
                        "rounded-xl border bg-surface p-1.5 sm:p-2",
                        ci === 3 ? "border-emerald-500/40 shadow-[0_0_0_3px_rgb(16_185_129/0.08)]" : "border-line shadow-card"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-jade to-[#0B5E58] text-[8px] font-bold text-white sm:h-6 sm:w-6 sm:text-[9px]">
                          {c.id}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[9px] font-medium text-ink-700 sm:text-[10.5px]">{c.role}</p>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-300/25">
                            <div className="h-full rounded-full bg-jade" style={{ width: `${c.score}%` }} />
                          </div>
                        </div>
                      </div>
                    </m.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium text-ink-400">Shortlist velocity</p>
            <p className="text-[15px] font-semibold text-ink-900">Illustrative</p>
          </div>
          <svg className="h-12 w-2/3 text-jade" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="hero-spark" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 34 L30 30 L60 32 L90 24 L120 26 L150 18 L180 20 L210 12 L240 14 L270 6 L300 8 L300 40 L0 40 Z" fill="url(#hero-spark)" />
            <path className="draw-line" d="M0 34 L30 30 L60 32 L90 24 L120 26 L150 18 L180 20 L210 12 L240 14 L270 6 L300 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <FloatingBadges
        badges={[
          { title: "Shortlist ready", sub: "5 matched profiles", icon: "sparkles", tone: "saffron", className: "-top-9 left-[28%]", delay: 0 },
          { title: "Interview scheduled", sub: "Tomorrow, 11:00 AM", icon: "calendar", tone: "violet", className: "-left-5 bottom-[26%]", delay: 3 },
          { title: "Offer accepted", sub: "Joining in 15 days", icon: "check", tone: "jade", className: "-bottom-8 right-8", delay: 6 },
        ]}
      />
      <figcaption className="sr-only">Candidate cards move from Sourced to Screened, Interview and Hired.</figcaption>
    </figure>
  );
}

function ScoreRing({ value }: { value: number }) {
  const r = 16;
  const len = 2 * Math.PI * r;
  return (
    <div className="relative h-11 w-11 shrink-0" title="Match score">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" className="stroke-ink-300/30" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="ring-fill stroke-jade"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - value / 100)}
          style={{ ["--ring-len" as string]: len }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular text-ink-900">{value}</span>
      <span className="sr-only">Match score {value} out of 100</span>
    </div>
  );
}
