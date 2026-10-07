import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/site/reveal";
import { LeadForm } from "@/components/site/lead-form";
import { ContactCards, MapGraphic } from "@/components/site/contact-cards";
import { HeroBackdrop, HeroTitle, Container, Eyebrow } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with Synerax for hiring, job opportunities or partnerships. We reply within one working day.",
  alternates: { canonical: "/contact" },
  openGraph: { title: `Contact ${site.name}`, url: "/contact" },
};

export default function ContactPage() {
  return (
    <section className="relative isolate overflow-hidden">
      <HeroBackdrop />
      <Container className="relative py-14 sm:py-20 lg:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="rise-in">
            <Eyebrow>Contact</Eyebrow>
          </div>
          <HeroTitle text="Let's talk" highlight="talk" className="mt-5 text-[42px] leading-[1.04] sm:text-[60px]" />
          <p className="rise-in mt-5 text-pretty text-[16.5px] leading-relaxed text-ink-500 sm:text-lg" style={{ ["--d" as string]: "250ms" }}>
            Hiring, looking for a job or exploring a partnership — send us a message.
          </p>
          <p className="rise-in mt-5 inline-flex items-center gap-2 rounded-full border border-jade/30 bg-jade-50 px-3.5 py-1.5 text-[13px] font-semibold text-jade-700" style={{ ["--d" as string]: "350ms" }}>
            <Zap className="h-4 w-4" aria-hidden /> {site.contact.responseTime}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.35fr] lg:gap-10">
          <Reveal className="space-y-4">
            <ContactCards />
            <MapGraphic />
          </Reveal>
          <Reveal delay={100} className="lg:sticky lg:top-24 lg:self-start">
            <LeadForm />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
