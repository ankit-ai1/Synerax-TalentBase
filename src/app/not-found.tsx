import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { site } from "@/content/site";

export const metadata = { title: "Page not found", robots: { index: false, follow: false } };

/** Public 404 — shown for any URL that doesn't exist */
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="hairline-grid absolute inset-0 [mask-image:radial-gradient(60%_50%_at_50%_40%,black,transparent)]" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-jade/20 blur-3xl" />
      </div>
      <div className="relative">
        <p className="bg-gradient-to-b from-ink-900 to-ink-400 bg-clip-text text-[96px] font-semibold leading-none tracking-[-0.05em] text-transparent sm:text-[140px]">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">This page doesn&apos;t exist</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-500">The link may be broken or the page may have moved. Let&apos;s get you back on track.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-xl bg-jade px-5 text-[14.5px] font-semibold text-white shadow-glow hover:brightness-110">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {site.name}
          </Link>
          <Link href="/contact" className="inline-flex h-11 items-center rounded-xl border border-line-strong bg-surface px-5 text-[14.5px] font-semibold text-ink-800 hover:bg-surface-2">
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}
