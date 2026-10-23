import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { site } from "@/content/site";
import { Hero } from "@/components/site/hero";
import { Partners } from "@/components/site/home/partners";
import { JobLinks } from "@/components/site/home/job-links";

// Below-the-fold sections: still server-rendered (same HTML, same look), but each ships in its own chunk
// so the browser hydrates them in small pieces instead of one long task.
const FlapMetrics = dynamic(() => import("@/components/site/home/flap-metrics").then((m) => m.FlapMetrics));
const ServiceStack = dynamic(() => import("@/components/site/home/service-stack").then((m) => m.ServiceStack));
const JourneyTimeline = dynamic(() => import("@/components/site/home/journey-timeline").then((m) => m.JourneyTimeline));
const IndiaMap = dynamic(() => import("@/components/site/home/india-map").then((m) => m.IndiaMap));
const WhyToggle = dynamic(() => import("@/components/site/home/why-toggle").then((m) => m.WhyToggle));
const TestimonialDeck = dynamic(() => import("@/components/site/home/testimonial-deck").then((m) => m.TestimonialDeck));
const FaqSearch = dynamic(() => import("@/components/site/home/faq-search").then((m) => m.FaqSearch));
const CtaSplit = dynamic(() => import("@/components/site/home/cta-split").then((m) => m.CtaSplit));

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
      <JobLinks />
      <CtaSplit />
    </>
  );
}
