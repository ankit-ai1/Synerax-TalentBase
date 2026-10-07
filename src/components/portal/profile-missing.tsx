import Link from "next/link";

/** Shown when a verified candidate's profile couldn't be loaded / created */
export function ProfileMissing() {
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
      <h1 className="text-xl font-semibold text-ink-900">We&apos;re setting up your profile</h1>
      <p className="mt-2 text-[15px] text-ink-500">
        This usually takes a moment — try refreshing the page. If it still doesn&apos;t appear, please{" "}
        <Link href="/contact" className="font-semibold text-jade-700 hover:underline">
          contact Synerax
        </Link>
        .
      </p>
    </div>
  );
}
