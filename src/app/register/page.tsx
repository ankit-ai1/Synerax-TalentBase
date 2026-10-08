import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterWizard } from "./register-wizard";

export const metadata: Metadata = {
  title: "Create your candidate account",
  description: "Register with Synerax TalentBase to get matched with jobs, apply in one click and track every application.",
  robots: { index: true, follow: true },
};

export const revalidate = 3600;

export default async function RegisterPage() {
  // skills master for the picker (non-sensitive; read server-side so signed-out visitors get it)
  const { data } = await createAdminClient().from("skills").select("name").order("name").limit(1000);
  const skills = (data ?? []).map((s) => s.name as string);

  return (
    <AuthShell
      width="lg"
      title="Create your candidate account"
      subtitle={
        <>
          Upload your CV and we’ll fill in most of it. Already registered?{" "}
          <Link href="/login" className="font-semibold text-jade-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterWizard skills={skills} />
    </AuthShell>
  );
}
