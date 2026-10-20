import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetPasswordForm } from "@/components/auth/password-forms";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set your password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Landing page of the portal invite email (reached via /auth/callback, which signs the candidate in) */
export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ existing?: string; mode?: string }> }) {
  const sp = await searchParams;
  const { data } = await (await createClient()).auth.getUser();
  if (sp.mode === "client") {
    return (
      <AuthShell title="Set your password" subtitle="You've been added to your company's hiring workspace on Synerax TalentBase. Choose a password to continue." back={null}>
        <SetPasswordForm existing={false} needsConsent={false} mode="client" />
      </AuthShell>
    );
  }
  let needsConsent = true;
  if (data.user) {
    const { data: c } = await createAdminClient().from("candidates").select("consent_at").eq("user_id", data.user.id).maybeSingle();
    needsConsent = !c?.consent_at;
  }
  const existing = sp.existing === "1";
  return (
    <AuthShell
      title={existing ? "Welcome back" : "Set your password"}
      subtitle={existing ? "Your Synerax profile is now linked to this login." : "Synerax has created your profile. Choose a password to track your applications and get matched to jobs."}
      back={null}
    >
      <SetPasswordForm existing={existing} needsConsent={needsConsent} />
    </AuthShell>
  );
}
