/**
 * Loads the starter blog posts in scripts/blog-drafts/*.md into blog_posts as DRAFTS (never published).
 * Existing posts with the same slug are left untouched, so edits made in the CMS are never overwritten.
 *
 *   node scripts/seed-blog-drafts.mjs           # insert missing drafts
 *   node scripts/seed-blog-drafts.mjs --check   # word counts only, no database
 *   node scripts/seed-blog-drafts.mjs --delete  # remove these drafts again (only if still drafts)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "blog-drafts");
const env = Object.fromEntries(
  (fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
);

function parse(file) {
  const raw = fs.readFileSync(path.join(dir, file), "utf8").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta = Object.fromEntries(m[1].split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  const [body, faqBlock = ""] = m[2].split("<!-- faqs -->");
  const faqs = [];
  for (const l of faqBlock.split("\n")) {
    if (l.startsWith("Q:")) faqs.push({ q: l.slice(2).trim(), a: "" });
    else if (l.startsWith("A:") && faqs.length) faqs[faqs.length - 1].a = l.slice(2).trim();
  }
  const list = (s) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return {
    slug: meta.slug,
    title: meta.title,
    excerpt: meta.excerpt || null,
    body_md: body.trim(),
    categories: list(meta.categories),
    tags: list(meta.tags),
    author_name: meta.author || null,
    seo_title: meta.seo_title || null,
    meta_description: meta.meta_description || null,
    focus_keyword: meta.focus_keyword || null,
    faqs,
    status: "draft",
    publish_at: null,
  };
}

const posts = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map(parse);
const words = (s) => s.replace(/[#>*_`|\-\[\]()!]/g, " ").split(/\s+/).filter(Boolean).length;

if (process.argv.includes("--check")) {
  for (const p of posts) console.log(`${String(words(p.body_md)).padStart(5)} words · ${p.faqs.length} FAQs · ${String(p.seo_title?.length).padStart(2)}/60 · ${String(p.meta_description?.length).padStart(3)}/155 · ${p.slug}`);
  process.exit(0);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
if (process.argv.includes("--delete")) {
  const { data, error } = await db.from("blog_posts").delete().in("slug", posts.map((p) => p.slug)).eq("status", "draft").select("slug");
  if (error) throw error;
  console.log(`Deleted ${data.length} draft(s).`);
  process.exit(0);
}
const { data: existing, error: e1 } = await db.from("blog_posts").select("slug").in("slug", posts.map((p) => p.slug));
if (e1) throw e1;
const have = new Set(existing.map((r) => r.slug));
const fresh = posts.filter((p) => !have.has(p.slug));
if (fresh.length) {
  const { error } = await db.from("blog_posts").insert(fresh);
  if (error) throw error;
}
console.log(`Inserted ${fresh.length} draft(s); ${have.size} already existed and were left unchanged.`);
for (const p of posts) console.log(`  ${have.has(p.slug) ? "kept " : "added"}  /blog/${p.slug}  (${words(p.body_md)} words, ${p.faqs.length} FAQs)`);
