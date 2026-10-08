"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Tag = "div" | "section" | "li" | "ul" | "ol" | "article" | "header" | "p" | "h2" | "h3" | "span" | "figure";

/**
 * Scroll-reveal wrapper. Content is VISIBLE by default — it only starts hidden
 * once <RevealObserver> has confirmed it can reveal it (see globals.css).
 */
export function Reveal({
  as: Comp = "div",
  children,
  className,
  delay = 0,
  variant = "up",
  id,
  style,
  onMouseLeave,
}: {
  as?: Tag;
  children?: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "fade" | "scale";
  id?: string;
  style?: React.CSSProperties;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
}) {
  return (
    <Comp id={id} onMouseLeave={onMouseLeave} data-reveal={variant === "up" ? "" : variant} className={className} style={{ ...style, ["--d" as string]: `${delay}ms` }}>
      {children}
    </Comp>
  );
}

/**
 * Turns on scroll reveal for the page. Skipped entirely (everything stays visible)
 * for reduced motion, automated browsers/screenshots and when IntersectionObserver
 * is unavailable. Printing reveals everything.
 */
export function RevealObserver() {
  const path = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || navigator.webdriver || !("IntersectionObserver" in window)) {
      root.classList.remove("reveal-on");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    const scan = () => document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    root.classList.add("reveal-on");
    scan();

    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    const showAll = () => document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"));
    window.addEventListener("beforeprint", showAll);

    // Fallback for fast scrolls / anchor jumps: anything at or above the fold is revealed,
    // even if the observer never saw it intersect.
    let frame = 0;
    const sweep = () => {
      frame = 0;
      const limit = window.innerHeight * 0.95;
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => {
        if (el.getBoundingClientRect().top < limit) {
          el.classList.add("is-in");
          io.unobserve(el);
        }
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sweep);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    const late = setTimeout(sweep, 400);

    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(late);
      window.removeEventListener("beforeprint", showAll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [path]);

  return null;
}
