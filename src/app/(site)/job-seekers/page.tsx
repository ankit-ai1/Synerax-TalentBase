import type { Metadata } from "next";
import { BadgeCheck, CalendarCheck, Sparkles } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/site/reveal";
import { TiltCard } from "@/components/site/cards";
import { MagneticButton } from "@/components/site/magnetic-button";
import { JourneyTimeline } from "@/components/site/home/journey-timeline";
import { FaqSearch } from "@/components/site/home/faq-search";
import { CtaBand, IconTile, PageHero, Section, SectionHeading, StatsStrip } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "For candidates",
  description: "Get matched to roles that fit your skills, salary and location — with a real recruiter and your own tracking portal. Always free for candidates.",
  alternates: { canonical: "/job-seekers" },
  openGraph: { title: `For candidates · ${site.name}`, url: "/job-seekers" },
};

const STAGES = ["Applied", "Under review", "Shared", "Interview", "Offer", "Joined"];

/** Hero visual: a candidate profile card whose stage tracker fills up, with match notifications */
function ProfileVisual() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[520px]">
      <div className="rounded-[28px] border border-fg/10 bg-surface/90 p-6 shadow-[0_40px_120px_-40px_rgb(20_12_4/0.9)] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(var(--accent-b))] to-[rgb(var(--accent-a))] text-[18px] font-bold text-[rgb(var(--on-accent))]">AS</span>
          <div>
            <p className="text-[17px] font-semibold text-ink-900">Aarav Sharma</p>
            <p className="text-[13px] text-ink-500">Frontend Developer · 4 yrs · Bengaluru</p>
          </div>
          <span className="ml-auto rounded-full bg-[rgb(var(--success))] px-2.5 py-1 text-[12px] font-bold text-[rgb(var(--on-accent))]">92%</span>
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">
            {STAGES.map((s) => (
              <span key={s}>{s.split(" ")[0]}</span>
            ))}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-fg/10">
            <div className="bar-grow h-full w-[78%] origin-left rounded-full bg-gradient-to-r from-[rgb(var(--accent-a))] via-[rgb(var(--accent-b))] to-[rgb(var(--success))]" style={{ transformOrigin: "left" }} />
          </div>
        </div>
        <ul className="mt-6 space-y-2.5">
          {[
            { icon: Sparkles, t: "New match: Senior React Developer", s: "92% — fits your skills and salary", tone: "text-success" },
            { icon: BadgeCheck, t: "Profile shared with employer", s: "With your consent · 2 days ago", tone: "text-jade-700" },
            { icon: CalendarCheck, t: "Interview on Friday, 11:00 AM", s: "Prep notes from your recruiter", tone: "text-jade-700" },
          ].map((x, i) => (
            <li key={x.t} className="stack-in flex items-center gap-3 rounded-2xl border border-fg/[0.07] bg-fg/[0.03] p-3" style={{ ["--d" as string]: `${i * 0.6}s` }}>
              <x.icon className={`h-5 w-5 shrink-0 ${x.tone}`} />
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold text-ink-900">{x.t}</span>
                <span className="block truncate text-[12px] text-ink-500">{x.s}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const c = site.candidates;
  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} title={c.hero.title} highlight={c.hero.highlight} description={c.hero.subtitle} aside={<ProfileVisual />}>
        <MagneticButton href="/register" variant="light" className="btn-shimmer">
          Create my profile
        </MagneticButton>
        <MagneticButton href="/portal/jobs" variant="ghost-light">
          Browse jobs
        </MagneticButton>
      </PageHero>

      <Section tone="light" index="01" label="Why Synerax">
        <SectionHeading index="01" eyebrow="Why candidates choose us" title="A job search that respects your time" highlight="respects your time" description="Fewer, better-matched roles — and a recruiter who keeps you posted at every step." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.perks.map((p, i) => (
            <Reveal key={p.title} delay={i * 70} variant="scale">
              <TiltCard max={5} className="h-full p-6">
                <IconTile name={p.icon} className="h-12 w-12" />
                <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.01em] text-ink-900">{p.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{p.text}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </Section>

      <JourneyTimeline />

      <FaqSearch items={site.faq.candidates} index="03" title="Candidate questions, answered" tone="light" />

      <StatsStrip stats={c.stats} title="The promise" index="04" />

      <CtaBand title="Ready for your next role?" />
    </>
  );
}
