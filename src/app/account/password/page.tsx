import type { Metadata } from "next";
import { requireUser, roleHome } from "@/lib/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { ChangePasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Change password", robots: { index: false, follow: false } };

/** Change password — every role (staff, client, candidate) */
export default async function ChangePasswordPage() {
  const profile = await requireUser();
  const home = roleHome(profile.role);
  return (
    <AuthShell title="Change password" subtitle={`Signed in as ${profile.email}`} back={{ href: home, label: "Back to your account" }}>
      <ChangePasswordForm email={profile.email} home={home} />
    </AuthShell>
  );
}
