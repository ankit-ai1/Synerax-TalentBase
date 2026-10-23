import { Container } from "./ui";
import { BlogSidebar, CompactHero, Pagination, PostCardView } from "./blog";
import { PER_PAGE, type PostCard } from "@/lib/seo/data";

/** shared layout for /blog, /blog/page/N, category, tag and search pages */
export function BlogIndex({
  all,
  list,
  page,
  hrefFor,
  eyebrow,
  title,
  description,
  crumbs,
  showFeatured,
  q,
  activeCategory,
  activeTag,
  empty,
  perPage = PER_PAGE,
}: {
  all: PostCard[];
  list: PostCard[];
  page: number;
  hrefFor: (n: number) => string;
  eyebrow: string;
  title: string;
  description?: string;
  crumbs?: { href: string; label: string }[];
  showFeatured?: boolean;
  q?: string;
  activeCategory?: string;
  activeTag?: string;
  empty?: string;
  perPage?: number;
}) {
  const featured = showFeatured && page === 1 ? list.find((p) => p.featured) ?? null : null;
  const rest = featured ? list.filter((p) => p !== featured) : list;
  const pages = Math.max(1, Math.ceil(rest.length / perPage));
  const slice = rest.slice((page - 1) * perPage, page * perPage);
  return (
    <>
      <CompactHero eyebrow={eyebrow} title={title} description={description} crumbs={crumbs} />
      <section className="band band-light">
        <Container className="py-14 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
            <div>
              {featured && (
                <div className="mb-8" data-testid="featured-post">
                  <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-400">Featured</p>
                  <PostCardView p={featured} large />
                </div>
              )}
              {slice.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-[15px] text-ink-500">{empty ?? "No articles yet — check back soon."}</p>
              ) : (
                <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="post-list">
                  {slice.map((p) => (
                    <li key={p.slug}>
                      <PostCardView p={p} />
                    </li>
                  ))}
                </ul>
              )}
              <Pagination page={page} pages={pages} href={hrefFor} />
            </div>
            <BlogSidebar all={all} q={q} activeCategory={activeCategory} activeTag={activeTag} />
          </div>
        </Container>
      </section>
    </>
  );
}
