"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

/** Fallback for any unexpected error while rendering a page: a friendly screen with retry instead of a blank crash */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">Something went wrong</h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-500">
        Please try again. If it keeps happening, let us know and quote reference {error.digest ?? "n/a"}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-xl bg-jade px-5 text-[14.5px] font-semibold text-white hover:brightness-110">
          <RotateCcw className="h-4 w-4" aria-hidden /> Try again
        </button>
        <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-line-strong bg-surface px-5 text-[14.5px] font-semibold text-ink-800 hover:bg-surface-2">
          Go home
        </Link>
      </div>
    </main>
  );
}
