import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { site } from "@/content/site";
import { Container } from "@/components/site/ui";
import { AuthorBox, CompactHero, CtaBlocks, PostCardView, ShareLinks, categoryHref, tagHref } from "@/components/site/blog";
import { FaqList } from "@/components/site/seo-faq";
import { getPost, livePosts, related } from "@/lib/seo/data";
import { mdStats, renderMarkdown } from "@/lib/blog/markdown";
import { blogPostingLd, breadcrumbLd, faqLd, ldJson, siteBase } from "@/lib/seo/jsonld";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() {
  return (await livePosts()).slice(0, 50).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPost((await params).slug);
  if (!p) return { title: "Article not found", robots: { index: false } };
  const title = p.seo_title || p.title;
  const description = p.meta_description || p.excerpt || undefined;
  const og = p.og_image_url || p.cover_url || `/blog/${p.slug}/og`;
  return {
    title: { absolute: title },
    description,
    keywords: p.focus_keyword ? [p.focus_keyword, ...p.tags] : p.tags,
    alternates: { canonical: p.canonical_url || `/blog/${p.slug}` },
    authors: p.author_name ? [{ name: p.author_name }] : undefined,
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${p.slug}`,
      publishedTime: p.publish_at ?? undefined,
      modifiedTime: p.updated_at,
      authors: p.author_name ? [p.author_name] : undefined,
      tags: p.tags,
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPost((await params).slug);
  if (!p) notFound();
  const host = new URL(siteBase()).host;
  const { html, toc } = renderMarkdown(p.body_md, { siteHost: host });
  const st = mdStats(p.body_md, host);
  const all = await livePosts();
  const rel = related(all, p);
  const url = `${siteBase()}/blog/${p.slug}`;
  const faqs = (p.faqs ?? []).filter((f) => f.q?.trim() && f.a?.trim());
  const crumbs = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    ...(p.categories[0] ? [{ href: categoryHref(p.categories[0]), label: p.categories[0] }] : []),
    { href: `/blog/${p.slug}`, label: p.title },
  ];
  const ld = [blogPostingLd(p, st.words), breadcrumbLd(crumbs.map((c) => ({ name: c.label, url: c.href }))), faqLd(faqs)].filter(Boolean);

  return (
    <>
      {ld.map((o, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(o) }} />
      ))}
      <CompactHero eyebrow={p.categories[0] ?? "Blog"} title={p.title} description={p.excerpt ?? undefined} crumbs={crumbs}>
        <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-500">
          {p.author_name && <span className="font-medium text-ink-700">{p.author_name}</span>}
          <span>Published {formatDate(p.publish_at)}</span>
          {p.updated_at && p.publish_at && new Date(p.updated_at).getTime() - new Date(p.publish_at).getTime() > 86400e3 && <span>Updated {formatDate(p.updated_at)}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden /> {st.minutes} min read
          </span>
        </p>
      </CompactHero>

      <section className="band band-light">
        <Container className="py-12 sm:py-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_280px]">
            <article className="min-w-0 max-w-[760px]">
              {p.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt={p.cover_alt ?? ""} className="mb-10 aspect-[16/9] w-full rounded-2xl border border-line object-cover" fetchPriority="high" />
              )}
              {toc.length >= 3 && (
                <details className="card-premium mb-10 p-5 lg:hidden" open>
                  <summary className="cursor-pointer text-[14px] font-semibold text-ink-900">In this article</summary>
                  <Toc toc={toc} />
                </details>
              )}
              <div className="blog-prose" data-testid="post-body" dangerouslySetInnerHTML={{ __html: html }} />

              {faqs.length > 0 && (
                <section className="mt-14" aria-labelledby="faq-h">
                  <h2 id="faq-h" className="text-[26px] font-semibold tracking-[-0.02em] text-ink-900">
                    Frequently asked questions
                  </h2>
                  <FaqList faqs={faqs} />
                </section>
              )}

              {(p.tags.length > 0 || p.categories.length > 0) && (
                <ul className="mt-12 flex flex-wrap gap-2">
                  {p.categories.map((c) => (
                    <li key={c}>
                      <Link href={categoryHref(c)} className="rounded-full bg-jade-50 px-3 py-1.5 text-[13px] font-medium text-jade-700">
                        {c}
                      </Link>
                    </li>
                  ))}
                  {p.tags.map((t) => (
                    <li key={t}>
                      <Link href={tagHref(t)} className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-600 hover:border-line-strong">
                        #{t}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-8 border-t border-line pt-6">
                <ShareLinks url={url} title={p.title} />
              </div>
              <div className="mt-8">
                <AuthorBox name={p.author_name} />
              </div>
              <div className="mt-10">
                <CtaBlocks />
              </div>
            </article>
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {toc.length >= 3 && (
                  <nav aria-label="Table of contents" className="card-premium p-5">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-400">In this article</p>
                    <Toc toc={toc} />
                  </nav>
                )}
                <CtaBlocks compact />
              </div>
            </aside>
          </div>

          {rel.length > 0 && (
            <div className="mt-20">
              <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-ink-900">Related articles</h2>
              <ul className="mt-6 grid gap-6 md:grid-cols-3" data-testid="related-posts">
                {rel.map((r) => (
                  <li key={r.slug}>
                    <PostCardView p={r} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Container>
      </section>
      <p className="sr-only">
        {site.name} blog
      </p>
    </>
  );
}

function Toc({ toc }: { toc: { id: string; text: string; level: 2 | 3 }[] }) {
  return (
    <ol className="mt-3 space-y-2 text-[14px]">
      {toc.map((t) => (
        <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
          <a href={`#${t.id}`} className="text-ink-600 hover:text-jade-700">
            {t.text}
          </a>
        </li>
      ))}
    </ol>
  );
}
