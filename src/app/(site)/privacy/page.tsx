import type { Metadata } from "next";
import { site } from "@/content/site";
import { LegalPage } from "@/components/site/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${site.name} collects, uses and protects your personal information.`,
  alternates: { canonical: "/privacy" },
};

// TODO: legal review — replace all placeholder text below with a reviewed privacy policy
// (consider India's Digital Personal Data Protection Act, 2023).
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="To be confirmed"
      sections={[
        {
          heading: "1. Information we collect",
          body: [
            "When you submit a form on this website we collect the details you provide, such as your name, email, phone number, company, role, experience, skills, city and any resume link or message.",
            "We may also collect basic technical information such as your browser type and the pages you visit, to keep the website secure and working well.",
          ],
        },
        {
          heading: "2. How we use your information",
          body: [
            "We use your information to respond to enquiries, understand hiring requirements, match candidates with suitable roles and share candidate profiles with employers only for roles the candidate has agreed to.",
          ],
        },
        {
          heading: "3. Sharing",
          body: ["We do not sell your personal information. We share it only with employers (for candidates, with consent), service providers who help us operate, or when required by law."],
        },
        {
          heading: "4. Retention & security",
          body: ["We keep information only as long as needed for the purposes above and protect it with reasonable technical and organisational safeguards."],
        },
        {
          heading: "5. Your rights",
          body: [`You can ask us to access, correct or delete your information by emailing ${site.contact.email}.`],
        },
        {
          heading: "6. Contact",
          body: [`Questions about this policy? Contact us at ${site.contact.email}.`],
        },
      ]}
    />
  );
}
