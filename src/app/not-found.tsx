import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-ink-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-800">This page or candidate was not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-400">It may have been deleted, or the link is incorrect.</p>
      <Link href="/candidates" className="mt-6 inline-flex h-10 items-center rounded-lg bg-ink-900 px-4 text-sm font-medium text-surface hover:bg-ink-800">
        Go to candidates
      </Link>
    </div>
  );
}
