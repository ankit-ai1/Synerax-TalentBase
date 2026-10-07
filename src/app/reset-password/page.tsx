import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you don't use anywhere else." back={null}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
