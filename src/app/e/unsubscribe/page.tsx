import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { verifyUnsubscribe } from "@/lib/email/tracking";

export const metadata: Metadata = { title: "Email preferences", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** "Unsubscribe" from an email — one confirming click (mail scanners open links; the GET itself changes nothing) */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ e?: string; s?: string; done?: string; error?: string }> }) {
  const sp = await searchParams;
  if (sp.done) return <AuthShell title="You're unsubscribed" subtitle="We won't email this address again." back={{ href: "/", label: "Go to the website" }}><p className="text-[14px] text-ink-600">Changed your mind? Write to us and we'll turn emails back on.</p></AuthShell>;
  const ok = !!sp.e && !!sp.s && verifyUnsubscribe(sp.e, sp.s) && !sp.error;
  if (!ok) return <AuthShell title="Link not valid" subtitle="Please use the link from your email." back={{ href: "/", label: "Go to the website" }}><span /></AuthShell>;
  return (
    <AuthShell title="Stop emails from Synerax?" subtitle={`We'll stop sending emails to ${sp.e}.`} back={{ href: "/", label: "Go to the website" }}>
      <form method="post" action="/api/e/unsubscribe" className="space-y-3">
        <input type="hidden" name="e" value={sp.e} />
        <input type="hidden" name="s" value={sp.s} />
        <button type="submit" className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-jade px-5 text-[14.5px] font-semibold text-white hover:brightness-110" data-testid="unsubscribe-confirm">
          Unsubscribe
        </button>
      </form>
    </AuthShell>
  );
}
