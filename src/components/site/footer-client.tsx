"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Newsletter sign-up — saved as a website lead (type "contact", enquiry "Other") */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contact",
          name: "Newsletter subscriber",
          email,
          enquiry: "Other",
          message: "Newsletter sign-up request from the website footer.",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Couldn't subscribe right now.");
      setDone(true);
      setEmail("");
      toast.success("You're subscribed — thank you!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't subscribe right now.");
    } finally {
      setLoading(false);
    }
  }

  if (done) return <p className="rounded-xl border border-jade/30 bg-jade-50 px-4 py-3 text-sm text-jade-700">Thanks! You&apos;re on the list.</p>;

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md gap-2">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <span className="conn-input min-w-0 flex-1">
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        autoComplete="email"
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 text-[14px] text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none"
      />
      <span className="conn-line" aria-hidden />
      </span>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-jade px-4 text-[14px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        Subscribe
      </button>
    </form>
  );
}

export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 800);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label="Back to top"
      className={cn(
        "fixed bottom-5 right-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/90 text-ink-700 shadow-pop backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:text-ink-900",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
      tabIndex={show ? 0 : -1}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

/** Giant outlined SYNERAX wordmark that fills with the brand gradient as you reach the bottom */
export function FooterWordmark() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.webdriver) {
      el.style.setProperty("--fill", "1");
      return;
    }
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight * 0.35)));
      el.style.setProperty("--fill", p.toFixed(3));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    addEventListener("scroll", on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", on);
    };
  }, []);
  return (
    // SVG text with textLength fits the container width exactly at every viewport (never clipped)
    <div ref={ref} aria-hidden className="select-none">
      <svg viewBox="0 0 1000 176" className="block h-auto w-full overflow-visible" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="wm-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#FDFBD4" />
            <stop offset="0.45" stopColor="rgb(var(--accent-a))" />
            <stop offset="0.8" stopColor="rgb(var(--ember-a))" />
            <stop offset="1" stopColor="rgb(var(--ember-b))" />
          </linearGradient>
          {/* liquid-metal shine that passes through the filled letters */}
          <linearGradient id="wm-shine" gradientUnits="userSpaceOnUse" x1="0" x2="260" y1="0" y2="60">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
            <animateTransform attributeName="gradientTransform" type="translate" values="-400 0; 1300 0; 1300 0" keyTimes="0; 0.6; 1" dur="6s" repeatCount="indefinite" />
          </linearGradient>
          <clipPath id="wm-clip">
            <rect x="0" y="0" width="1000" height="176" className="wordmark-fill" />
          </clipPath>
        </defs>
        <text x="6" y="168" textLength="988" lengthAdjust="spacingAndGlyphs" fontSize="214" fontWeight="700" fill="none" stroke="rgb(var(--accent-a) / 0.45)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" style={{ letterSpacing: "-0.04em" }}>
          SYNERAX
        </text>
        <text x="6" y="168" textLength="988" lengthAdjust="spacingAndGlyphs" fontSize="214" fontWeight="700" fill="url(#wm-grad)" clipPath="url(#wm-clip)" style={{ letterSpacing: "-0.04em" }}>
          SYNERAX
        </text>
        <text x="6" y="168" textLength="988" lengthAdjust="spacingAndGlyphs" fontSize="214" fontWeight="700" fill="url(#wm-shine)" clipPath="url(#wm-clip)" className="motion-reduce:hidden" style={{ letterSpacing: "-0.04em", mixBlendMode: "overlay" }}>
          SYNERAX
        </text>
      </svg>
    </div>
  );
}
