"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, BadgeCheck, CalendarCheck, Check, Sparkles, X } from "lucide-react";
import { BrandMark } from "@/components/brand-logo";
import { LOADER_MS, WORDS } from "./intro-config";

/** The intro's visual layers (loader + register card), loaded in their own chunk by <SiteIntro>. */
export function IntroLayers({ phase, reduce, onLoaderShown, onClosePromo }: { phase: string; reduce: boolean; onLoaderShown: () => void; onClosePromo: () => void }) {
  return (
    <>
      <AnimatePresence>{phase === "loading" && <Loader key="loader" reduce={reduce} onShown={onLoaderShown} />}</AnimatePresence>
      <AnimatePresence>{phase === "promo" && <PromoCard key="promo" onClose={onClosePromo} />}</AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ loader */
function Loader({ reduce, onShown }: { reduce: boolean; onShown: () => void }) {
  const [pct, setPct] = useState(0);
  const [word, setWord] = useState(0);
  useEffect(() => onShown(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const start = performance.now();
    const total = reduce ? 800 : LOADER_MS - 350;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / total);
      setPct(Math.round(100 * (1 - Math.pow(1 - t, 2.4)))); // eases in fast, settles at 100
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const w = setInterval(() => setWord((i) => (i + 1) % WORDS.length), 760);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(w);
    };
  }, [reduce]);

  return (
    <m.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#1F150A] text-[#FDFBD4]"
      initial={{ opacity: 1 }}
      exit={{ y: "-100%", transition: { duration: reduce ? 0.2 : 0.75, ease: [0.76, 0, 0.24, 1] } }}
      role="status"
      aria-live="polite"
      aria-label="Loading Synerax TalentBase"
      data-testid="site-loader"
    >
      {/* ambient glow + grain */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <m.div
          className="absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(192_88_0/0.35),transparent_62%)] blur-2xl"
          animate={reduce ? undefined : { scale: [0.85, 1.08, 0.95], opacity: [0.6, 1, 0.8] }}
          transition={{ duration: 3.2, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgb(253_251_212/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(253_251_212/0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        {/* mark inside a drawing ring */}
        <div className="relative h-[132px] w-[132px]">
          <svg viewBox="0 0 132 132" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
            <circle cx="66" cy="66" r="60" fill="none" stroke="rgb(253 251 212 / 0.10)" strokeWidth="2" />
            <m.circle
              cx="66"
              cy="66"
              r="60"
              fill="none"
              stroke="url(#ember)"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: pct / 100 }}
              transition={{ duration: 0.2, ease: "linear" }}
            />
            <defs>
              <linearGradient id="ember" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#E8862E" />
                <stop offset="100%" stopColor="#C05800" />
              </linearGradient>
            </defs>
          </svg>
          <m.div
            className="absolute inset-[22px] flex items-center justify-center"
            data-brand-invert
            initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 16, delay: 0.15 }}
          >
            <span className="on-dark">
              <BrandMark size={84} />
            </span>
          </m.div>
          {!reduce && (
            <m.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-[#E8862E]/40"
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
            />
          )}
        </div>

        {/* wordmark, letter by letter */}
        <m.h1
          className="mt-8 flex flex-wrap justify-center text-[30px] font-semibold tracking-[-0.03em] sm:text-[40px]"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.035, delayChildren: 0.35 } } }}
          aria-label="Synerax TalentBase"
        >
          {"Synerax TalentBase".split("").map((ch, i) => (
            <m.span
              key={i}
              aria-hidden
              className={i >= 14 ? "bg-gradient-to-r from-[#E8862E] to-[#C05800] bg-clip-text text-transparent" : i >= 8 ? "text-[#FDFBD4]/75" : ""}
              variants={{ hidden: { y: "0.6em", opacity: 0, filter: "blur(6px)" }, show: { y: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
            >
              {ch === " " ? " " : ch}
            </m.span>
          ))}
        </m.h1>

        {/* rotating words */}
        <div className="mt-3 h-6 overflow-hidden text-[13px] font-semibold uppercase tracking-[0.28em] text-[#E8862E]">
          <AnimatePresence mode="wait">
            <m.p key={word} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ duration: 0.35 }}>
              {WORDS[word]}
            </m.p>
          </AnimatePresence>
        </div>

        {/* progress */}
        <div className="mt-10 w-[min(320px,70vw)]">
          <div className="h-[3px] overflow-hidden rounded-full bg-[#FDFBD4]/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#C05800] via-[#E8862E] to-[#FDFBD4] shadow-[0_0_16px_rgb(232_134_46/0.7)]" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2.5 flex justify-between text-[11px] font-medium tabular-nums tracking-wider text-[#FDFBD4]/50">
            <span>Staffing & recruitment partner</span>
            <span>{pct}%</span>
          </div>
        </div>
      </div>
    </m.div>
  );
}

/* ------------------------------------------------------------------ promo card */
const PERKS = ["Free profile in 2 minutes — we read your CV for you", "Matched to live roles that fit your skills & salary", "Track every application, stage by stage", "A real recruiter guiding you to the offer", "Hand-picked roles from companies across IT, BFSI, healthcare & more"];

function PromoCard({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <m.div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="site-promo">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-[#1F150A]/70 backdrop-blur-[6px]" />
      <m.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-title"
        className="relative grid max-h-[calc(100dvh-24px)] w-full max-w-[980px] overflow-y-auto rounded-[28px] border border-[#FDFBD4]/15 bg-[#1F150A] text-[#FDFBD4] shadow-[0_40px_120px_-30px_rgb(0_0_0/0.8)] md:grid-cols-[1fr_1.05fr] md:overflow-hidden"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        data-lenis-prevent
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FDFBD4]/10 text-[#FDFBD4] transition hover:bg-[#FDFBD4]/20"
        >
          <X className="h-5 w-5" />
        </button>

        {/* illustration panel */}
        <Visual />

        {/* content */}
        <div className="flex flex-col justify-center p-7 sm:p-10">
          <p className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.28em] text-[#E8862E]">
            <span className="h-px w-8 bg-[#E8862E]" /> Free for candidates
          </p>
          <h2 id="promo-title" className="mt-4 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[42px]">
            Your next role,
            <br />
            <span className="bg-gradient-to-r from-[#E8862E] to-[#C05800] bg-clip-text text-transparent">found for you.</span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#FDFBD4]/70">Create one profile and get matched to pre-screened openings — with a recruiter in your corner.</p>
          <ul className="mt-6 space-y-3">
            {PERKS.map((p, i) => (
              <m.li key={p} className="flex items-start gap-3 text-[14.5px] text-[#FDFBD4]/90" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.07 }}>
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#E8862E]" aria-hidden /> {p}
              </m.li>
            ))}
          </ul>
          <dl className="mt-7 grid grid-cols-3 divide-x divide-[#FDFBD4]/10 rounded-2xl border border-[#FDFBD4]/10 bg-[#FDFBD4]/[0.04] py-3.5">
            {[
              ["2 min", "to create your profile"],
              ["100%", "profiles checked by a recruiter"],
              ["1 : 1", "a recruiter in your corner"],
            ].map(([k, v], i) => (
              <m.div key={k} className="px-3 text-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 + i * 0.08 }}>
                <dt className="sr-only">{v}</dt>
                <dd className="bg-gradient-to-r from-[#E8862E] to-[#C05800] bg-clip-text text-[26px] font-semibold leading-none tracking-[-0.03em] text-transparent">{k}</dd>
                <dd className="mt-1.5 text-[11.5px] leading-snug text-[#FDFBD4]/60">{v}</dd>
              </m.div>
            ))}
          </dl>
          <Link
            href="/register"
            onClick={onClose}
            className="group mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E8862E] to-[#C05800] px-6 text-[16px] font-semibold text-white shadow-[0_16px_40px_-12px_rgb(232_134_46/0.8)] transition hover:brightness-110"
          >
            Register for free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <p className="mt-3 text-center text-[12.5px] text-[#FDFBD4]/50">
            Hiring instead?{" "}
            <Link href="/employers" onClick={onClose} className="font-semibold text-[#E8862E] hover:underline">
              Talk to our team
            </Link>
          </p>
        </div>
      </m.div>
    </m.div>
  );
}

/** CSS illustration (no stock photo): a candidate card, a match ring and floating status chips */
function Visual() {
  return (
    <div className="relative hidden min-h-[560px] overflow-hidden bg-[radial-gradient(120%_90%_at_20%_10%,#5A3412_0%,#38240D_45%,#1F150A_100%)] md:block" aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(rgb(253_251_212/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(253_251_212/0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <m.div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-[#E8862E]/25 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 6, repeat: Infinity }} />

      {/* back card */}
      <m.div
        className="absolute left-[18%] top-[16%] w-[62%] rotate-[-6deg] rounded-2xl border border-[#FDFBD4]/10 bg-[#FDFBD4]/[0.06] p-4 backdrop-blur"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="h-2.5 w-24 rounded-full bg-[#FDFBD4]/20" />
        <div className="mt-2 h-2 w-36 rounded-full bg-[#FDFBD4]/10" />
      </m.div>

      {/* main profile card */}
      <m.div
        className="absolute left-[12%] top-[26%] w-[76%] rounded-3xl border border-[#FDFBD4]/15 bg-[#FDFBD4] p-5 text-[#1F150A] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]"
        initial={{ opacity: 0, y: 40, rotate: 4 }}
        animate={{ opacity: 1, y: [0, -6, 0], rotate: 0 }}
        transition={{ opacity: { delay: 0.25 }, rotate: { delay: 0.25, type: "spring" }, y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 } }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#E8862E] to-[#C05800] text-[15px] font-bold text-white">YOU</span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">Your profile</p>
            <p className="text-[12px] text-[#6B5640]">Salesforce Developer · 5 yrs</p>
          </div>
          <div className="relative h-14 w-14">
            <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
              <circle cx="28" cy="28" r="23" fill="none" stroke="#EDE5D3" strokeWidth="5" />
              <m.circle cx="28" cy="28" r="23" fill="none" stroke="#C05800" strokeWidth="5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 0.92 }} transition={{ delay: 0.6, duration: 1.4, ease: "easeOut" }} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold">92%</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {["Salesforce", "Apex", "LWC", "FSL"].map((s) => (
            <span key={s} className="rounded-full bg-[#FAF6EC] px-2.5 py-1 text-[11.5px] font-medium text-[#6B5640] ring-1 ring-[#EDE5D3]">
              {s}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-1">
          {["Applied", "Review", "Shared", "Interview", "Offer"].map((s, i) => (
            <div key={s} className="flex-1">
              <m.div className="h-1.5 rounded-full bg-[#EDE5D3]" style={{ originX: 0 }}>
                <m.div className="h-full rounded-full bg-[#C05800]" initial={{ width: 0 }} animate={{ width: i <= 3 ? "100%" : "0%" }} transition={{ delay: 0.8 + i * 0.18, duration: 0.4 }} />
              </m.div>
              <p className={`mt-1 text-[9.5px] font-medium ${i === 3 ? "text-[#C05800]" : "text-[#6B5640]/70"}`}>{s}</p>
            </div>
          ))}
        </div>
      </m.div>

      {/* floating chips */}
      <m.div className="absolute bottom-[16%] left-[8%] flex items-center gap-2.5 rounded-2xl bg-[#FDFBD4] px-4 py-3 text-[#1F150A] shadow-xl" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, y: [0, -5, 0] }} transition={{ opacity: { delay: 1.2 }, x: { delay: 1.2 }, y: { duration: 4, repeat: Infinity, delay: 1.6 } }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2F7D4A]/15 text-[#2F7D4A]">
          <CalendarCheck className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-[12.5px] font-semibold">Interview scheduled</span>
          <span className="block text-[11px] text-[#6B5640]">Tomorrow, 11:00 AM</span>
        </span>
      </m.div>
      <m.div className="absolute right-[7%] top-[11%] flex items-center gap-2 rounded-full bg-[#1F150A]/80 px-3.5 py-2 text-[12px] font-semibold text-[#FDFBD4] ring-1 ring-[#FDFBD4]/15 backdrop-blur" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
        <Sparkles className="h-3.5 w-3.5 text-[#E8862E]" /> 3 new matches
      </m.div>
      <m.div className="absolute bottom-[8%] right-[8%] flex items-center gap-2 rounded-full bg-[#E8862E] px-3.5 py-2 text-[12px] font-semibold text-white shadow-lg" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.5, type: "spring" }}>
        <BadgeCheck className="h-4 w-4" /> Profile pre-screened
      </m.div>
    </div>
  );
}
