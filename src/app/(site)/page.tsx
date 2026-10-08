import type { Metadata } from "next";
import { site } from "@/content/site";
import { Hero } from "@/components/site/hero";
import { Partners } from "@/components/site/home/partners";
import { FlapMetrics } from "@/components/site/home/flap-metrics";
import { ServiceStack } from "@/components/site/home/service-stack";
import { JourneyTimeline } from "@/components/site/home/journey-timeline";
import { IndiaMap } from "@/components/site/home/india-map";
import { WhyToggle } from "@/components/site/home/why-toggle";
import { TestimonialDeck } from "@/components/site/home/testimonial-deck";
import { FaqSearch } from "@/components/site/home/faq-search";
import { CtaSplit } from "@/components/site/home/cta-split";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — Staffing & recruitment partner in India` },
  description: site.description,
  alternates: { canonical: "/" },
};

/**
 * Home — light, theme-following sections with three always-dark bands:
 * hero → partners → numbers (dark) → solutions → journey (alt) → industries → why (alt)
 * → testimonials → FAQ → final CTA (dark) → footer (dark)
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Partners />
      <FlapMetrics />
      <ServiceStack />
      <JourneyTimeline />
      <IndiaMap />
      <WhyToggle />
      <TestimonialDeck />
      <FaqSearch />
      <CtaSplit />
    </>
  );
}
