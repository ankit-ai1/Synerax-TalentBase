import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { validOptOut } from "@/lib/candidates/invite";

export const metadata: Metadata = { title: "Portal invites", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * "I don't want an account" from the invite email. Asks for one click first — mail scanners open links
 * automatically, so the GET itself never changes anything.
 */
export default async function OptOutPage({ searchParams }: { searchParams: Promise<{ c?: string; s?: string; done?: string; error?: string }> }) {
  const sp = await searchParams;
  if (sp.done) {
    return (
      <AuthShell title="Done" subtitle="We won't send you any more portal invites." back={{ href: "/", label: "Go to the website" }}>
        <p className="text-[14px] text-ink-600">
          Changed your mind? You can still{" "}
          <Link href="/register" className="font-semibold text-jade-700 hover:underline">
            create an account
          </Link>{" "}
          any time.
        </p>
      </AuthShell>
    );
  }
  const ok = !!sp.c && !!sp.s && validOptOut(sp.c, sp.s);
  if (!ok || sp.error) {
    return (
      <AuthShell title="Link not valid" subtitle="This link is incomplete or has been changed." back={{ href: "/", label: "Go to the website" }}>
        <p className="text-[14px] text-ink-600">
          Please use the link from your email, or{" "}
          <Link href="/contact" className="font-semibold text-jade-700 hover:underline">
            contact us
          </Link>
          .
        </p>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Don't want a portal account?" subtitle="Your profile stays with our recruitment team; we just won't invite you to the candidate portal again." back={{ href: "/", label: "Go to the website" }}>
      <form method="post" action="/api/invite/opt-out" className="space-y-3">
        <input type="hidden" name="c" value={sp.c} />
        <input type="hidden" name="s" value={sp.s} />
        <button type="submit" className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-jade px-5 text-[14.5px] font-semibold text-white hover:brightness-110" data-testid="opt-out-confirm">
          Stop portal invites
        </button>
      </form>
    </AuthShell>
  );
}
