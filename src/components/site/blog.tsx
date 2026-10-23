import Link from "next/link";
import { ArrowRight, Briefcase, ChevronLeft, ChevronRight, Clock, Search, UsersRound } from "lucide-react";
import { team } from "@/data/team";
import { Container } from "./ui";
import { Silk } from "./silk";
import { MagneticButton } from "./magnetic-button";
import { countBy, slug, type PostCard } from "@/lib/seo/data";
import { cn, formatDate, initials } from "@/lib/utils";

/** compact inner-page hero for the blog + job landing pages (same look as the legal pages) */
export function CompactHero({ eyebrow, title, description, crumbs, children }: { eyebrow: string; title: string; description?: string; crumbs?: { href: string; label: string }[]; children?: React.ReactNode }) {
  return (
    <section className="relative isolate -mt-16 overflow-clip bg-canvas pb-14 pt-32 sm:pb-16 sm:pt-36">
      <Silk focus={[0.8, 0.6]} amount={0.4} heat={0.2} />
      <Container className="relative">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-ink-500">
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((c, i) => (
                <li key={c.href} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden>/</span>}
                  {i === crumbs.length - 1 ? <span aria-current="page" className="text-ink-700">{c.label}</span> : <Link href={c.href} className="hover:text-ink-900">{c.label}</Link>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-jade-700">{eyebrow}</p>
        <h1 className="rise-line mt-4 max-w-4xl text-balance text-[38px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink-900 sm:text-[56px]">
          <span className="metal">{title}</span>
        </h1>
        {description && <p className="mt-5 max-w-2xl text-pretty text-[17px] leading-relaxed text-ink-600">{description}</p>}
        {children}
      </Container>
    </section>
  );
}

export function PostCardView({ p, large }: { p: PostCard; large?: boolean }) {
  return (
    <article className={cn("card-premium lift group relative flex h-full flex-col overflow-hidden", large && "lg:flex-row")}>
      {p.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.cover_url} alt={p.cover_alt ?? ""} loading="lazy" decoding="async" className={cn("aspect-[16/9] w-full border-b border-line object-cover", large && "lg:aspect-auto lg:w-1/2 lg:border-b-0 lg:border-r")} />
      ) : (
        <div aria-hidden className={cn("flex aspect-[16/9] w-full items-end border-b border-line bg-gradient-to-br from-jade-50 to-jade-100/60 p-5", large && "lg:aspect-auto lg:w-1/2")}>
          <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-jade-700">{p.categories[0] ?? "Synerax blog"}</span>
        </div>
      )}
      <div className={cn("flex flex-1 flex-col p-6", large && "lg:p-9")}>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-500">
          {p.categories[0] && <span className="font-semibold text-jade-700">{p.categories[0]}</span>}
          <span>{formatDate(p.publish_at)}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden /> {p.minutes} min read
          </span>
        </p>
        <h3 className={cn("mt-3 text-balance font-semibold tracking-[-0.02em] text-ink-900", large ? "text-[26px] leading-tight sm:text-[32px]" : "text-[19px] leading-snug")}>
          <Link href={`/blog/${p.slug}`} className="after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>
        {p.excerpt && <p className={cn("mt-3 text-ink-600", large ? "text-[16.5px] leading-relaxed" : "line-clamp-3 text-[14.5px] leading-relaxed")}>{p.excerpt}</p>}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-semibold text-jade-700">
          Read article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </article>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (n: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className="inline-flex h-10 items-center gap-1 rounded-full border border-line px-4 text-[14px] text-ink-700 hover:border-line-strong">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Newer
        </Link>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <Link key={n} href={href(n)} aria-current={n === page ? "page" : undefined} className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full text-[14px] tabular", n === page ? "bg-jade font-semibold text-white" : "border border-line text-ink-700 hover:border-line-strong")}>
          {n}
        </Link>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} rel="next" className="inline-flex h-10 items-center gap-1 rounded-full border border-line px-4 text-[14px] text-ink-700 hover:border-line-strong">
          Older <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </nav>
  );
}

export function BlogSidebar({ all, q, activeCategory, activeTag }: { all: PostCard[]; q?: string; activeCategory?: string; activeTag?: string }) {
  const cats = countBy(all, "categories");
  const tags = countBy(all, "tags").slice(0, 24);
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1.5 text-[13px] transition-colors", active ? "border-jade bg-jade text-white" : "border-line text-ink-600 hover:border-line-strong hover:text-ink-900");
  return (
    <aside className="space-y-8">
      <form action="/blog/search" role="search" className="relative">
        <label htmlFor="blog-q" className="sr-only">Search articles</label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <input id="blog-q" name="q" defaultValue={q} placeholder="Search articles" className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-[14px] text-ink-900 outline-none focus:border-jade" />
      </form>
      {cats.length > 0 && (
        <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-400">Categories</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            <li>
              <Link href="/blog" className={chip(!activeCategory && !activeTag && !q)}>All</Link>
            </li>
            {cats.map((c) => (
              <li key={c.slug}>
                <Link href={`/blog/category/${c.slug}`} className={chip(activeCategory === c.slug)}>
                  {c.name} <span className="opacity-60">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tags.length > 0 && (
        <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-400">Tags</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <li key={t.slug}>
                <Link href={`/blog/tag/${t.slug}`} className={chip(activeTag === t.slug)}>
                  #{t.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <CtaBlocks compact />
    </aside>
  );
}

/** "Find jobs" / "Hire talent" blocks */
export function CtaBlocks({ compact }: { compact?: boolean }) {
  const items = [
    { icon: Briefcase, title: "Looking for a job?", body: "Browse live openings or register once — we'll match you with roles. Always free for candidates.", href: "/careers", label: "Find jobs" },
    { icon: UsersRound, title: "Hiring?", body: "Get screened profiles for permanent, contract or bulk roles from our recruiting team.", href: "/employers", label: "Hire talent" },
  ];
  return (
    <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
      {items.map((it) => (
        <div key={it.label} className="card-premium p-6">
          <it.icon className="h-5 w-5 text-jade-700" aria-hidden />
          <p className="mt-3 text-[17px] font-semibold text-ink-900">{it.title}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">{it.body}</p>
          <div className="mt-4">
            <MagneticButton href={it.href} size="md" variant={it.label === "Find jobs" ? "primary" : "secondary"}>
              {it.label}
            </MagneticButton>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuthorBox({ name }: { name: string | null }) {
  const m = team.find((t) => t.name === name);
  if (!name) return null;
  return (
    <div className="card-premium flex items-start gap-4 p-6">
      {m?.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.photo} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-jade-50 text-[17px] font-semibold text-jade-700">
          {initials(name)}
        </span>
      )}
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-400">Written by</p>
        <p className="mt-1 text-[17px] font-semibold text-ink-900">{name}</p>
        {m?.role && <p className="text-[14px] text-ink-500">{m.role}, Synerax</p>}
        {m?.linkedin && (
          <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[13.5px] font-medium text-jade-700 hover:underline">
            LinkedIn profile
          </a>
        )}
      </div>
    </div>
  );
}

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url), t = encodeURIComponent(title);
  const links = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: "Email", href: `mailto:?subject=${t}&body=${u}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-400">Share</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-600 hover:border-line-strong hover:text-ink-900">
          {l.label}
        </a>
      ))}
    </div>
  );
}

export const tagHref = (t: string) => `/blog/tag/${slug(t)}`;
export const categoryHref = (c: string) => `/blog/category/${slug(c)}`;
