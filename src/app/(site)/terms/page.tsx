import type { Metadata } from "next";
import { site } from "@/content/site";
import { LegalPage } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `Terms governing the use of the ${site.name} website.`,
  alternates: { canonical: "/terms" },
};

// TODO: legal review — replace all placeholder text below with reviewed terms of use.
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="To be confirmed"
      sections={[
        {
          heading: "1. Acceptance",
          body: [`By using this website you agree to these terms. If you do not agree, please do not use the website.`],
        },
        {
          heading: "2. Use of the website",
          body: [
            "You agree to provide accurate information in any form you submit and not to misuse the website, attempt to access restricted areas, or submit spam or harmful content.",
          ],
        },
        {
          heading: "3. No fees for candidates",
          body: [`${site.name} does not charge candidates for job placement. Treat any request for payment in our name as fraudulent and report it to us.`],
        },
        {
          heading: "4. Content",
          body: ["Website content is provided for general information. Job listings and service descriptions may change without notice."],
        },
        {
          heading: "5. Limitation of liability",
          body: [`To the extent permitted by law, ${site.name} is not liable for losses arising from the use of this website.`],
        },
        {
          heading: "6. Governing law",
          body: ["These terms are governed by the laws of India. Jurisdiction details to be confirmed."],
        },
      ]}
    />
  );
}
