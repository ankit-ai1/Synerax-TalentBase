import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { site } from "@/content/site";
import { Hero } from "@/components/site/hero";
import { Reveal } from "@/components/site/reveal";
import { NumberTicker } from "@/components/site/number-ticker";
import { BentoGrid, BentoTile } from "@/components/site/bento";
import { SERVICE_VISUALS, BriefVisual, OfferVisual, SearchVisual, ShortlistVisual } from "@/components/site/visuals";
import { StickyScrollSteps } from "@/components/site/sticky-steps";
import { IndustryHoverCards } from "@/components/site/industry-cards";
import { LogoMarquee, Marquee } from "@/components/site/marquee";
import { ComparisonTable } from "@/components/site/tables";
import { FeaturedQuote, TestimonialMarquee } from "@/components/site/testimonials";
import { FaqTabs } from "@/components/site/faq";
import { CtaBand, SampleBadge, Section, SectionHeading, SiteIcon } from "@/components/site/ui";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — Staffing & recruitment partner in India` },
  description: site.description,
  alternates: { canonical: "/" },
};

const SIZES = ["wide", "tall", "normal", "normal", "normal", "normal"] as const;
const STEP_VISUALS = [<BriefVisual key="b" />, <SearchVisual key="s" />, <ShortlistVisual key="sh" />, <OfferVisual key="o" />];

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Client logos */}
      <section className="border-y border-line bg-surface/60 py-10" aria-labelledby="clients-title">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2 id="clients-title" className="mb-6 flex flex-wrap items-center justify-center gap-2 text-center text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Trusted by growing teams <SampleBadge />
          </h2>
          <LogoMarquee />
        </div>
      </section>

      {/* Metrics — dark */}
      <Section tone="dark" glow="a">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <Reveal>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-jade-700">Synerax in numbers</p>
            <h2 className="mt-3 max-w-xl text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[42px]">
              Speed and quality you can measure
            </h2>
          </Reveal>
          <SampleBadge />
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-line bg-gradient-to-r from-transparent via-jade/30 to-transparent sm:grid-cols-2 lg:grid-cols-4">
          {site.metrics.map((mt, i) => (
            <Reveal key={mt.label} delay={i * 90} className="relative bg-[rgb(8_11_20)] p-6 sm:p-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-jade-700 ring-1 ring-inset ring-white/10">
                <SiteIcon name={mt.icon} className="h-5 w-5" />
              </span>
              <p className="mt-6 text-[44px] font-semibold tracking-[-0.04em] text-ink-900 sm:text-[52px]">
                <NumberTicker value={mt.value} suffix={mt.suffix} />
              </p>
              <p className="mt-1 text-[15px] font-semibold text-ink-800">{mt.label}</p>
              <p className="mt-1 text-[13.5px] text-ink-500">{mt.context}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Services — bento */}
      <Section tone="canvas">
        <SectionHeading
          eyebrow="What we do"
          title="Staffing solutions for every hiring need"
          highlight="every hiring need"
          description="From a single critical hire to hundreds of roles at a new site — pick the model that fits."
        />
        <BentoGrid>
          {site.services.map((s, i) => {
            const Visual = SERVICE_VISUALS[s.slug];
            return <BentoTile key={s.slug} size={SIZES[i]} title={s.title} text={s.summary} icon={s.icon} href={`/services#${s.slug}`} visual={<Visual />} delay={i * 70} />;
          })}
        </BentoGrid>
      </Section>

      {/* How it works — sticky steps */}
      <Section tone="surface">
        <SectionHeading eyebrow="How it works" title="From brief to joining in four steps" description="A simple, transparent process — with updates at every stage." />
        <StickyScrollSteps steps={site.process.map((p, i) => ({ title: p.title, text: p.text, visual: STEP_VISUALS[i] }))} />
      </Section>

      {/* Industries */}
      <Section tone="canvas">
        <SectionHeading eyebrow="Industries" title="Specialists across the sectors that matter" description="Recruiters who know the roles, skills and salary benchmarks in your industry." />
        <IndustryHoverCards />
        <Reveal className="mt-10">
          <Marquee speed={60} gap="gap-3">
            {site.roleMarquee.map((r) => (
              <span key={r} className="whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-[14px] font-medium text-ink-600">
                {r}
              </span>
            ))}
          </Marquee>
        </Reveal>
      </Section>

      {/* Why Synerax — dark */}
      <Section tone="dark" glow="b">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.25fr] lg:gap-16">
          <Reveal>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-jade-700">Why Synerax</p>
            <h2 className="mt-3 text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[42px]">
              Not just another staffing agency
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-500">
              We combine experienced recruiters with a structured process and our own talent platform — so you get fewer, better profiles, faster.
            </p>
            <Link href="/employers" className="group mt-7 inline-flex items-center gap-2 text-[15px] font-semibold text-jade-700">
              See how we work with employers <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <ComparisonTable />
          </Reveal>
        </div>
      </Section>

      {/* Testimonials */}
      <section className="overflow-hidden py-14 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Testimonials" title="What clients and candidates say" badge />
          <Reveal>
            <FeaturedQuote />
          </Reveal>
        </div>
        <Reveal className="mt-10">
          <TestimonialMarquee />
        </Reveal>
      </section>

      {/* FAQ */}
      <Section tone="surface">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <SectionHeading align="left" className="mb-0" eyebrow="FAQ" title="Questions, answered" description="Can't find what you're looking for? Our team is happy to help." />
          <Reveal>
            <FaqTabs employers={site.faq.employers} candidates={site.faq.candidates} />
            <p className="mt-5 text-sm text-ink-500">
              Still have questions?{" "}
              <Link href="/contact" className="font-semibold text-jade-700 hover:underline">
                Contact us
              </Link>
            </p>
          </Reveal>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
