import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/site/reveal";
import { SpotlightCard } from "@/components/site/cards";
import { OpeningsBoard } from "@/components/site/openings";
import { MultiStepLeadForm } from "@/components/site/lead-form";
import { MagneticButton } from "@/components/site/magnetic-button";
import { IconTile, PageHero, Section, SectionHeading } from "@/components/site/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Find a job",
  description: "Looking for your next role? Submit your resume to Synerax and get matched with opportunities across IT, BFSI, healthcare and more — free for candidates.",
  alternates: { canonical: "/careers" },
  openGraph: { title: `Find a job with ${site.name}`, url: "/careers" },
};

const CHIP_POS = [
  "sm:left-[6%] sm:top-[2%]",
  "sm:right-[4%] sm:top-[4%]",
  "sm:left-0 sm:top-[19%]",
  "sm:right-0 sm:bottom-[19%]",
  "sm:left-[2%] sm:bottom-[3%]",
  "sm:right-[10%] sm:bottom-[1%]",
];

function RoleChips() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[460px] sm:h-[340px]">
      <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgb(var(--jade)/0.22),transparent_65%)]" />
      <div className="card-premium relative mx-auto w-[230px] p-5 text-center shadow-pop sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-400">Your next role</p>
        <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink-900">Matched for you</p>
        <p className="mt-1 text-[13px] text-ink-500">Free for candidates · Always</p>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2 sm:mt-0 sm:block">
        {site.careers.heroRoles.map((r, i) => (
          <span
            key={r}
            className={cn("glass whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium text-ink-700 shadow-pop sm:absolute", i % 2 ? "float-slower" : "float-slow", CHIP_POS[i])}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CareersPage() {
  const c = site.careers;
  // TODO: replace the static openings with live data — read open jobs from the `jobs` table through a public,
  // sanitized view (e.g. `public.public_job_openings` exposing only title, city, mode, experience, type) with an
  // anon SELECT policy. Never expose client names, CTC budgets or internal notes.

  return (
    <>
      <PageHero
        eyebrow="For job seekers"
        title="Your next career move starts here"
        highlight="career move"
        description="Share your profile once and our recruiters will match you with roles that fit your skills, goals and salary expectations. Always free for candidates."
        aside={<RoleChips />}
      >
        <MagneticButton href="/register">Register as candidate</MagneticButton>
        <MagneticButton href="/portal/jobs" variant="secondary">
          Find jobs
        </MagneticButton>
      </PageHero>

      <Section tone="canvas">
        <SectionHeading eyebrow="How we help you" title="More than a job board" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.help.map((h, i) => (
            <Reveal key={h.title} delay={i * 70}>
              <SpotlightCard className="lift h-full p-6">
                <IconTile name={h.icon} />
                <h3 className="mt-4 text-[17px] font-semibold text-ink-900">{h.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{h.text}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="dark" glow="b">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-jade-700">The process</p>
          <h2 className="mt-3 text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[42px]">What happens after you apply</h2>
        </Reveal>
        <ol className="relative grid gap-4 md:grid-cols-4">
          <span aria-hidden className="absolute left-[12%] right-[12%] top-[27px] hidden h-px bg-gradient-to-r from-jade/0 via-jade/60 to-saffron/0 md:block" />
          {c.steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 90} className="relative text-center">
              <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-[18px] font-semibold text-jade-700 shadow-pop">{i + 1}</span>
              <h3 className="mt-5 text-[17px] font-semibold text-ink-900">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-[240px] text-[14.5px] leading-relaxed text-ink-500">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </Section>

      <Section tone="canvas" id="openings" className="scroll-mt-16">
        <SectionHeading eyebrow="Current openings" title="Roles we're hiring for" description="A snapshot of open roles. Submit your profile to hear about new openings first." badge />
        <Reveal>
          <OpeningsBoard />
        </Reveal>
      </Section>

      <Section tone="surface" id="submit" className="scroll-mt-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <Reveal>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-jade-700">Apply</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[42px]">Submit your resume</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-500">Takes two minutes. A recruiter will review your profile and reach out when there&apos;s a role that fits.</p>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-saffron/30 bg-saffron-50 p-4 text-[14px] text-saffron-800">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p>
                <strong className="font-semibold">Stay safe:</strong> Synerax never asks candidates for money. Report anyone who does in our name.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <MultiStepLeadForm type="candidate" />
          </Reveal>
        </div>
      </Section>
    </>
  );
}
