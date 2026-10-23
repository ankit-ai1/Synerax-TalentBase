import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Banknote, BellRing, Briefcase, Clock, GraduationCap, IndianRupee, MapPin, Users } from "lucide-react";
import { site } from "@/content/site";
import { Container } from "@/components/site/ui";
import { CompactHero, CtaBlocks } from "@/components/site/blog";
import { FaqList } from "@/components/site/seo-faq";
import { MagneticButton } from "@/components/site/magnetic-button";
import { JobBoardList, type BoardJob } from "@/components/site/job-board-list";
import { getJobBoard, getJobByCode, getSeoOverrides, getTerms } from "@/lib/seo/data";
import { codeFromSlug, jobPath, jobsFor, landingLabel, resolveLanding, type Faq, type Landing, type PublicJob } from "@/lib/seo/landing";
import { breadcrumbLd, faqLd, jobPostingLd, ldJson } from "@/lib/seo/jsonld";
import { publicSalaryLabel } from "@/lib/money";
import { formatDate } from "@/lib/utils";

/**
 * Public /jobs/<slug> (the middleware rewrites it here):
 *  • /jobs/<title>-job-0012 → one live job, with Google for Jobs JobPosting data
 *  • /jobs/<landing>        → a landing page (city / work mode / country / combo / skill / role)
 */
export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

const exp = (a?: number | null, b?: number | null) => (a != null && b != null ? `${a}–${b} yrs` : a != null ? `${a}+ yrs` : b != null ? `up to ${b} yrs` : "");

type Resolved = { kind: "job"; job: PublicJob } | { kind: "landing"; landing: Landing; jobs: PublicJob[]; intro: string; faqs: Faq[] };

async function resolve(slug: string): Promise<Resolved> {
  const code = codeFromSlug(slug);
  if (code) {
    const job = await getJobByCode(code);
    if (!job) notFound(); // closed / unpublished jobs disappear (and drop out of Google for Jobs)
    const canonical = jobPath(job);
    if (canonical !== `/jobs/${slug}`) permanentRedirect(canonical);
    return { kind: "job", job };
  }
  const r = resolveLanding(slug, await getTerms());
  if (!r) notFound();
  if ("redirect" in r) permanentRedirect(`/jobs/${r.redirect}`);
  const o = (await getSeoOverrides()).get(r.landing.slug);
  if (o && !o.enabled) notFound();
  const jobs = jobsFor(r.landing, await getJobBoard());
  const faqs = (o?.faqs?.length ? o.faqs : r.landing.faqs).filter((f) => f.q?.trim() && f.a?.trim());
  return { kind: "landing", landing: r.landing, jobs, intro: o?.intro?.trim() || r.landing.intro, faqs };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await resolve((await params).slug);
  if (r.kind === "job") {
    const j = r.job;
    const where = j.work_mode === "Remote" ? "Remote" : (j.locations ?? []).join(", ") || "India";
    return {
      title: { absolute: `${j.title} — ${where} | ${site.name}`.slice(0, 70) },
      description: `${j.title} (${[exp(j.exp_min, j.exp_max), j.employment_type, j.work_mode].filter(Boolean).join(", ")}) in ${where}. Apply free through Synerax.`.slice(0, 160),
      alternates: { canonical: jobPath(j) },
      openGraph: { title: j.title, url: jobPath(j) },
    };
  }
  const l = r.landing;
  return {
    title: { absolute: l.metaTitle },
    description: l.metaDescription,
    alternates: { canonical: `/jobs/${l.slug}` },
    openGraph: { title: l.h1, url: `/jobs/${l.slug}` },
    // no live jobs → keep it out of the index until it has some (avoids thin / doorway pages)
    robots: r.jobs.length ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function JobBoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const r = await resolve((await params).slug);
  return r.kind === "job" ? <JobDetail job={r.job} /> : <LandingPage {...r} />;
}

const toBoard = (j: PublicJob): BoardJob => ({
  href: jobPath(j),
  title: j.title,
  company: j.company,
  cities: j.locations ?? [],
  mode: j.work_mode,
  type: j.employment_type,
  experience: exp(j.exp_min, j.exp_max),
  salary: publicSalaryLabel(j, { hint: false }),
  skills: j.skills ?? [],
  posted: j.published_at,
});

function LandingPage({ landing: l, jobs, intro, faqs }: Extract<Resolved, { kind: "landing" }>) {
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/careers", label: "Careers" },
    { href: `/jobs/${l.slug}`, label: l.h1 },
  ];
  const ld = [breadcrumbLd(crumbs.map((c) => ({ name: c.label, url: c.href }))), jobs.length ? faqLd(faqs) : null].filter(Boolean);
  return (
    <>
      {ld.map((o, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(o) }} />
      ))}
      <CompactHero eyebrow={jobs.length ? `${jobs.length} live opening${jobs.length === 1 ? "" : "s"}` : "Jobs"} title={l.h1} description={intro} crumbs={crumbs} />
      <section className="band band-light">
        <Container className="py-14 sm:py-20">
          {jobs.length === 0 ? (
            <div className="card-premium mx-auto max-w-2xl p-8 text-center sm:p-12" data-testid="landing-empty">
              <BellRing className="mx-auto h-8 w-8 text-jade-700" aria-hidden />
              <h2 className="mt-4 text-[24px] font-semibold tracking-[-0.02em] text-ink-900">No openings right now — register to get alerts</h2>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">We don&apos;t have a live {l.h1.toLowerCase()} role at the moment. Register once (it&apos;s free) and our recruiters will reach out when a matching job opens.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <MagneticButton href="/register">Register for job alerts</MagneticButton>
                <MagneticButton href="/careers" variant="secondary">
                  See all openings
                </MagneticButton>
              </div>
            </div>
          ) : (
            <JobBoardList jobs={jobs.map(toBoard)} />
          )}

          {faqs.length > 0 && (
            <section className="mx-auto mt-20 max-w-3xl" aria-labelledby="faq-h">
              <h2 id="faq-h" className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900">
                Frequently asked questions
              </h2>
              <FaqList faqs={faqs} />
            </section>
          )}

          {l.related.length > 0 && (
            <nav aria-label="Related job pages" className="mx-auto mt-16 max-w-3xl">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-400">Browse more jobs</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {l.related.map((s) => (
                  <li key={s}>
                    <Link href={`/jobs/${s}`} className="rounded-full border border-line px-3.5 py-1.5 text-[13.5px] text-ink-600 hover:border-line-strong hover:text-ink-900">
                      {landingLabel(s)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className="mx-auto mt-16 max-w-4xl">
            <CtaBlocks />
          </div>
        </Container>
      </section>
    </>
  );
}

function JobDetail({ job: j }: { job: PublicJob }) {
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/careers", label: "Careers" },
    { href: jobPath(j), label: j.title },
  ];
  const salary = publicSalaryLabel(j);
  const facts = [
    { icon: MapPin, label: "Location", value: [(j.locations ?? []).join(" / "), j.work_mode].filter(Boolean).join(" · ") || "India" },
    { icon: Clock, label: "Experience", value: exp(j.exp_min, j.exp_max) },
    { icon: Briefcase, label: "Employment", value: j.employment_type },
    { icon: salary && !salary.startsWith("₹") ? Banknote : IndianRupee, label: "Salary", value: salary },
    { icon: Users, label: "Openings", value: j.openings && j.openings > 1 ? String(j.openings) : null },
    { icon: GraduationCap, label: "Qualification", value: j.qualification },
  ].filter((f) => f.value);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jobPostingLd(j)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd(crumbs.map((c) => ({ name: c.label, url: c.href })))) }} />
      <CompactHero eyebrow={j.company ?? "Open role"} title={j.title} crumbs={crumbs}>
        <div className="mt-7 flex flex-wrap gap-3">
          <MagneticButton href={`/portal/jobs/${j.id}`}>Apply now</MagneticButton>
          <MagneticButton href="/register" variant="secondary">
            New here? Register free
          </MagneticButton>
        </div>
      </CompactHero>
      <section className="band band-light">
        <Container className="py-12 sm:py-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
            <article className="min-w-0 max-w-[760px]">
              <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-ink-900">About the role</h2>
              <div className="mt-4 whitespace-pre-line text-[16.5px] leading-relaxed text-ink-700" data-testid="job-description">
                {j.description?.trim() || "The recruiter will share the full job description when they call you."}
              </div>
              {(j.skills ?? []).length > 0 && (
                <>
                  <h2 className="mt-10 text-[20px] font-semibold text-ink-900">Skills</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {(j.skills ?? []).map((s) => (
                      <li key={s} className="rounded-full bg-jade-50 px-3 py-1.5 text-[13.5px] font-medium text-jade-700">
                        {s}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-10 text-[13.5px] text-ink-500">
                Job code {j.job_code}
                {j.published_at ? ` · posted ${formatDate(j.published_at)}` : ""}. Synerax never charges candidates.
              </p>
            </article>
            <aside>
              <div className="card-premium sticky top-24 p-6">
                <dl className="space-y-4">
                  {facts.map((f) => (
                    <div key={f.label} className="flex items-start gap-3">
                      <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-jade-700" aria-hidden />
                      <div>
                        <dt className="text-[12px] text-ink-400">{f.label}</dt>
                        <dd className="text-[14.5px] font-medium text-ink-800">{f.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
                <div className="mt-6">
                  <MagneticButton href={`/portal/jobs/${j.id}`} size="md">
                    Apply now
                  </MagneticButton>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </>
  );
}
