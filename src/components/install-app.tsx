"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { OPEN_INSTALL_EVENT } from "@/lib/install";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
declare global {
  interface Window {
    __installPrompt?: InstallEvent | null;
  }
}

const DISMISS_KEY = "install-banner-dismissed-at";
const COOLDOWN_MS = 3 * 86400e3; // a dismissed banner comes back after 3 days (Chrome's own stays away for months)

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const dismissedRecently = () => {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < COOLDOWN_MS;
  } catch {
    return false;
  }
};

/** Install banner + steps for browsers without a one-tap install. Open it from anywhere with the OPEN_INSTALL_EVENT window event. */
export function InstallApp() {
  const path = usePathname();
  const [mode, setMode] = useState<"hidden" | "banner" | "steps">("hidden");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (navigator.webdriver) return;
    // no fetch handler: it only makes the site installable in more browsers, nothing is cached
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onReady = () => {
      setReady(true);
      if (!dismissedRecently()) setMode((m) => (m === "hidden" ? "banner" : m));
    };
    const onInstalled = () => {
      window.__installPrompt = null;
      setReady(false);
      setMode("hidden");
    };
    const onOpen = () => {
      const e = window.__installPrompt;
      if (e) void install(e);
      else setMode("steps");
    };
    if (window.__installPrompt) onReady();
    // iPhone has no install event: offer the Share steps instead
    else if (isIos() && !dismissedRecently()) setMode("banner");
    addEventListener("install-ready", onReady);
    addEventListener("appinstalled", onInstalled);
    addEventListener(OPEN_INSTALL_EVENT, onOpen);
    return () => {
      removeEventListener("install-ready", onReady);
      removeEventListener("appinstalled", onInstalled);
      removeEventListener(OPEN_INSTALL_EVENT, onOpen);
    };
  }, []);

  async function install(e: InstallEvent) {
    setMode("hidden");
    await e.prompt();
    const { outcome } = await e.userChoice;
    // the event works once; the browser fires a new one on a later page load
    window.__installPrompt = null;
    setReady(false);
    if (outcome === "dismissed") remember();
  }
  function remember() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }
  const close = () => {
    remember();
    setMode("hidden");
  };

  if (mode === "hidden" || path.startsWith("/print")) return null;
  const ios = typeof navigator !== "undefined" && isIos();
  const canPrompt = ready && !!window.__installPrompt;

  return (
    <div role="dialog" aria-label="Install the Synerax app" className="fixed bottom-4 left-4 right-20 z-[58] max-w-sm rounded-2xl border border-line bg-surface p-3.5 shadow-[0_24px_50px_-20px_rgb(20_12_4/0.45)] sm:right-auto sm:w-[360px]" data-testid="install-app">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl border border-line" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink-900">Install the Synerax app</p>
          {canPrompt ? (
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">Open jobs and your profile right from your home screen.</p>
          ) : ios ? (
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">
              In Safari, tap <Share className="inline h-3.5 w-3.5 align-[-2px]" aria-label="Share" /> Share, then <b className="font-semibold text-ink-700">Add to Home Screen</b>.
            </p>
          ) : (
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">
              Open your browser&apos;s menu (<b className="font-semibold text-ink-700">⋮</b>) and tap <b className="font-semibold text-ink-700">Install app</b> or <b className="font-semibold text-ink-700">Add to Home screen</b>. If you don&apos;t see it, the app may already be installed.
            </p>
          )}
          {canPrompt && (
            <button onClick={() => install(window.__installPrompt!)} className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-jade px-4 text-[13px] font-semibold text-white hover:brightness-110">
              <Download className="h-3.5 w-3.5" aria-hidden /> Install
            </button>
          )}
        </div>
        <button onClick={close} aria-label="Close" className="-mr-1 -mt-1 rounded-full p-1.5 text-ink-400 hover:bg-surface-2 hover:text-ink-700">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
