import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndex } from "@/components/site/blog-index";
import { countBy, filterPosts, livePosts } from "@/lib/seo/data";
import { breadcrumbLd, ldJson } from "@/lib/seo/jsonld";

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

async function load(slug: string) {
  const all = await livePosts();
  const cat = countBy(all, "categories").find((c) => c.slug === slug);
  return { all, cat };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { cat } = await load(slug);
  if (!cat) return { title: "Category not found", robots: { index: false } };
  return { title: `${cat.name} — articles`, description: `Synerax articles about ${cat.name.toLowerCase()}.`, alternates: { canonical: `/blog/category/${slug}` } };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { all, cat } = await load(slug);
  if (!cat) notFound();
  const crumbs = [{ href: "/", label: "Home" }, { href: "/blog", label: "Blog" }, { href: `/blog/category/${slug}`, label: cat.name }];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd(crumbs.map((c) => ({ name: c.label, url: c.href })))) }} />
      <BlogIndex all={all} list={filterPosts(all, { category: slug })} page={1} perPage={1000} hrefFor={() => "/blog"} eyebrow="Category" title={cat.name} description={`${cat.count} article${cat.count === 1 ? "" : "s"}`} crumbs={crumbs} activeCategory={slug} />
    </>
  );
}
