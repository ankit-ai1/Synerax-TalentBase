// npm run test:unit — blog markdown + SEO checklist, job landing pages, JSON-LD
import { test } from "node:test";
import assert from "node:assert/strict";
import { mdStats, renderMarkdown, safeUrl, slugify } from "../src/lib/blog/markdown";
import { allGreen, hasKeyword, seoChecklist } from "../src/lib/blog/seo-check";
import { FIXED_LANDINGS, codeFromSlug, jobPath, jobsFor, resolveLanding, type PublicJob } from "../src/lib/seo/landing";
import { isPublicJobsPath, isPublicPath } from "../src/lib/roles";
import { blogPostingLd, employmentType, faqLd, jobPostingLd, ldJson } from "../src/lib/seo/jsonld";

test("markdown: headings get ids + TOC, inline formatting, lists, tables, images", () => {
  const { html, toc } = renderMarkdown("Intro **bold** and *it* with `x<y`.\n\n## First part\n\n- a\n- b [jobs](/jobs/pune)\n\n### Detail\n\n1. one\n2. two\n\n## First part\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n![Office in Pune](/img.png \"Our office\")\n\n> quoted");
  assert.deepEqual(toc, [
    { id: "first-part", text: "First part", level: 2 },
    { id: "detail", text: "Detail", level: 3 },
    { id: "first-part-2", text: "First part", level: 2 },
  ]);
  assert.match(html, /<p>Intro <strong>bold<\/strong> and <em>it<\/em> with <code>x&lt;y<\/code>.<\/p>/);
  assert.match(html, /<ul><li>a<\/li><li>b <a href="\/jobs\/pune">jobs<\/a><\/li><\/ul>/);
  assert.match(html, /<ol><li>one<\/li><li>two<\/li><\/ol>/);
  assert.match(html, /<table><thead><tr><th>A<\/th><th>B<\/th><\/tr><\/thead><tbody><tr><td>1<\/td><td>2<\/td><\/tr><\/tbody><\/table>/);
  assert.match(html, /<figure><img src="\/img.png" alt="Office in Pune" loading="lazy" decoding="async" title="Our office" \/><figcaption>Our office<\/figcaption><\/figure>/);
  assert.match(html, /<blockquote><p>quoted<\/p><\/blockquote>/);
});

test("markdown: raw HTML and unsafe links are neutralised; external links open safely", () => {
  const { html } = renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1)) [ok](https://example.com) <img src=x onerror=alert(1)>\n\n# Title-ish "quote"');
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!/href="javascript/i.test(html));
  assert.match(html, /<a href="https:\/\/example.com" target="_blank" rel="noopener noreferrer">ok<\/a>/);
  assert.match(html, /<h2 id="title-ish-quote">/); // a single # becomes H2 (the post title is the H1)
  assert.equal(safeUrl("//evil.com"), null);
  assert.equal(safeUrl("/blog/x"), "/blog/x");
});

test("slugify + stats", () => {
  assert.equal(slugify("Jobs in Bengaluru: A 2026 Guide!"), "jobs-in-bengaluru-a-2026-guide");
  assert.equal(slugify("R&D roles"), "r-and-d-roles");
  const s = mdStats("First para with words.\n\n## H\n\n![](/a.png) ![alt](/b.png) [in](/jobs) [ext](https://x.com) [self](https://staffing.synerax.in/blog)", "staffing.synerax.in");
  assert.equal(s.firstParagraph, "First para with words.");
  assert.deepEqual(s.images.map((i) => i.alt), ["", "alt"]);
  assert.deepEqual(s.links.map((l) => l.internal), [true, false, true]);
});

const words = (n: number, w = "Practical advice for candidates helps.") => Array.from({ length: Math.ceil(n / 90) }, () => Array.from({ length: 18 }, () => w).join(" ")).join("\n\n");
const goodPost = () => ({
  title: "Jobs in Pune: a practical guide for IT professionals",
  slug: "jobs-in-pune-guide",
  focus_keyword: "jobs in Pune",
  seo_title: "Jobs in Pune: A Practical Guide for IT Professionals",
  meta_description: "Looking for jobs in Pune? Where companies hire, which skills are in demand, how to apply and what to expect — a practical guide from Synerax recruiters.",
  excerpt: "Where companies hire in Pune, which skills matter and how to apply without paying anyone a fee.",
  cover_url: "/cover.png",
  cover_alt: "Pune skyline",
  body_md: `Finding jobs in Pune is easier with a plan.\n\n## Where companies hire\n\n${words(450)}\n\nSee [jobs in Pune](/jobs/pune) and [hybrid roles](/jobs/hybrid-pune).\n\n## How to apply\n\n${words(450)}\n\nMore jobs in Pune open every week.`,
});

test("SEO checklist: a well-prepared post is all green", () => {
  const c = seoChecklist(goodPost());
  assert.ok(allGreen(c), JSON.stringify(c.filter((x) => x.status !== "pass")));
});

test("SEO checklist: flags missing keyword, long title/meta, missing alt, few links", () => {
  const p = { ...goodPost(), focus_keyword: "", seo_title: "x".repeat(70), meta_description: "y".repeat(160), body_md: "Short.\n\n![](/a.png)", cover_alt: "" };
  const c = Object.fromEntries(seoChecklist(p).map((x) => [x.key, x.status]));
  assert.equal(c.keyword, "fail");
  assert.equal(c.kw_title, "fail");
  assert.equal(c.title_len, "fail");
  assert.equal(c.meta_len, "fail");
  assert.equal(c.alts, "fail");
  assert.equal(c.internal_links, "fail");
  assert.equal(c.words, "fail");
  assert.ok(hasKeyword("Top Jobs-in-Pune list", "jobs in pune"));
  assert.ok(!hasKeyword("jobs in Punerwadi", "jobs in pune"));
});

let n = 0;
const job = (o: Partial<PublicJob> = {}): PublicJob => ({ id: `j${++n}`, job_code: `JOB-${String(n).padStart(4, "0")}`, title: "Java Developer", locations: ["Bengaluru"], work_mode: "Onsite", employment_type: "Full-time", exp_min: 3, exp_max: 6, openings: 2, qualification: null, published_at: "2026-10-01T05:00:00Z", updated_at: "2026-10-02T05:00:00Z", target_date: null, company: "Confidential – IT", salary_min: null, salary_max: null, role: "Software Engineer", description: "Build services.", skills: ["Java", "Spring"], ...o });
const L = (slug: string) => FIXED_LANDINGS.find((l) => l.slug === slug)!;

test("landing pages: city aliases, NCR, modes, combos, countries", () => {
  const jobs = [
    job({ locations: ["Bengaluru"] }),
    job({ locations: ["Gurgaon"], work_mode: "Hybrid" }),
    job({ locations: ["Pune"], work_mode: "Hybrid" }),
    job({ locations: [], work_mode: "Remote" }),
    job({ locations: ["Dubai"] }),
    job({ locations: ["New York"], work_mode: "Remote" }),
    job({ locations: ["Greater Noida"] }),
  ];
  const ids = (slug: string) => jobsFor(L(slug), jobs).map((j) => j.locations?.[0] ?? "remote");
  assert.deepEqual(ids("bangalore"), ["Bengaluru"]);
  assert.deepEqual(ids("gurugram"), ["Gurgaon"]);
  assert.deepEqual(ids("delhi-ncr"), ["Gurgaon", "Greater Noida"]);
  assert.deepEqual(ids("noida"), ["Greater Noida"]);
  assert.deepEqual(ids("hybrid-pune"), ["Pune"]);
  assert.deepEqual(ids("remote"), ["remote", "New York"]);
  assert.deepEqual(ids("remote-india"), ["remote"]);
  assert.deepEqual(ids("remote-usa"), ["New York"]);
  assert.deepEqual(ids("uae"), ["Dubai"]);
  assert.ok(!ids("india").includes("Dubai") && ids("india").includes("Bengaluru"));
  assert.deepEqual(ids("chennai"), []);
});

test("resolveLanding: fixed pages, alias redirects, skills and roles, unknown → 404", () => {
  const terms = { skills: ["Salesforce", "Data Engineering"], roles: ["Data Engineer"] };
  assert.equal((resolveLanding("pune", terms) as { landing: { kind: string } }).landing.kind, "city");
  assert.deepEqual(resolveLanding("bengaluru", terms), { redirect: "bangalore" });
  assert.deepEqual(resolveLanding("gurgaon", terms), { redirect: "gurugram" });
  assert.deepEqual(resolveLanding("hybrid-bengaluru", terms), { redirect: "hybrid-bangalore" });
  assert.deepEqual(resolveLanding("wfh", terms), { redirect: "remote" });
  assert.equal((resolveLanding("data-engineer", terms) as { landing: { kind: string } }).landing.kind, "role");
  const sf = resolveLanding("salesforce", terms) as { landing: { kind: string; name: string } };
  assert.equal(sf.landing.kind, "skill");
  assert.equal(jobsFor(sf.landing as never, [job({ skills: ["Salesforce"] }), job({ title: "Salesforce Admin", skills: [] }), job()]).length, 2);
  assert.equal(resolveLanding("not-a-page", terms), null);
});

test("job URLs + public paths: /jobs/<slug> public, staff /jobs/<uuid> stays private", () => {
  assert.equal(jobPath({ title: "Sr. Java Developer (Spring)", job_code: "JOB-0012" }), "/jobs/sr-java-developer-spring-job-0012");
  assert.equal(codeFromSlug("sr-java-developer-spring-job-0012"), "JOB-0012");
  assert.equal(codeFromSlug("bangalore"), null);
  assert.ok(isPublicJobsPath("/jobs/bangalore") && isPublicPath("/jobs/remote-india"));
  assert.ok(!isPublicJobsPath("/jobs") && !isPublicJobsPath("/jobs/new") && !isPublicJobsPath("/jobs/review"));
  assert.ok(!isPublicJobsPath("/jobs/3f2b2c1e-1d2a-4f5b-9c7d-0a1b2c3d4e5f") && !isPublicJobsPath("/jobs/3f2b2c1e-1d2a-4f5b-9c7d-0a1b2c3d4e5f/edit"));
  assert.ok(isPublicPath("/blog") && isPublicPath("/blog/some-post") && isPublicPath("/api/blog/img/x"));
  assert.ok(!isPublicPath("/admin/blog"));
});

test("JobPosting: remote → TELECOMMUTE, salary only when shown, validThrough, employment type", () => {
  const now = Date.parse("2026-10-20T00:00:00Z");
  const remote = jobPostingLd(job({ work_mode: "Remote", locations: [], salary_min: 12, salary_max: 18, target_date: "2026-12-31" }), now) as Record<string, unknown>;
  assert.equal(remote.jobLocationType, "TELECOMMUTE");
  assert.ok(remote.applicantLocationRequirements);
  assert.equal(remote.jobLocation, undefined);
  assert.deepEqual((remote.baseSalary as { value: unknown }).value, { "@type": "QuantitativeValue", unitText: "YEAR", minValue: 1200000, maxValue: 1800000 });
  assert.equal(remote.validThrough, "2026-12-31T18:29:59.000Z");
  assert.equal((remote.hiringOrganization as { name: string }).name, "Synerax TalentBase");
  const onsite = jobPostingLd(job({ employment_type: "Contract" }), now) as Record<string, unknown>;
  assert.equal(onsite.baseSalary, undefined);
  assert.equal(onsite.employmentType, "CONTRACTOR");
  assert.equal((onsite.jobLocation as { address: { addressLocality: string } }[])[0].address.addressLocality, "Bengaluru");
  assert.ok(new Date(onsite.validThrough as string).getTime() > now);
  assert.equal(employmentType("Internship"), "INTERN");
});

test("BlogPosting + FAQPage + safe JSON", () => {
  const b = blogPostingLd({ slug: "x", title: "T", publish_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-05T00:00:00Z", author_name: "Ankit Raj" }, 1200) as Record<string, unknown>;
  assert.equal(b["@type"], "BlogPosting");
  assert.equal((b.author as { name: string }).name, "Ankit Raj");
  assert.equal(b.wordCount, 1200);
  assert.equal(faqLd([]), null);
  assert.equal((faqLd([{ q: "Q?", a: "A." }]) as { mainEntity: unknown[] }).mainEntity.length, 1);
  assert.ok(!ldJson({ x: "</script><script>" }).includes("</script>"));
});
