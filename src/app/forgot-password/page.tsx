import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter the email you use for Synerax Talent and we'll send you a reset link."
      back={{ href: "/login", label: "Back to sign in" }}
    >
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-ink-500">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-jade-700 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
