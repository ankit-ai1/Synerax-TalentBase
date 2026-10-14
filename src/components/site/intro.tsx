"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { LOADER_KEY, LOADER_MS, PROMO_KEY, read, write } from "./intro-config";

/**
 * First-visit experience on the public website:
 *  1. a premium animated loading screen (~3.3 s, once per browser session)
 *  2. then a "Register free" card (at most once a day; never on /register)
 * The page renders underneath the whole time (SEO + no layout shift); both layers are client-only.
 * This file only decides WHEN; the visuals live in ./intro-views and load in their own chunk, fetched the moment
 * they are needed. The CSS boot screen stays up until the animated loader is actually on screen.
 */
const loadViews = () => import("./intro-views");
const IntroLayers = dynamic(() => loadViews().then((m) => m.IntroLayers), { ssr: false });
const clearBoot = () => document.documentElement.removeAttribute("data-intro");

export function SiteIntro() {
  const path = usePathname();
  const [phase, setPhase] = useState<"idle" | "loading" | "promo" | "done">("idle");
  const [active, setActive] = useState(false);
  const reduce = useRef(false);
  const promoDue = useRef(false);
  const shown = useRef(false);

  useEffect(() => {
    // automated browsers (tests, crawlers) skip the intro
    if (navigator.webdriver) return setPhase("done");
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    promoDue.current = path !== "/register" && Date.now() - Number(read(PROMO_KEY, "local") || 0) > 24 * 3600e3;
    if (!read(LOADER_KEY, "session")) {
      write(LOADER_KEY, "1", "session");
      loadViews();
      setActive(true);
      setPhase("loading");
      // never leave the boot screen up if the visuals can't load
      const t = setTimeout(() => {
        if (!shown.current) {
          clearBoot();
          setPhase("done");
        }
      }, 10000);
      return () => clearTimeout(t);
    }
    if (promoDue.current) {
      loadViews();
      setActive(true);
      const t = setTimeout(() => setPhase("promo"), 1200);
      return () => clearTimeout(t);
    }
    setPhase("done");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the loader is on screen: hand over from the boot screen and run the same 3.3 s as before
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLoaderShown = useCallback(() => {
    if (shown.current) return;
    shown.current = true;
    clearBoot();
    timer.current = setTimeout(() => setPhase(promoDue.current ? "promo" : "done"), reduce.current ? 900 : LOADER_MS);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (phase === "done" || phase === "promo") clearBoot();
  }, [phase]);

  // lock page scroll while an overlay is up
  useEffect(() => {
    if (phase !== "loading" && phase !== "promo") return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [phase]);

  const closePromo = useCallback(() => {
    write(PROMO_KEY, String(Date.now()), "local");
    setPhase("done");
  }, []);

  if (!active) return null;
  return <IntroLayers phase={phase} reduce={reduce.current} onLoaderShown={onLoaderShown} onClosePromo={closePromo} />;
}
