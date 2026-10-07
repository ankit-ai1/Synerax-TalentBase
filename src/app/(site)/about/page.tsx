import type { Metadata } from "next";
import { Eye, Rocket } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/site/reveal";
import { NumberTicker } from "@/components/site/number-ticker";
import { SpotlightCard, TiltCard } from "@/components/site/cards";
import { ScrollTimeline } from "@/components/site/scroll-timeline";
import { Marquee } from "@/components/site/marquee";
import { SOCIAL_ICONS } from "@/components/site/footer";
import { CtaBand, IconTile, PageHero, SampleBadge, Section, SectionHeading, SiteIcon } from "@/components/site/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About us",
  description: "Learn about Synerax — our story, mission, values and the team helping companies across India hire better.",
  alternates: { canonical: "/about" },
  openGraph: { title: `About ${site.name}`, url: "/about" },
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

const TILTS = ["-rotate-6 translate-y-2", "rotate-3 -translate-y-3", "-rotate-2 translate-y-4", "rotate-6 -translate-y-1"];

function ValuesCollage() {
  return (
    <div className="relative mx-auto grid max-w-[480px] grid-cols-2 gap-4 py-6" aria-label="Our values">
      {site.about.values.map((v, i) => (
        <div key={v.title} className={cn("transition-transform duration-500 hover:rotate-0", TILTS[i])}>
          <div className="glass rounded-2xl p-5 shadow-pop">
            <SiteIcon name={v.icon} className="h-6 w-6 text-jade" />
            <p className="mt-3 text-[15px] font-semibold text-ink-900">{v.title}</p>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-500">{v.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  const a = site.about;
  return (
    <>
      <PageHero eyebrow="About Synerax" title={a.statement} highlight="find each other." description="A staffing partner built on speed, honesty and a genuine respect for every candidate." aside={<ValuesCollage />} />

      {/* Story + timeline */}
      <Section tone="canvas">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-jade-700">Our story</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[42px]">Built to fix hiring for both sides</h2>
            {a.story.map((p) => (
              <p key={p} className="mt-4 text-[16px] leading-relaxed text-ink-500">
                {p}
              </p>
            ))}
            <div className="mt-6">
              <SampleBadge />
            </div>
          </Reveal>
          <ScrollTimeline layout="left" items={a.timeline.map((t) => ({ title: t.title, text: t.text, tag: t.year }))} className="max-w-none" />
        </div>
      </Section>

      {/* Mission / vision / values */}
      <Section tone="surface">
        <SectionHeading eyebrow="What drives us" title="Mission, vision and values" />
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal>
            <SpotlightCard className="h-full p-7">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-jade-50 text-jade-700 ring-1 ring-inset ring-jade/15"><Rocket className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-5 flex items-center gap-2 text-xl font-semibold text-ink-900">
                Mission
              </h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-ink-500">{a.mission}</p>
            </SpotlightCard>
          </Reveal>
          <Reveal delay={90}>
            <SpotlightCard className="h-full p-7">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-saffron-50 text-saffron-800 ring-1 ring-inset ring-saffron/20"><Eye className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-5 flex items-center gap-2 text-xl font-semibold text-ink-900">
                Vision
              </h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-ink-500">{a.vision}</p>
            </SpotlightCard>
          </Reveal>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {a.values.map((v, i) => (
            <Reveal key={v.title} delay={i * 70}>
              <SpotlightCard className="lift h-full p-6">
                <IconTile name={v.icon} />
                <h3 className="mt-4 text-[17px] font-semibold text-ink-900">{v.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{v.text}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Culture marquee */}
      <section className="overflow-hidden border-b border-line py-10" aria-label="Our culture">
        <Marquee speed={45} gap="gap-10">
          {a.culture.map((w) => (
            <span key={w} className="flex items-center gap-10 whitespace-nowrap text-[34px] font-semibold tracking-[-0.03em] text-ink-300 sm:text-[48px]">
              {w}
              <span className="h-2 w-2 rounded-full bg-saffron" aria-hidden />
            </span>
          ))}
        </Marquee>
      </section>

      {/* Team */}
      <Section tone="canvas">
        <SectionHeading eyebrow="Leadership" title="The team behind Synerax" badge />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {a.team.map((p, i) => (
            <Reveal key={p.name} delay={i * 80}>
              <TiltCard className="group h-full p-6 text-center">
                <span
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-jade to-[#0B5E58] text-2xl font-semibold text-white ring-4 ring-jade/15"
                  role="img"
                  aria-label={`${p.name} (initials avatar)`}
                >
                  {initials(p.name)}
                </span>
                <h3 className="mt-4 text-[17px] font-semibold text-ink-900">{p.name}</h3>
                <p className="text-[14px] font-medium text-jade-700">{p.role}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-500 transition-all duration-500 lg:max-h-0 lg:overflow-hidden lg:opacity-0 lg:group-hover:max-h-24 lg:group-hover:opacity-100 lg:group-focus-within:max-h-24 lg:group-focus-within:opacity-100">
                  {p.bio}
                </p>
                <a
                  href={p.linkedin}
                  aria-label={`${p.name} on LinkedIn`}
                  className="relative z-10 mx-auto mt-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-500 transition-colors hover:border-jade/40 hover:text-jade-700"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    {SOCIAL_ICONS.linkedin}
                  </svg>
                </a>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Metrics band — dark */}
      <Section tone="dark" glow="b">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {site.metrics.map((mt, i) => (
            <Reveal key={mt.label} delay={i * 80} className="text-center">
              <p className="text-[36px] font-semibold tracking-[-0.04em] text-ink-900 sm:text-[48px]">
                <NumberTicker value={mt.value} suffix={mt.suffix} />
              </p>
              <p className="mt-1 text-[14px] text-ink-500">{mt.label}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <SampleBadge />
        </div>
      </Section>

      <CtaBand title="Let's build something great together" />
    </>
  );
}
