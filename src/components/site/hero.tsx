"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { BellRing, TrendingUp } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, SiteIcon } from "./ui";
import { MagneticButton } from "./magnetic-button";
import { FloatingBadges } from "./floating-badges";
import { Silk } from "./silk";

/** Last word of the highlight rolls vertically with a soft blur (width reserved for the longest word — no layout shift) */
function RollWord({ words }: { words: readonly string[] }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || words.length < 2 || navigator.webdriver) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), 3000);
    return () => clearInterval(t);
  }, [reduce, words.length]);
  const longest = [...words].sort((x, y) => y.length - x.length)[0];
  return (
    <span className="relative inline-grid overflow-hidden whitespace-nowrap pb-[0.12em] pr-[0.08em] align-bottom">
      <span className="invisible col-start-1 row-start-1" aria-hidden>
        {longest}
      </span>
      <span className="sr-only">{words[0]}</span>
      <AnimatePresence initial={false}>
        <m.span
          key={words[i]}
          aria-hidden
          initial={{ y: "100%", opacity: 0, filter: "blur(8px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-100%", opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="ember-sweep col-start-1 row-start-1"
        >
          {words[i]}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

export function Hero() {
  const h = site.hero;
  const lead = h.title.replace(h.highlight, "").trim();
  const hlWords = h.highlight.split(" ");
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 18 });
  const sy = useSpring(my, { stiffness: 50, damping: 18 });

  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section ref={ref} onPointerMove={onMove} onPointerLeave={() => (mx.set(0), my.set(0))} className="relative isolate -mt-16 overflow-clip bg-canvas pt-16">
      {/* clean background: a soft WebGL silk glow behind the mockup (no shapes) */}
      <Silk focus={[0.72, 0.52]} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
      <Container wide className="relative grid items-center gap-14 pb-16 pt-10 sm:pb-36 sm:pt-24 lg:grid-cols-[45fr_55fr] lg:gap-8 lg:pb-40 lg:pt-24">
        <div className="relative z-10 text-center lg:text-left">
          <div className="rise-in">
            <Eyebrow>{h.eyebrow}</Eyebrow>
          </div>
          <h1 className="mt-6 text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] text-ink-900 sm:text-[64px] lg:text-[72px] xl:text-[84px]">
            <span className="rise-line">
              <span className="metal" style={{ ["--d" as string]: "80ms" }}>
                {lead}
              </span>
            </span>
            <span className="rise-line">
              <span className="hl" style={{ ["--d" as string]: "200ms" }}>
                {hlWords.length > 1 && <span className="ember-sweep">{hlWords.slice(0, -1).join(" ")} </span>}
                <RollWord words={[hlWords[hlWords.length - 1], ...ROLL.filter((w) => w !== hlWords[hlWords.length - 1])]} />
              </span>
            </span>
          </h1>
          <p className="rise-in mx-auto mt-7 max-w-xl text-pretty text-[17px] leading-relaxed text-ink-500 sm:text-[19px] lg:mx-0" style={{ ["--d" as string]: "420ms" }}>
            {h.subtitle}
          </p>
          <div className="rise-in mt-9 flex flex-wrap justify-center gap-3 lg:justify-start" style={{ ["--d" as string]: "540ms" }}>
            <MagneticButton href={h.primaryCta.href} className="btn-shimmer">
              {h.primaryCta.label}
            </MagneticButton>
            <MagneticButton href={h.secondaryCta.href} variant="secondary">
              {h.secondaryCta.label}
            </MagneticButton>
          </div>
          <ul className="rise-in mt-9 flex flex-wrap justify-center gap-2 lg:justify-start" style={{ ["--d" as string]: "660ms" }}>
            {h.trust.map((t) => (
              <li key={t.label} className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-ink-600">
                <SiteIcon name={t.icon} className="h-4 w-4 text-jade" />
                {t.label}
              </li>
            ))}
          </ul>
        </div>

        {/* mockup: enters in 3D (rotateX settling flat), then floats in depth layers that follow the cursor */}
        <div className="mock-in relative">
          <Layer x={sx} y={sy} depth={12}>
            <LivePipeline />
          </Layer>
          <Layer x={sx} y={sy} depth={36} className="pointer-events-none absolute -bottom-[124px] -left-6 z-20 hidden w-[230px] md:block lg:-left-10">
            <ChartCard />
          </Layer>
          <Layer x={sx} y={sy} depth={26} className="pointer-events-none absolute -top-[88px] right-0 z-20 hidden w-[260px] md:block">
            <ToastStack />
          </Layer>
        </div>
      </Container>
    </section>
  );
}

const ROLL = ["smarter.", "faster.", "better."];

function Layer({ x, y, depth, className, children }: { x: MotionValue<number>; y: MotionValue<number>; depth: number; className?: string; children: React.ReactNode }) {
  const tx = useTransform(x, (v) => v * depth);
  const ty = useTransform(y, (v) => v * depth);
  return (
    <m.div style={{ x: tx, y: ty }} className={cn("will-change-transform", className)}>
      {children}
    </m.div>
  );
}

const STAGES = [
  { stage: "Sourced", dot: "bg-ink-400" },
  { stage: "Screened", dot: "bg-[rgb(var(--p-300))]" },
  { stage: "Interview", dot: "bg-jade" },
  { stage: "Hired", dot: "bg-saffron" },
];

const CANDIDATES = [
  { id: "AS", role: "React dev", score: 94 },
  { id: "KM", role: "Data analyst", score: 88 },
  { id: "VB", role: "QA engineer", score: 81 },
  { id: "NP", role: "DevOps", score: 90 },
  { id: "RG", role: "Java dev", score: 86 },
  { id: "PI", role: "UI designer", score: 79 },
  { id: "TD", role: "Product mgr", score: 84 },
];
const START = [0, 0, 1, 1, 2, 3, 0];

/** Illustrative live pipeline — cards move Sourced → Screened → Interview → Hired every few seconds */
function LivePipeline() {
  const reduce = useReducedMotion();
  const [cols, setCols] = useState(START);
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    if (reduce || navigator.webdriver) return;
    const t = setInterval(() => {
      setTurn((n) => n + 1);
      setCols((prev) => {
        const next = [...prev];
        const order = [...next.keys()].sort((a, b) => next[b] - next[a]);
        const hired = order.find((i) => next[i] === 3);
        if (hired !== undefined && next.filter((c) => c === 3).length > 1) next[hired] = 0;
        const mover = order.find((i) => next[i] < 3 && (turn + i) % 2 === 0) ?? order.find((i) => next[i] < 3);
        if (mover !== undefined) next[mover] += 1;
        return next;
      });
    }, 2200);
    return () => clearInterval(t);
  }, [reduce, turn]);

  return (
    <figure className="relative mx-auto w-full max-w-[760px]" aria-label="Illustration of candidates moving through a hiring pipeline">
      <div className="card-premium relative overflow-hidden rounded-[30px] p-4 shadow-pop sm:p-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-56 bg-gradient-to-b from-jade/15 to-transparent" />
        <div className="relative mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jade text-white shadow-glow sm:flex">
              <TrendingUp className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-ink-400">Hiring pipeline · live</p>
              <p className="truncate text-[16px] font-semibold text-ink-900">Senior React Developer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ScoreRing value={94} />
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-jade-50 px-2.5 py-1 text-[11.5px] font-medium text-jade-700 sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-jade" />
              </span>
              Live
            </span>
          </div>
        </div>

        <div className="relative grid grid-cols-4 gap-1.5 sm:gap-2.5">
          {STAGES.map((s, ci) => {
            const here = CANDIDATES.filter((_, i) => cols[i] === ci);
            return (
              <div key={s.stage} className="min-h-[200px] rounded-2xl bg-surface-3/70 p-1.5 sm:min-h-[290px] sm:p-2">
                <div className="mb-2 flex items-center justify-between gap-1 px-1 pt-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
                    <span className="truncate text-[10.5px] font-semibold text-ink-600 sm:text-[12px]">{s.stage}</span>
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
                      className={cn("rounded-xl border bg-surface p-1.5 sm:p-2.5", ci === 3 ? "border-saffron/50 shadow-[0_0_0_3px_rgb(var(--saffron)/0.12)]" : "border-line shadow-card")}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-jade to-[rgb(var(--p-800))] text-[8px] font-bold text-white sm:h-7 sm:w-7 sm:text-[10px]">{c.id}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[9px] font-medium text-ink-700 sm:text-[11.5px]">{c.role}</p>
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
      </div>

      <FloatingBadges
        badges={[
          { title: "Interview scheduled", sub: "Tomorrow, 11:00 AM", icon: "calendar", tone: "violet", className: "-top-[72px] left-4", delay: 3 },
          { title: "Offer accepted", sub: "Joining in 15 days", icon: "check", tone: "jade", className: "-bottom-[70px] right-0", delay: 6 },
        ]}
      />
      <figcaption className="sr-only">Candidate cards move from Sourced to Screened, Interview and Hired.</figcaption>
    </figure>
  );
}

/** Floating analytics card: a line chart that draws itself */
function ChartCard() {
  return (
    <div aria-hidden className="glass rounded-2xl p-4 shadow-pop">
      <p className="text-[11px] font-medium text-ink-500">Fill pipeline</p>
      <p className="text-[22px] font-semibold tracking-[-0.03em] text-ink-900">
        18 / 24 <span className="text-[12px] font-semibold text-jade-700">+32% this month</span>
      </p>
      <svg className="mt-1 h-14 w-full text-jade" viewBox="0 0 200 50" preserveAspectRatio="none">
        <defs>
          <linearGradient id="hero-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 42 L25 38 L50 40 L75 30 L100 32 L125 22 L150 24 L175 14 L200 8 L200 50 L0 50 Z" fill="url(#hero-area)" />
        <path className="draw-line" d="M0 42 L25 38 L50 40 L75 30 L100 32 L125 22 L150 24 L175 14 L200 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// illustrative applicants for the animated toast
const TOASTS = [
  { n: "Ananya R.", r: "Senior React Developer" },
  { n: "Kabir M.", r: "Data Analyst" },
  { n: "Meera S.", r: "QA Engineer" },
  { n: "Rohit P.", r: "DevOps Engineer" },
  { n: "Ishita K.", r: "Product Designer" },
];

/** "New application" toast that slides in every few seconds with a new name */
function ToastStack() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || navigator.webdriver) return;
    const t = setInterval(() => setI((n) => (n + 1) % TOASTS.length), 3600);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div aria-hidden className="relative h-[72px]">
      <AnimatePresence mode="popLayout">
        <m.div
          key={i}
          initial={{ opacity: 0, x: 60, scale: 0.94, filter: "blur(4px)" }}
          animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="glass absolute inset-x-0 top-0 flex items-start gap-3 rounded-2xl p-3 shadow-pop"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron-50 text-saffron-800">
            <BellRing className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-semibold text-ink-900">New application · {TOASTS[i].n}</span>
            <span className="block truncate text-[11.5px] text-ink-500">{TOASTS[i].r}</span>
          </span>
        </m.div>
      </AnimatePresence>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const r = 16;
  const len = 2 * Math.PI * r;
  return (
    <div className="relative h-11 w-11 shrink-0" title="Match score">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" className="stroke-ink-300/30" />
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" strokeLinecap="round" className="ring-fill stroke-jade" strokeDasharray={len} strokeDashoffset={len * (1 - value / 100)} style={{ ["--ring-len" as string]: len }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular text-ink-900">{value}</span>
      <span className="sr-only">Match score {value} out of 100</span>
    </div>
  );
}
