/** schema.org JSON-LD builders (pure — unit-tested in tests/blog.test.ts) */
import { site } from "@/content/site";
import type { Faq, PublicJob } from "./landing";
import { jobPath } from "./landing";

export const siteBase = () => site.url.replace(/\/$/, "");
const abs = (u: string) => (/^https?:/i.test(u) ? u : `${siteBase()}${u.startsWith("/") ? "" : "/"}${u}`);

/** safe inside <script type="application/ld+json"> */
export const ldJson = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.url) })) };
}

export function faqLd(faqs: Faq[]) {
  if (!faqs.length) return null;
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}

export type LdPost = { slug: string; title: string; seo_title?: string | null; meta_description?: string | null; excerpt?: string | null; cover_url?: string | null; og_image_url?: string | null; author_name?: string | null; publish_at: string | null; updated_at: string; categories?: string[]; tags?: string[]; canonical_url?: string | null };
export function blogPostingLd(p: LdPost, words?: number) {
  const url = p.canonical_url || abs(`/blog/${p.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: (p.seo_title || p.title).slice(0, 110),
    description: p.meta_description || p.excerpt || undefined,
    image: [abs(p.og_image_url || p.cover_url || `/blog/${p.slug}/og`)],
    datePublished: p.publish_at ?? p.updated_at,
    dateModified: p.updated_at,
    author: p.author_name ? { "@type": "Person", name: p.author_name, url: abs("/about") } : { "@type": "Organization", name: site.name, url: siteBase() },
    publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: abs("/logo.png") } },
    articleSection: p.categories?.[0],
    keywords: p.tags?.length ? p.tags.join(", ") : undefined,
    wordCount: words,
    inLanguage: "en-IN",
  };
}

const EMPLOYMENT: Record<string, string> = { "full-time": "FULL_TIME", "full time": "FULL_TIME", permanent: "FULL_TIME", "part-time": "PART_TIME", "part time": "PART_TIME", contract: "CONTRACTOR", "contract-to-hire": "CONTRACTOR", "contract to hire": "CONTRACTOR", temporary: "TEMPORARY", temp: "TEMPORARY", internship: "INTERN", intern: "INTERN", freelance: "CONTRACTOR" };
export const employmentType = (t: string | null | undefined) => (t ? EMPLOYMENT[t.toLowerCase()] ?? "FULL_TIME" : undefined);

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`)
    .join("");

/** Google for Jobs JobPosting. validThrough = target date when it's in the future, else 60 days after posting. */
export function jobPostingLd(j: PublicJob, now = Date.now()) {
  const remote = (j.work_mode ?? "").toLowerCase() === "remote";
  const posted = j.published_at ?? j.updated_at ?? new Date(now).toISOString();
  const target = j.target_date ? new Date(`${j.target_date}T23:59:59+05:30`).getTime() : 0;
  const validThrough = new Date(target > now ? target : Math.max(new Date(posted).getTime() + 60 * 86400e3, now + 7 * 86400e3)).toISOString();
  const locs = (j.locations ?? []).filter(Boolean);
  const desc = [j.description?.trim() || `${j.title} — ${j.company ?? "a Synerax client"}.`, j.skills?.length ? `Skills: ${j.skills.join(", ")}` : "", j.qualification ? `Qualification: ${j.qualification}` : ""].filter(Boolean).join("\n\n");
  const lpaToInr = (v: number) => Math.round(v * 100000);
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: j.title,
    description: paragraphs(desc),
    identifier: { "@type": "PropertyValue", name: site.name, value: j.job_code },
    datePosted: posted.slice(0, 10),
    validThrough,
    employmentType: employmentType(j.employment_type),
    hiringOrganization: { "@type": "Organization", name: site.name, sameAs: siteBase(), logo: abs("/logo.png") },
    directApply: true,
    url: abs(jobPath(j)),
    ...(j.openings ? { totalJobOpenings: j.openings } : {}),
    ...(j.exp_min != null ? { experienceRequirements: { "@type": "OccupationalExperienceRequirements", monthsOfExperience: Math.round(Number(j.exp_min) * 12) } } : {}),
    ...(remote
      ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "India" } }
      : {
          jobLocation: (locs.length ? locs : ["India"]).map((l) => ({ "@type": "Place", address: { "@type": "PostalAddress", addressLocality: l, addressCountry: "IN" } })),
        }),
    ...(j.salary_min_amount != null || j.salary_max_amount != null
      ? (() => {
          // the job's own currency and period (INR annual amounts are stored in lakhs)
          const cur = (j.salary_currency || "INR").toUpperCase();
          const monthly = j.salary_period === "monthly";
          const val = (v: number) => (cur === "INR" && !monthly ? lpaToInr(v) : Math.round(v));
          return {
            baseSalary: {
              "@type": "MonetaryAmount",
              currency: cur,
              value: { "@type": "QuantitativeValue", unitText: monthly ? "MONTH" : "YEAR", ...(j.salary_min_amount != null ? { minValue: val(Number(j.salary_min_amount)) } : {}), ...(j.salary_max_amount != null ? { maxValue: val(Number(j.salary_max_amount)) } : {}) },
            },
          };
        })()
      : j.salary_min != null || j.salary_max != null
        ? {
            baseSalary: {
              "@type": "MonetaryAmount",
              currency: "INR",
              value: { "@type": "QuantitativeValue", unitText: "YEAR", ...(j.salary_min != null ? { minValue: lpaToInr(Number(j.salary_min)) } : {}), ...(j.salary_max != null ? { maxValue: lpaToInr(Number(j.salary_max)) } : {}) },
            },
          }
        : {}),
  };
}

/** Organization + LocalBusiness (EmploymentAgency) for the site layout */
export function organizationLd() {
  const sameAs = Object.values(site.social).filter((u) => typeof u === "string" && u.startsWith("http"));
  const base = siteBase();
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${base}/#org`, name: site.name, legalName: site.legalName, url: base, logo: `${base}/logo.png`, email: site.contact.email, sameAs, description: site.description },
      {
        "@type": ["LocalBusiness", "EmploymentAgency"],
        "@id": `${base}/#business`,
        name: site.name,
        parentOrganization: { "@id": `${base}/#org` },
        url: base,
        image: `${base}/logo.png`,
        logo: `${base}/logo.png`,
        email: site.contact.email,
        address: { "@type": "PostalAddress", addressLocality: "Noida", addressRegion: "Uttar Pradesh", addressCountry: "IN" },
        areaServed: "IN",
        openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "09:00", closes: "20:00" }],
        sameAs,
      },
    ],
  };
}
