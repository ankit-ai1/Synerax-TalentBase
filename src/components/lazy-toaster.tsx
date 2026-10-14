"use client";

import dynamic from "next/dynamic";

/** Same Toaster, loaded in its own chunk right after hydration (keeps it out of the first-load JS) */
const Toaster = dynamic(() => import("sonner").then((m) => m.Toaster), { ssr: false });

export function LazyToaster() {
  return <Toaster position="bottom-right" closeButton toastOptions={{ className: "!rounded-xl !border-line !bg-surface !text-ink-800 !shadow-pop" }} />;
}
