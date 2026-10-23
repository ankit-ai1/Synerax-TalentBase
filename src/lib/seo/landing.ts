/**
 * Job SEO landing pages (/jobs/<slug>) — the registry + job matching (pure; unit-tested in tests/blog.test.ts).
 * Pages list LIVE published jobs only. A page with 0 jobs shows "No openings right now" and is noindex.
 * Admins can switch a page off or override its intro / FAQ (seo_pages table).
 */
import { slugify } from "@/lib/blog/markdown";

export type PublicJob = {
  id: string;
  job_code: string;
  title: string;
  locations: string[] | null;
  work_mode: string | null;
  employment_type: string | null;
  exp_min: number | null;
  exp_max: number | null;
  openings: number | null;
  qualification: string | null;
  published_at: string | null;
  updated_at: string | null;
  target_date: string | null;
  company: string | null;
  salary_min: number | null;
  salary_max: number | null;
  /** salary in the job's own currency (present after migration 017, only when the job shows salary) */
  salary_min_amount?: number | null;
  salary_max_amount?: number | null;
  salary_currency?: string | null;
  salary_period?: string | null;
  role: string | null;
  description: string | null;
  skills: string[] | null;
};

export type Faq = { q: string; a: string };
export type LandingKind = "city" | "mode" | "country" | "combo" | "skill" | "role";
export type Landing = { slug: string; kind: LandingKind; name: string; h1: string; metaTitle: string; metaDescription: string; intro: string; faqs: Faq[]; related: string[] };

// ---------------------------------------------------------------- places
type City = { slug: string; name: string; aliases: string[]; slugAliases?: string[]; about: string };
export const CITIES: City[] = [
  { slug: "bangalore", name: "Bangalore", aliases: ["bangalore", "bengaluru", "bangaluru", "blr", "whitefield", "electronic city"], slugAliases: ["bengaluru"], about: "Bangalore (Bengaluru) is India's best-known technology city — product companies, global capability centres and startups all hire here, from freshers to senior leaders." },
  { slug: "pune", name: "Pune", aliases: ["pune", "pimpri", "chinchwad", "hinjewadi", "kharadi"], about: "Pune combines a large IT and engineering services base with automotive and manufacturing employers, so roles range from software to operations." },
  { slug: "hyderabad", name: "Hyderabad", aliases: ["hyderabad", "secunderabad", "hitec city", "gachibowli"], about: "Hyderabad is a major hub for IT services, global capability centres, pharma and life sciences." },
  { slug: "chennai", name: "Chennai", aliases: ["chennai", "madras"], about: "Chennai has a strong mix of IT services, SaaS companies, BFSI back offices, automotive and manufacturing employers." },
  { slug: "mumbai", name: "Mumbai", aliases: ["mumbai", "bombay", "navi mumbai", "thane", "powai"], about: "Mumbai is India's financial capital — banking, financial services, media and corporate head offices dominate hiring." },
  { slug: "delhi-ncr", name: "Delhi NCR", aliases: ["delhi", "new delhi", "ncr", "delhi ncr", "noida", "greater noida", "gurugram", "gurgaon", "faridabad", "ghaziabad"], slugAliases: ["delhi", "ncr", "new-delhi"], about: "Delhi NCR — Delhi, Noida, Gurugram, Ghaziabad and Faridabad — covers IT, consulting, BFSI, e-commerce and corporate offices across the region." },
  { slug: "noida", name: "Noida", aliases: ["noida", "greater noida"], slugAliases: ["greater-noida"], about: "Noida (with Greater Noida) hosts IT and software companies, electronics manufacturing and a growing number of startups — and it's where Synerax is based." },
  { slug: "gurugram", name: "Gurugram", aliases: ["gurugram", "gurgaon"], slugAliases: ["gurgaon"], about: "Gurugram (Gurgaon) is home to many multinational offices, consulting firms, fintech and e-commerce companies." },
];
const MORE_INDIA = ["india", "kolkata", "ahmedabad", "jaipur", "indore", "kochi", "cochin", "coimbatore", "chandigarh", "mohali", "lucknow", "bhubaneswar", "nagpur", "vadodara", "mysore", "mysuru", "trivandrum", "thiruvananthapuram", "visakhapatnam", "vizag", "surat", "bhopal", "goa", "pan india"];

type Country = { slug: string; name: string; aliases: string[]; about: string };
export const COUNTRIES: Country[] = [
  { slug: "india", name: "India", aliases: [...CITIES.flatMap((c) => c.aliases), ...MORE_INDIA], about: "We hire for companies across India — metro tech hubs as well as tier-2 cities — for permanent, contract and remote roles." },
  { slug: "uae", name: "UAE", aliases: ["uae", "united arab emirates", "dubai", "abu dhabi", "sharjah", "ajman", "ras al khaimah", "fujairah"], about: "Openings in the United Arab Emirates — mostly Dubai and Abu Dhabi — for professionals looking at a Gulf role." },
  { slug: "usa", name: "USA", aliases: ["usa", "u.s.", "united states", "america", "new york", "new jersey", "california", "texas", "san francisco", "seattle", "chicago", "boston", "atlanta", "dallas", "austin", "houston"], about: "Roles based in the United States. Check each listing for work authorisation and visa requirements before applying." },
];
const FOREIGN = [...COUNTRIES.filter((c) => c.slug !== "india").flatMap((c) => c.aliases), "singapore", "london", "united kingdom", "uk", "canada", "toronto", "australia", "sydney", "saudi", "riyadh", "jeddah", "qatar", "doha", "oman", "muscat", "kuwait", "bahrain", "germany", "netherlands", "malaysia"];

const MODES = [
  { slug: "remote", name: "Remote", value: "remote", slugAliases: ["work-from-home", "wfh"], about: "Fully remote roles — work from home, with the occasional trip only if the employer asks for it." },
  { slug: "hybrid", name: "Hybrid", value: "hybrid", slugAliases: [], about: "Hybrid roles split the week between home and the office — the exact office days are listed on each job." },
  { slug: "onsite", name: "Onsite", value: "onsite", slugAliases: ["on-site", "office"], about: "Onsite roles are based full-time at the employer's office." },
];

// ---------------------------------------------------------------- matching
const low = (s: string | null | undefined) => ` ${(s ?? "").toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim()} `;
const anyAlias = (locs: string[] | null, aliases: string[]) => (locs ?? []).some((l) => aliases.some((a) => low(l).includes(` ${a} `)));
const modeOf = (j: PublicJob) => (j.work_mode ?? "").toLowerCase().replace(/[^a-z]/g, "");
const inCountry = (j: PublicJob, c: string) => {
  const country = COUNTRIES.find((x) => x.slug === c)!;
  if (c === "india") return anyAlias(j.locations, country.aliases) || !anyAlias(j.locations, FOREIGN); // we are India-based: anything not abroad counts
  return anyAlias(j.locations, country.aliases);
};
const has = (list: string[] | null, name: string) => (list ?? []).some((s) => s.toLowerCase() === name.toLowerCase());
const titleHas = (title: string, name: string) => low(title).includes(low(name));

// ---------------------------------------------------------------- copy
const jobWord = (n: string) => `${n} jobs`;
const faqCity = (c: City): Faq[] => [
  { q: `How do I apply for jobs in ${c.name} through Synerax?`, a: `Open any job on this page and apply with your profile, or register once and our recruiters will match you with new ${c.name} openings as they come in. Registering is free.` },
  { q: `Do I have to pay to get a job in ${c.name}?`, a: "No. Synerax never charges candidates — employers pay for our recruiting service. If anyone asks you for money in our name, please report it to us." },
  { q: `Are remote or hybrid roles available for ${c.name}?`, a: `Some are. Each listing shows whether it is onsite, hybrid or remote. You can also browse hybrid jobs in ${c.name} or remote jobs across India.` },
  { q: "What happens after I apply?", a: "A recruiter reviews your profile against the role. If it's a fit, we call you to discuss the job, salary and notice period before sharing your profile with the employer — never without your consent." },
];
const faqGeneric = (what: string): Faq[] => [
  { q: `How do I apply for ${what}?`, a: "Open a job on this page and apply with your profile. If nothing fits right now, register once and we'll alert you when a matching role opens." },
  { q: "Is it free for candidates?", a: "Yes. Synerax never charges job seekers anything — employers pay for our service." },
  { q: "How quickly will a recruiter get back to me?", a: "If your profile matches an open role, a recruiter usually contacts you within a few working days. We'll always ask before sharing your profile with an employer." },
];

function cityLanding(c: City): Landing {
  return {
    slug: c.slug,
    kind: "city",
    name: c.name,
    h1: `Jobs in ${c.name}`,
    metaTitle: `Jobs in ${c.name} — Latest Openings | Synerax`,
    metaDescription: `Browse live jobs in ${c.name} from employers hiring through Synerax. Free for candidates — apply with your profile or get alerts for new ${c.name} roles.`,
    intro: `${c.about} Below are the live openings in ${c.name} that employers have asked us to fill right now. Every role is screened by a Synerax recruiter, and applying is always free.`,
    faqs: faqCity(c),
    related: [`hybrid-${c.slug}`, `onsite-${c.slug}`, "remote-india", ...CITIES.filter((x) => x.slug !== c.slug).map((x) => x.slug).slice(0, 5)],
  };
}
function modeLanding(m: (typeof MODES)[number]): Landing {
  return {
    slug: m.slug,
    kind: "mode",
    name: m.name,
    h1: `${m.name} jobs`,
    metaTitle: `${m.name} Jobs — Live Openings | Synerax`,
    metaDescription: `Find ${m.name.toLowerCase()} jobs with employers hiring through Synerax. Screened roles, free for candidates — apply or register for alerts.`,
    intro: `${m.about} Here are the ${m.name.toLowerCase()} roles our clients are hiring for today.`,
    faqs: faqGeneric(`${m.name.toLowerCase()} jobs`),
    related: [...MODES.filter((x) => x.slug !== m.slug).map((x) => x.slug), ...(m.slug === "remote" ? ["remote-india"] : CITIES.slice(0, 4).map((c) => `${m.slug}-${c.slug}`))],
  };
}
function countryLanding(c: Country): Landing {
  return {
    slug: c.slug,
    kind: "country",
    name: c.name,
    h1: `Jobs in ${c.name}`,
    metaTitle: `Jobs in ${c.name} — Openings via Synerax`,
    metaDescription: `Live jobs in ${c.name} from employers hiring through Synerax. Free for candidates — apply with your profile or register for alerts.`,
    intro: `${c.about} The list below shows only real, currently open roles.`,
    faqs: faqGeneric(`jobs in ${c.name}`),
    related: [...COUNTRIES.filter((x) => x.slug !== c.slug).map((x) => x.slug), `remote-${c.slug}`, ...(c.slug === "india" ? CITIES.map((x) => x.slug).slice(0, 4) : [])],
  };
}
function comboLanding(m: (typeof MODES)[number], placeSlug: string, placeName: string, about: string): Landing {
  return {
    slug: `${m.slug}-${placeSlug}`,
    kind: "combo",
    name: `${m.name} · ${placeName}`,
    h1: `${m.name} jobs in ${placeName}`,
    metaTitle: `${m.name} Jobs in ${placeName} | Synerax`,
    metaDescription: `${m.name} jobs in ${placeName} from employers hiring through Synerax. Free for candidates — apply or register to get alerts.`,
    intro: `${m.about} ${about} These are the ${m.name.toLowerCase()} openings for ${placeName} right now.`,
    faqs: faqGeneric(`${m.name.toLowerCase()} jobs in ${placeName}`),
    related: [m.slug, placeSlug, ...MODES.filter((x) => x.slug !== m.slug).map((x) => `${x.slug}-${placeSlug}`)],
  };
}
function termLanding(name: string, kind: "skill" | "role"): Landing {
  const slug = slugify(name);
  return {
    slug,
    kind,
    name,
    h1: `${jobWord(name)}`,
    metaTitle: `${name} Jobs — Live Openings | Synerax`,
    metaDescription: `Open ${name} jobs with employers hiring through Synerax. Screened roles across India, free for candidates — apply or get alerts.`,
    intro:
      kind === "role"
        ? `Openings for ${name} roles that our clients are hiring for right now. Each listing shows the location, work mode and experience needed.`
        : `Jobs that ask for ${name} skills — from individual-contributor roles to leads. Each listing shows the location, work mode and experience needed.`,
    faqs: faqGeneric(`${name} jobs`),
    related: ["remote", "hybrid", "india", ...CITIES.slice(0, 3).map((c) => c.slug)],
  };
}

/** every fixed landing page (cities, modes, countries, combos) */
export const FIXED_LANDINGS: Landing[] = [
  ...CITIES.map(cityLanding),
  ...MODES.map(modeLanding),
  ...COUNTRIES.map(countryLanding),
  ...COUNTRIES.map((c) => comboLanding(MODES[0], c.slug, c.name, c.about)),
  ...MODES.filter((m) => m.slug !== "remote").flatMap((m) => CITIES.map((c) => comboLanding(m, c.slug, c.name, c.about))),
];

const SLUG_ALIASES: Record<string, string> = Object.fromEntries([...CITIES.flatMap((c) => (c.slugAliases ?? []).map((a) => [a, c.slug])), ...MODES.flatMap((m) => m.slugAliases.map((a) => [a, m.slug]))]);
// combos with an alias place / mode, e.g. hybrid-bengaluru → hybrid-bangalore, wfh-india → remote-india
function aliasCombo(slug: string) {
  const m = /^([a-z-]+?)-([a-z-]+)$/.exec(slug);
  if (!m) return null;
  for (let i = slug.indexOf("-"); i > 0; i = slug.indexOf("-", i + 1)) {
    const a = slug.slice(0, i), b = slug.slice(i + 1);
    const mode = SLUG_ALIASES[a] ?? a;
    const place = SLUG_ALIASES[b] ?? b;
    const target = `${mode}-${place}`;
    if (target !== slug && FIXED_LANDINGS.some((l) => l.slug === target)) return target;
  }
  return null;
}

export type Terms = { skills: string[]; roles: string[] };

/** slug → landing page, a redirect to the canonical slug, or null (404) */
export function resolveLanding(slug: string, terms: Terms): { landing: Landing } | { redirect: string } | null {
  const s = slug.toLowerCase();
  const fixed = FIXED_LANDINGS.find((l) => l.slug === s);
  if (fixed) return { landing: fixed };
  if (SLUG_ALIASES[s]) return { redirect: SLUG_ALIASES[s] };
  const combo = aliasCombo(s);
  if (combo) return { redirect: combo };
  const role = terms.roles.find((r) => slugify(r) === s);
  if (role) return { landing: termLanding(role, "role") };
  const skill = terms.skills.find((k) => slugify(k) === s);
  if (skill) return { landing: termLanding(skill, "skill") };
  return null;
}

/** live jobs that belong on a landing page */
export function jobsFor(l: Landing, jobs: PublicJob[]): PublicJob[] {
  const city = (slug: string) => CITIES.find((c) => c.slug === slug);
  const mode = (slug: string) => MODES.find((m) => m.slug === slug);
  return jobs.filter((j) => {
    switch (l.kind) {
      case "city":
        return anyAlias(j.locations, city(l.slug)!.aliases);
      case "mode":
        return modeOf(j) === mode(l.slug)!.value;
      case "country":
        return inCountry(j, l.slug);
      case "combo": {
        const i = l.slug.indexOf("-");
        const m = mode(l.slug.slice(0, i))!, place = l.slug.slice(i + 1);
        if (modeOf(j) !== m.value) return false;
        const c = city(place);
        return c ? anyAlias(j.locations, c.aliases) : inCountry(j, place);
      }
      case "role":
        return (j.role ?? "").toLowerCase() === l.name.toLowerCase() || titleHas(j.title, l.name);
      case "skill":
        return has(j.skills, l.name) || titleHas(j.title, l.name);
    }
  });
}

// ---------------------------------------------------------------- job detail URLs: /jobs/java-developer-job-0012
export const jobPath = (j: { title: string; job_code: string }) => `/jobs/${slugify(j.title) || "job"}-${j.job_code.toLowerCase()}`;
export function codeFromSlug(slug: string) {
  const m = /(?:^|-)job-(\d{3,})$/i.exec(slug);
  return m ? `JOB-${m[1]}` : null;
}

export { isPublicJobsSegment } from "@/lib/roles";

/** the main landing pages linked from the home page + footer */
export const FEATURED_LANDINGS = [
  { href: "/jobs/bangalore", label: "Jobs in Bangalore" },
  { href: "/jobs/pune", label: "Jobs in Pune" },
  { href: "/jobs/hyderabad", label: "Jobs in Hyderabad" },
  { href: "/jobs/chennai", label: "Jobs in Chennai" },
  { href: "/jobs/mumbai", label: "Jobs in Mumbai" },
  { href: "/jobs/delhi-ncr", label: "Jobs in Delhi NCR" },
  { href: "/jobs/noida", label: "Jobs in Noida" },
  { href: "/jobs/gurugram", label: "Jobs in Gurugram" },
  { href: "/jobs/remote", label: "Remote jobs" },
  { href: "/jobs/hybrid", label: "Hybrid jobs" },
  { href: "/jobs/india", label: "Jobs in India" },
];

/** display label for a landing slug (related links) */
export function landingLabel(slug: string) {
  return FIXED_LANDINGS.find((l) => l.slug === slug)?.h1 ?? slug;
}
