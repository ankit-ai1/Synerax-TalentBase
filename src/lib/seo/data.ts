import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Faq, PublicJob, Terms } from "./landing";

/**
 * Public data for the blog + job landing pages. Uses the anon key without cookies, so pages stay
 * statically cacheable (ISR) and RLS / security-definer RPCs decide what's visible (published only).
 */
export const anon = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

export const getJobBoard = cache(async (): Promise<PublicJob[]> => {
  const { data, error } = await anon().rpc("public_job_board");
  if (error) return [];
  return (data ?? []) as PublicJob[];
});

export const getJobByCode = cache(async (code: string): Promise<PublicJob | null> => {
  const { data } = await anon().rpc("public_job_by_code", { p_code: code });
  return (data as PublicJob | null) ?? null;
});

export const getTerms = cache(async (): Promise<Terms> => {
  const { data } = await anon().rpc("public_seo_terms");
  const t = (data ?? {}) as Partial<Terms>;
  return { skills: t.skills ?? [], roles: t.roles ?? [] };
});

export type SeoOverride = { slug: string; enabled: boolean; intro: string | null; faqs: Faq[] | null };
export const getSeoOverrides = cache(async (): Promise<Map<string, SeoOverride>> => {
  const { data } = await anon().from("seo_pages").select("slug, enabled, intro, faqs");
  return new Map(((data ?? []) as SeoOverride[]).map((r) => [r.slug, r]));
});

// ---------------------------------------------------------------- blog
export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  cover_alt: string | null;
  categories: string[];
  tags: string[];
  author_name: string | null;
  seo_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  faqs: Faq[];
  featured: boolean;
  status: "draft" | "scheduled" | "published";
  publish_at: string | null;
  updated_at: string;
  created_at: string;
};
export type PostCard = Pick<Post, "slug" | "title" | "excerpt" | "cover_url" | "cover_alt" | "categories" | "tags" | "author_name" | "publish_at" | "updated_at" | "featured"> & { minutes: number };

const CARD = "slug, title, excerpt, cover_url, cover_alt, categories, tags, author_name, publish_at, updated_at, featured, body_md";
const toCard = (r: Post): PostCard => {
  const words = (r.body_md ?? "").split(/\s+/).filter(Boolean).length;
  const { body_md: _b, ...rest } = r;
  void _b;
  return { ...rest, minutes: Math.max(1, Math.round(words / 220)) } as PostCard;
};

/** all live posts, newest first (RLS hides drafts and future-scheduled posts) */
export const livePosts = cache(async (): Promise<PostCard[]> => {
  const { data } = await anon().from("blog_posts").select(CARD).order("publish_at", { ascending: false }).limit(1000);
  return ((data ?? []) as Post[]).map(toCard);
});

export const getPost = cache(async (slug: string): Promise<Post | null> => {
  const { data } = await anon().from("blog_posts").select("*").eq("slug", slug).maybeSingle();
  return (data as Post | null) ?? null;
});

export const PER_PAGE = 9;
export function filterPosts(all: PostCard[], f: { category?: string; tag?: string; q?: string }) {
  const q = f.q?.trim().toLowerCase();
  return all.filter(
    (p) =>
      (!f.category || p.categories.some((c) => slug(c) === f.category)) &&
      (!f.tag || p.tags.some((t) => slug(t) === f.tag)) &&
      (!q || `${p.title} ${p.excerpt ?? ""} ${p.tags.join(" ")} ${p.categories.join(" ")}`.toLowerCase().includes(q))
  );
}
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function countBy(all: PostCard[], key: "categories" | "tags") {
  const m = new Map<string, { name: string; slug: string; count: number }>();
  for (const p of all) for (const n of p[key]) m.set(slug(n), { name: n, slug: slug(n), count: (m.get(slug(n))?.count ?? 0) + 1 });
  return [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
/** related = most shared categories/tags, then newest */
export function related(all: PostCard[], p: { slug: string; categories: string[]; tags: string[] }, n = 3) {
  const cats = new Set(p.categories.map(slug)), tags = new Set(p.tags.map(slug));
  return all
    .filter((x) => x.slug !== p.slug)
    .map((x) => ({ x, s: x.categories.filter((c) => cats.has(slug(c))).length * 2 + x.tags.filter((t) => tags.has(slug(t))).length }))
    .sort((a, b) => b.s - a.s || (b.x.publish_at ?? "").localeCompare(a.x.publish_at ?? ""))
    .slice(0, n)
    .map((r) => r.x);
}
