"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Route transition: a graphite panel with the wordmark wipes across (≈0.85s), then
 * unmounts itself. It is pointer-events:none, skipped on first load and for reduced motion,
 * and has a timeout fallback so it can never stay on screen.
 */
export function RouteWipe() {
  const path = usePathname();
  const first = useRef(true);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setKey((k) => k + 1);
  }, [path]);
  useEffect(() => {
    if (!key) return;
    const t = setTimeout(() => setKey(0), 1100);
    return () => clearTimeout(t);
  }, [key]);
  if (!key) return null;
  return (
    <div key={key} aria-hidden className="page-wipe" onAnimationEnd={(e) => e.target === e.currentTarget && setKey(0)}>
      <span>Synerax</span>
    </div>
  );
}
