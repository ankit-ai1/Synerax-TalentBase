import type { Metadata } from "next";
import { BlogIndex } from "@/components/site/blog-index";
import { filterPosts, livePosts } from "@/lib/seo/data";

export const metadata: Metadata = { title: "Search the blog", robots: { index: false, follow: true }, alternates: { canonical: "/blog" } };

export default async function BlogSearch({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const all = await livePosts();
  const list = filterPosts(all, { q });
  return (
    <BlogIndex
      all={all}
      list={list}
      page={page}
      q={q}
      hrefFor={(n) => `/blog/search?q=${encodeURIComponent(q)}${n > 1 ? `&page=${n}` : ""}`}
      eyebrow="Blog search"
      title={q ? `Results for “${q}”` : "Search the blog"}
      description={`${list.length} article${list.length === 1 ? "" : "s"} found.`}
      crumbs={[{ href: "/", label: "Home" }, { href: "/blog", label: "Blog" }, { href: "/blog/search", label: "Search" }]}
      empty="No articles match that search. Try a different word."
    />
  );
}
