import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { CandidateRegistrationForm } from "@/components/candidate/registration-form";
import { site } from "@/content/site";
import { breadcrumbLd, ldJson, organizationLd, siteBase } from "@/lib/seo/jsonld";
import { ogMeta } from "@/lib/seo/og";

const DESCRIPTION = "Register with Synerax TalentBase to get matched with jobs, apply in one click and track every application.";

export const metadata: Metadata = {
  title: { absolute: "Register free as a candidate · Synerax" },
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: "/register" },
  ...ogMeta("Register free as a candidate · Synerax", "/register", DESCRIPTION),
};

const LD = ldJson([
  organizationLd(),
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteBase()}/register`,
    url: `${siteBase()}/register`,
    name: "Create your candidate account",
    description: DESCRIPTION,
    isPartOf: { "@type": "WebSite", name: site.name, url: siteBase() },
    potentialAction: { "@type": "RegisterAction", target: `${siteBase()}/register`, name: "Register as a candidate" },
  },
  breadcrumbLd([
    { name: "Home", url: "/" },
    { name: "Register", url: "/register" },
  ]),
]);

export const revalidate = 3600;

export default async function RegisterPage() {
  // skills master for the picker (non-sensitive; read server-side so signed-out visitors get it)
  const { data } = await createAdminClient().from("skills").select("name").order("name").limit(1000);
  const skills = (data ?? []).map((s) => s.name as string);

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LD }} />
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
      <CandidateRegistrationForm skills={skills} />
    </AuthShell>
    </>
  );
}
