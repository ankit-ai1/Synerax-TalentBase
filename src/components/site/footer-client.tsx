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
// SYNERAX in the logo's letterforms, traced from it
const WM_LETTERS = "M190 9L183 47C160 44 130 42 100 42L65 42C48 42 41 49 41 62C41 75 48 82 65 82L130 82C175 82 197 104 197 143C197 182 175 204 130 204L85 204C50 204 25 200 0 194L9 157C35 162 60 164 85 164L130 164C147 164 156 157 156 143C156 129 147 122 130 122L65 122C20 122 0 100 0 62C0 24 20 2 65 2L100 2C135 2 165 4 190 9ZM222 4L272 4L335 84L398 4L448 4L355 124L355 204L315 204L315 124ZM481 204L481 4L523 4L651 140L651 4L692 4L692 204L651 204L522 68L522 204ZM736 4L902 4L902 43L736 43ZM736 164L902 164L902 204L736 204ZM945 4L1055 4C1105 4 1130 30 1130 70C1130 105 1112 126 1078 133L1130 204L1082 204L1031 137L1002 137L1002 102L1055 102C1078 102 1090 90 1090 70C1090 50 1078 38 1055 38L986 38L986 204L945 204ZM1155 204L1257 4L1296 4L1396 204L1350 204L1277 62L1203 204ZM1420 4L1472 4L1528 72L1584 4L1636 4L1554 102L1640 204L1588 204L1528 134L1470 204L1420 204L1502 102ZM736 84L902 84L902 122L736 122Z";

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
    on(); // first measurement on the next frame, not during hydration (no forced layout)
    addEventListener("scroll", on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", on);
    };
  }, []);
  return (
    // the logo's own letterforms as vector shapes: sharp at any width
    <div ref={ref} aria-hidden className="select-none">
      <svg viewBox="0 0 1640 208" className="block h-auto w-full overflow-visible" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="wm-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#FDFBD4" />
            <stop offset="0.45" stopColor="rgb(var(--accent-a))" />
            <stop offset="0.8" stopColor="rgb(var(--ember-a))" />
            <stop offset="1" stopColor="rgb(var(--ember-b))" />
          </linearGradient>
          {/* liquid-metal shine that passes through the filled letters */}
          <linearGradient id="wm-shine" gradientUnits="userSpaceOnUse" x1="0" x2="426" y1="0" y2="98">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
            <animateTransform attributeName="gradientTransform" type="translate" values="-656 0; 2132 0; 2132 0" keyTimes="0; 0.6; 1" dur="6s" repeatCount="indefinite" />
          </linearGradient>
          <clipPath id="wm-clip">
            <rect x="0" y="0" width="1640" height="208" className="wordmark-fill" />
          </clipPath>
        </defs>
        <path d={WM_LETTERS} fill="none" stroke="rgb(var(--accent-a) / 0.45)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <g clipPath="url(#wm-clip)">
          <path d={WM_LETTERS} fill="url(#wm-grad)" />
          <path d={WM_LETTERS} fill="url(#wm-shine)" className="motion-reduce:hidden" />
        </g>
      </svg>
    </div>
  );
}
