import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { BlogIndex } from "@/components/site/blog-index";
import { PER_PAGE, livePosts } from "@/lib/seo/data";

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  return { title: `Blog — page ${n}`, alternates: { canonical: `/blog/page/${n}` } };
}

export default async function BlogPaged({ params }: { params: Promise<{ n: string }> }) {
  const n = Number((await params).n);
  if (n === 1) permanentRedirect("/blog");
  const all = await livePosts();
  const featuredCount = all.some((p) => p.featured) ? 1 : 0;
  if (!Number.isInteger(n) || n < 1 || n > Math.max(1, Math.ceil((all.length - featuredCount) / PER_PAGE))) notFound();
  return <BlogIndex all={all} list={all} page={n} hrefFor={(x) => (x === 1 ? "/blog" : `/blog/page/${x}`)} eyebrow="Blog" title="Hiring & career insights" crumbs={[{ href: "/", label: "Home" }, { href: "/blog", label: "Blog" }, { href: `/blog/page/${n}`, label: `Page ${n}` }]} showFeatured />;
}
