/**
 * SEO checklist shown next to the blog editor (pure — unit-tested in tests/blog.test.ts).
 * Every item is pass / warn / fail with a short hint. "All green" = every item passes.
 */
import { mdStats, plainText, slugify } from "./markdown";

export type CheckStatus = "pass" | "warn" | "fail";
export type Check = { key: string; label: string; status: CheckStatus; hint?: string };
export type SeoInput = {
  title: string;
  slug: string;
  body_md: string;
  excerpt?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  cover_url?: string | null;
  cover_alt?: string | null;
};

export const SEO_TITLE_MAX = 60;
export const META_MAX = 155;

const norm = (s: string) => ` ${s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;
/** keyword appears as whole words (case / punctuation insensitive) */
export const hasKeyword = (text: string | null | undefined, kw: string) => !!kw.trim() && norm(text ?? "").includes(norm(kw));

export function seoChecklist(p: SeoInput, siteHost?: string): Check[] {
  const kw = (p.focus_keyword ?? "").trim();
  const st = mdStats(p.body_md, siteHost);
  const seoTitle = (p.seo_title || p.title || "").trim();
  const meta = (p.meta_description || "").trim();
  const out: Check[] = [];
  const add = (key: string, label: string, status: CheckStatus, hint?: string) => out.push({ key, label, status, hint });
  const kwCheck = (key: string, label: string, ok: boolean, hint: string) => add(key, label, !kw ? "fail" : ok ? "pass" : "fail", !kw ? "Set a focus keyword first" : ok ? undefined : hint);

  add("keyword", "Focus keyword set", kw ? "pass" : "fail", kw ? undefined : "Pick the one phrase this post should rank for");
  kwCheck("kw_title", "Keyword in the SEO title", hasKeyword(seoTitle, kw), "Use the keyword in the SEO title, ideally near the start");
  kwCheck("kw_h1", "Keyword in the post title (H1)", hasKeyword(p.title, kw), "Use the keyword in the main title");
  kwCheck("kw_intro", "Keyword in the first paragraph", hasKeyword(st.firstParagraph, kw), "Mention the keyword in the opening paragraph");
  kwCheck("kw_meta", "Keyword in the meta description", hasKeyword(meta, kw), "Use the keyword once in the meta description");
  kwCheck("kw_slug", "Keyword in the URL slug", !!kw && slugify(p.slug).includes(slugify(kw)), `Make the slug contain "${slugify(kw)}"`);

  const tl = seoTitle.length;
  add("title_len", `SEO title length (${tl}/${SEO_TITLE_MAX})`, tl > SEO_TITLE_MAX ? "fail" : tl < 30 ? "warn" : "pass", tl > SEO_TITLE_MAX ? "Too long — Google cuts it off" : tl < 30 ? "A bit short — aim for 30–60 characters" : undefined);
  const ml = meta.length;
  add("meta_len", `Meta description length (${ml}/${META_MAX})`, !ml || ml > META_MAX ? "fail" : ml < 110 ? "warn" : "pass", !ml ? "Write a meta description" : ml > META_MAX ? "Too long — keep it under 155 characters" : ml < 110 ? "A bit short — aim for 110–155 characters" : undefined);

  add("words", `Length: ${st.words.toLocaleString("en-IN")} words`, st.words < 300 ? "fail" : st.words < 800 ? "warn" : "pass", st.words < 800 ? "Helpful posts usually run 800+ words" : undefined);
  const h2 = st.headings.filter((h) => h.level === 2).length;
  add("headings", `Subheadings (${h2} H2)`, h2 >= 2 ? "pass" : h2 === 1 ? "warn" : "fail", h2 >= 2 ? undefined : "Break the post up with ## subheadings");
  const missingAlt = st.images.filter((i) => !i.alt).length + (p.cover_url && !(p.cover_alt ?? "").trim() ? 1 : 0);
  add("alts", missingAlt ? `${missingAlt} image${missingAlt === 1 ? "" : "s"} without alt text` : "All images have alt text", missingAlt ? "fail" : "pass", missingAlt ? "Describe each image (cover alt + ![alt](url))" : undefined);
  const internal = st.links.filter((l) => l.internal).length;
  add("internal_links", `Internal links (${internal})`, internal >= 2 ? "pass" : internal === 1 ? "warn" : "fail", internal >= 2 ? undefined : "Link to at least 2 of our pages (jobs, services, other posts)");
  add("excerpt", "Excerpt written", (p.excerpt ?? "").trim().length >= 50 ? "pass" : "warn", (p.excerpt ?? "").trim().length >= 50 ? undefined : "A 1–2 sentence summary for the blog list");
  add("cover", "Cover image", p.cover_url ? "pass" : "warn", p.cover_url ? undefined : "Posts with a cover look better when shared");

  // readability: sentence + paragraph length
  const text = plainText(p.body_md);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.split(" ").length > 2);
  const avg = sentences.length ? Math.round(text.split(" ").length / sentences.length) : 0;
  add("sentences", `Average sentence: ${avg} words`, avg > 26 ? "warn" : "pass", avg > 26 ? "Shorter sentences (under ~22 words) read more easily" : undefined);
  const longParas = p.body_md.split(/\n\s*\n/).filter((b) => !/^(#|```|\||[-*+]\s|\d+[.)]\s)/.test(b.trim()) && plainText(b).split(" ").length > 150).length;
  add("paragraphs", longParas ? `${longParas} very long paragraph${longParas === 1 ? "" : "s"}` : "Paragraph length OK", longParas ? "warn" : "pass", longParas ? "Split paragraphs over ~150 words" : undefined);
  if (kw && st.words) {
    const n = (norm(text).match(new RegExp(norm(kw).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
    const density = Math.round(((n * kw.split(/\s+/).length) / st.words) * 1000) / 10;
    add("density", `Keyword used ${n}× (${density}%)`, density > 3 ? "warn" : n === 0 ? "fail" : "pass", density > 3 ? "Looks stuffed — write naturally" : n === 0 ? "The keyword never appears in the text" : undefined);
  }
  return out;
}

export const allGreen = (c: Check[]) => c.every((x) => x.status === "pass");
