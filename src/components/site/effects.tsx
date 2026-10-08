"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const fancyPointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  !navigator.webdriver;

/** Lenis smooth scrolling — desktop only, loaded after the page is interactive, off for reduced motion */
export function SmoothScroll() {
  const path = usePathname();
  const lenis = useRef<{ scrollTo: (t: number | string | HTMLElement, o?: object) => void; raf: (t: number) => void; destroy: () => void } | null>(null);

  useEffect(() => {
    if (!fancyPointer()) return;
    let raf = 0;
    let cancelled = false;
    const start = () =>
      import("lenis").then(({ default: Lenis }) => {
        if (cancelled) return;
        const l = new Lenis({ duration: 1.05, smoothWheel: true, anchors: { offset: -80 } });
        lenis.current = l as unknown as typeof lenis.current;
        const loop = (t: number) => {
          l.raf(t);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      });
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const handle = idle ? idle(start) : window.setTimeout(start, 600);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (!idle) clearTimeout(handle as number);
      lenis.current?.destroy();
      lenis.current = null;
    };
  }, []);

  useEffect(() => {
    if (!location.hash) lenis.current?.scrollTo(0, { immediate: true });
  }, [path]);
  return null;
}

/** Soft glow that follows the cursor on desktop (transform only — no layout work) */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!fancyPointer()) return;
    const el = ref.current;
    if (!el) return;
    let x = innerWidth / 2,
      y = innerHeight / 3,
      tx = x,
      ty = y,
      raf = 0;
    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      el.style.opacity = "1";
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      el.style.transform = `translate3d(${x - 200}px, ${y - 200}px, 0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    const leave = () => (el.style.opacity = "0");
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[1] h-[400px] w-[400px] rounded-full opacity-0 transition-opacity duration-500 [background:radial-gradient(circle,rgb(var(--jade)/0.10),transparent_62%)] dark:[background:radial-gradient(circle,rgb(var(--jade)/0.16),transparent_62%)]"
    />
  );
}

/** Back-to-top button whose ring fills with scroll progress */
export function ScrollTopRing() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      setP(max > 0 ? Math.min(1, scrollY / max) : 0);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", on);
      removeEventListener("resize", on);
    };
  }, []);
  const show = p > 0.08;
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      className={cn(
        "fixed bottom-5 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-ink-700 shadow-pop backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:text-jade-700",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="2.5" className="stroke-line" />
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-jade" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
      </svg>
      <ArrowUp className="relative h-5 w-5" />
    </button>
  );
}
