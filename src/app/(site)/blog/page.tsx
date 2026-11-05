import type { Metadata } from "next";
import { site } from "@/content/site";
import { ogMeta } from "@/lib/seo/og";
import { BlogIndex } from "@/components/site/blog-index";
import { Container } from "@/components/site/ui";
import { FaqList } from "@/components/site/seo-faq";
import { livePosts } from "@/lib/seo/data";
import { breadcrumbLd, faqLd, ldJson } from "@/lib/seo/jsonld";

export const revalidate = 300; // new / scheduled posts appear within 5 minutes, no redeploy

const DESCRIPTION = `Practical guides on finding jobs in India and abroad, hiring well and working with a staffing partner, from the ${site.name} team.`;

/** shown on the page and mirrored in FAQPage schema */
const FAQS = [
  { q: "Who writes the Synerax blog?", a: "Our recruiters and hiring consultants. Every guide is based on what we see while screening candidates and filling roles for employers across India and the Gulf." },
  { q: "Is the career advice free to use?", a: "Yes. All articles are free to read and share. Synerax also never charges job seekers for registration, interviews, offers or joining." },
  { q: "How often are new articles published?", a: "We publish new guides every few weeks and update older ones when salaries, visa rules or hiring trends change." },
  { q: "Can I get help with a job search beyond the articles?", a: "Yes. Create a free profile and a Synerax recruiter will match you with open roles, help with interview prep and stay in touch until you join." },
  { q: "I am hiring. Where should I start?", a: "Read our guides for employers, then share your requirement on the employers page. We reply within 24 hours with a hiring plan." },
];

export const metadata: Metadata = {
  title: "Blog: hiring tips and career advice for India",
  description: DESCRIPTION,
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
  ...ogMeta(`${site.name} blog`, "/blog", DESCRIPTION),
};

export default async function BlogPage() {
  const all = await livePosts();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd([{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }])) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faqLd(FAQS)) }} />
      <BlogIndex all={all} list={all} page={1} hrefFor={(n) => (n === 1 ? "/blog" : `/blog/page/${n}`)} eyebrow="Blog" title="Hiring & career insights" description="Honest, practical guides for job seekers and employers, written by the Synerax team." showFeatured />
      <section className="band band-light" aria-labelledby="blog-faq-h">
        <Container className="max-w-3xl pb-20">
          <h2 id="blog-faq-h" className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900">
            Frequently asked questions
          </h2>
          <FaqList faqs={FAQS} />
        </Container>
      </section>
    </>
  );
}
