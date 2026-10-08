import type { Metadata } from "next";
import { Check } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/site/reveal";
import { NumberTicker } from "@/components/site/number-ticker";
import { BentoGrid, BentoTile } from "@/components/site/bento";
import { EmployerDashboardVisual, RpoVisual, ShortlistVisual } from "@/components/site/visuals";
import { ScrollTimeline } from "@/components/site/scroll-timeline";
import { ModelsTable } from "@/components/site/tables";
import { MultiStepLeadForm } from "@/components/site/lead-form";
import { MagneticButton } from "@/components/site/magnetic-button";
import { PageHero, SampleBadge, Section, SectionHeading, SiteIcon } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Hire talent",
  description: "Partner with Synerax to hire pre-screened talent fast — permanent, contract, contract-to-hire, RPO and bulk hiring with clear SLAs.",
  alternates: { canonical: "/employers" },
  openGraph: { title: `Hire talent with ${site.name}`, url: "/employers" },
};

const BENTO_SIZE = ["big", "normal", "normal", "normal", "normal"] as const;

export default function EmployersPage() {
  const e = site.employers;
  return (
    <>
      <PageHero
        eyebrow="For employers"
        title="Hire pre-screened talent in days, not weeks"
        highlight="days, not weeks"
        description="Share your requirement and get a curated shortlist with notes on fit, CTC and notice period — backed by clear SLAs."
        aside={<EmployerDashboardVisual />}
      >
        <MagneticButton href="#request">Request talent</MagneticButton>
        <MagneticButton href="#models" variant="secondary">
          Engagement models
        </MagneticButton>
      </PageHero>

      {/* Benefits bento */}
      <Section tone="light" index="01" label="Why us">
        <SectionHeading index="01" eyebrow="Why Synerax" title="Why companies partner with us" />
        <BentoGrid>
          {e.reasons.map((r, i) => (
            <BentoTile
              key={r.title}
              size={BENTO_SIZE[i]}
              title={r.title}
              text={r.text}
              icon={r.icon}
              delay={i * 70}
              visual={i === 0 ? <ShortlistVisual /> : i === 4 ? <RpoVisual /> : undefined}
            />
          ))}
        </BentoGrid>
      </Section>

      {/* SLA — dark */}
      <Section tone="dark" index="02" label="Commitments">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <Reveal>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-jade-700">Our commitments</p>
            <h2 className="mt-3 max-w-xl text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[42px]">Turnaround you can plan around</h2>
          </Reveal>
          <SampleBadge />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {e.sla.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="card-premium p-6">
              <SiteIcon name={s.icon} className="h-6 w-6 text-jade-700" />
              <p className="mt-5 text-[40px] font-semibold tracking-[-0.04em] text-ink-900 sm:text-[46px]">
                <NumberTicker value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-[15px] font-semibold text-ink-800">{s.label}</p>
              <p className="text-[13px] text-ink-500">{s.context}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Hiring timeline */}
      <Section tone="light" index="03" label="Process">
        <SectionHeading index="03" eyebrow="Hiring process" title="What working with us looks like" />
        <ScrollTimeline items={e.hiringSteps.map((s, i) => ({ ...s, tag: `Step ${i + 1}` }))} />
      </Section>

      {/* Models */}
      <Section tone="dark" id="models" index="04" label="Models" className="scroll-mt-16">
        <SectionHeading index="04" eyebrow="Engagement models" title="Choose the model that fits" description="Not sure which is right? We'll recommend one after a short call." />
        <ModelsTable />
      </Section>

      {/* Request form */}
      <Section tone="light" id="request" index="05" label="Request" className="scroll-mt-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <Reveal>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-jade-700">Request talent</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[42px]">Tell us about the role</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-500">
              Three quick steps. An account manager will call you within one working day to calibrate the requirement and share next steps.
            </p>
            <ul className="mt-7 space-y-3">
              {["No cost until a candidate joins (permanent hiring)", "Shortlists with screening notes", "A single point of contact for your account"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-[15px] text-ink-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-jade text-white">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={100}>
            <MultiStepLeadForm type="employer" />
          </Reveal>
        </div>
      </Section>
    </>
  );
}
