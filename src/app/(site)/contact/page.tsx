import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/site/reveal";
import { LeadForm } from "@/components/site/lead-form";
import { ContactCards, MapGraphic } from "@/components/site/contact-cards";
import { PageHero, Section } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with Synerax for hiring, job opportunities or partnerships. We reply within one working day.",
  alternates: { canonical: "/contact" },
  openGraph: { title: `Contact ${site.name}`, url: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's connect" highlight="connect" description="Hiring, looking for a job or exploring a partnership — send us a message and a real person will reply.">
        <span className="inline-flex items-center gap-2 rounded-full border border-fg/10 bg-fg/[0.05] px-4 py-2 text-[14px] font-semibold text-ink-800">
          <Zap className="h-4 w-4 text-success" aria-hidden /> {site.contact.responseTime}
        </span>
      </PageHero>
      <Section tone="light" index="01" label="Reach us">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <Reveal className="space-y-4 lg:col-span-5">
            <ContactCards />
            <MapGraphic />
          </Reveal>
          <Reveal delay={100} className="lg:sticky lg:top-24 lg:col-span-7 lg:self-start">
            <LeadForm />
          </Reveal>
        </div>
      </Section>
    </>
  );
}
