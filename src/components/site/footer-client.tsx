"use client";

import { useEffect, useState } from "react";
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
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        autoComplete="email"
        className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-[14px] text-white placeholder:text-white/35 focus:border-jade focus:outline-none focus:ring-2 focus:ring-jade/30"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-jade px-4 text-[14px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
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
