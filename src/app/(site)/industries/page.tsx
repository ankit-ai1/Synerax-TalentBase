import type { Metadata } from "next";
import { site } from "@/content/site";
import { Reveal } from "@/components/site/reveal";
import { IndustryExplorer } from "@/components/site/industry-cards";
import { IndustryOrbit } from "@/components/site/orbit";
import { Marquee } from "@/components/site/marquee";
import { MagneticButton } from "@/components/site/magnetic-button";
import { CtaBand, PageHero, Section, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Industries we hire for",
  description: "Specialist recruiters for IT & software, BFSI, healthcare, manufacturing, retail & e-commerce, telecom and logistics.",
  alternates: { canonical: "/industries" },
  openGraph: { title: `Industries · ${site.name}`, url: "/industries" },
};

export default function IndustriesPage() {
  return (
    <>
      <PageHero
        eyebrow="Industries"
        title="Sector specialists who speak your language"
        highlight="speak your language"
        description="Our recruiters focus on specific industries, so they understand the roles, skills and salary benchmarks that matter to you."
        aside={<IndustryOrbit />}
      >
        <MagneticButton href="#explore">Explore industries</MagneticButton>
        <MagneticButton href="/employers#request" variant="secondary">
          Request talent
        </MagneticButton>
      </PageHero>

      <Section tone="canvas" id="explore" className="scroll-mt-16">
        <SectionHeading eyebrow="Explore" title="Pick an industry to see what we hire for" description="Tap a card to see the roles we recruit and the skills we screen for." />
        <Reveal>
          <IndustryExplorer />
        </Reveal>
      </Section>

      <Section tone="dark" glow="a">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-jade-700">Roles we fill</p>
          <h2 className="mt-3 text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[42px]">From the shop floor to the boardroom</h2>
        </Reveal>
        <div className="space-y-3">
          <Marquee speed={55} gap="gap-3">
            {site.roleMarquee.slice(0, 8).map((r) => (
              <span key={r} className="whitespace-nowrap rounded-full border border-line bg-white/[0.04] px-4 py-2 text-[14px] font-medium text-ink-700">
                {r}
              </span>
            ))}
          </Marquee>
          <Marquee speed={60} gap="gap-3" reverse>
            {site.roleMarquee.slice(8).map((r) => (
              <span key={r} className="whitespace-nowrap rounded-full border border-line bg-white/[0.04] px-4 py-2 text-[14px] font-medium text-ink-700">
                {r}
              </span>
            ))}
          </Marquee>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
