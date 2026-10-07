import type { Metadata } from "next";
import { site } from "@/content/site";
import { Reveal } from "@/components/site/reveal";
import { ServiceTabs } from "@/components/site/service-tabs";
import { ModelsTable } from "@/components/site/tables";
import { ScrollTimeline } from "@/components/site/scroll-timeline";
import { Faq } from "@/components/site/faq";
import { MagneticButton } from "@/components/site/magnetic-button";
import { CtaBand, PageHero, Section, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Staffing services",
  description:
    "Permanent staffing, contract staffing, contract-to-hire, RPO, executive search and bulk hiring — flexible staffing services from Synerax.",
  alternates: { canonical: "/services" },
  openGraph: { title: `Staffing services · ${site.name}`, url: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Flexible staffing for every stage of growth"
        highlight="every stage of growth"
        description="Six ways to hire with Synerax — each backed by the same rigorous screening and transparent process."
      >
        <MagneticButton href="/employers#request">Request talent</MagneticButton>
        <MagneticButton href="#models" variant="secondary">
          Compare models
        </MagneticButton>
      </PageHero>

      <Section tone="canvas">
        <Reveal>
          <ServiceTabs />
        </Reveal>
      </Section>

      <Section tone="surface" id="models" className="scroll-mt-16">
        <SectionHeading eyebrow="Engagement models" title="Choose the model that fits" description="Not sure which is right? We'll recommend one after a short call." />
        <ModelsTable />
      </Section>

      <Section tone="canvas">
        <SectionHeading eyebrow="Our process" title="How every engagement runs" description="The same transparent four-step process, whichever model you choose." />
        <ScrollTimeline items={site.process.map((p, i) => ({ title: p.title, text: p.text, tag: `Step ${i + 1}` }))} />
      </Section>

      <Section tone="surface">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <SectionHeading align="left" className="mb-0" eyebrow="FAQ" title="Service questions" description="Quick answers about engagement models, payroll and minimums." />
          <Reveal>
            <Faq items={site.servicesFaq} />
          </Reveal>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
