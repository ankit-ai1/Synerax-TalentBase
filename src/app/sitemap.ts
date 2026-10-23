import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { countBy, getJobBoard, getSeoOverrides, getTerms, livePosts } from "@/lib/seo/data";
import { FIXED_LANDINGS, jobPath, jobsFor, resolveLanding } from "@/lib/seo/landing";
import { slugify } from "@/lib/blog/markdown";

export const revalidate = 3600;

const PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/services", priority: 0.9, changeFrequency: "monthly" },
  { path: "/employers", priority: 0.9, changeFrequency: "monthly" },
  { path: "/careers", priority: 0.9, changeFrequency: "weekly" },
  { path: "/job-seekers", priority: 0.8, changeFrequency: "monthly" },
  { path: "/industries", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "yearly" },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
  { path: "/register", priority: 0.6, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

/** static pages + blog posts / categories / tags + job landing pages that have live jobs + every live job */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");
  const now = new Date();
  const out: MetadataRoute.Sitemap = PAGES.map((p) => ({ url: `${base}${p.path}`, lastModified: now, changeFrequency: p.changeFrequency, priority: p.priority }));
  const [posts, jobs, terms, overrides] = await Promise.all([livePosts(), getJobBoard(), getTerms(), getSeoOverrides()]);

  for (const p of posts) out.push({ url: `${base}/blog/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: "monthly", priority: 0.7 });
  for (const c of countBy(posts, "categories")) out.push({ url: `${base}/blog/category/${c.slug}`, changeFrequency: "weekly", priority: 0.4 });
  for (const t of countBy(posts, "tags")) out.push({ url: `${base}/blog/tag/${t.slug}`, changeFrequency: "weekly", priority: 0.3 });

  // landing pages: only the ones that are switched on AND have live jobs (empty pages are noindex)
  const termSlugs = [...new Set([...terms.roles, ...terms.skills].map(slugify))];
  const landings = [...FIXED_LANDINGS, ...termSlugs.map((s) => resolveLanding(s, terms)).flatMap((r) => (r && "landing" in r ? [r.landing] : []))];
  const seen = new Set<string>();
  for (const l of landings) {
    if (seen.has(l.slug) || overrides.get(l.slug)?.enabled === false) continue;
    seen.add(l.slug);
    const n = jobsFor(l, jobs);
    if (n.length) out.push({ url: `${base}/jobs/${l.slug}`, lastModified: new Date(Math.max(...n.map((j) => new Date(j.updated_at ?? j.published_at ?? now).getTime()))), changeFrequency: "daily", priority: l.kind === "city" || l.kind === "mode" ? 0.8 : 0.6 });
  }
  for (const j of jobs) out.push({ url: `${base}${jobPath(j)}`, lastModified: new Date(j.updated_at ?? j.published_at ?? now), changeFrequency: "daily", priority: 0.7 });
  return out;
}
