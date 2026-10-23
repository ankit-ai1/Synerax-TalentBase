import type { Metadata } from "next";
import { site } from "@/content/site";
import { BlogIndex } from "@/components/site/blog-index";
import { livePosts } from "@/lib/seo/data";
import { breadcrumbLd, ldJson } from "@/lib/seo/jsonld";

export const revalidate = 300; // new / scheduled posts appear within 5 minutes, no redeploy

export const metadata: Metadata = {
  title: "Blog — hiring, careers and staffing insights",
  description: `Practical guides on finding jobs in India and abroad, hiring well and working with a staffing partner — from the ${site.name} team.`,
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
  openGraph: { title: `${site.name} blog`, url: "/blog" },
};

export default async function BlogPage() {
  const all = await livePosts();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd([{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }])) }} />
      <BlogIndex all={all} list={all} page={1} hrefFor={(n) => (n === 1 ? "/blog" : `/blog/page/${n}`)} eyebrow="Blog" title="Hiring & career insights" description="Honest, practical guides for job seekers and employers — written by the Synerax team." showFeatured />
    </>
  );
}
