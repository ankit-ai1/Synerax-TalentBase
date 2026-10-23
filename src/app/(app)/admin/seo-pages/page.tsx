import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { getJobBoard, getTerms } from "@/lib/seo/data";
import { FIXED_LANDINGS, jobsFor, resolveLanding, type Faq } from "@/lib/seo/landing";
import { slugify } from "@/lib/blog/markdown";
import { SeoPagesTable, type SeoRow } from "./table";

export const metadata = { title: "SEO landing pages" };
export const dynamic = "force-dynamic";

export default async function SeoPagesAdmin() {
  await requireAdmin();
  const [jobs, terms, { data: overrides }] = await Promise.all([getJobBoard(), getTerms(), (await createClient()).from("seo_pages").select("slug, enabled, intro, faqs")]);
  const o = new Map((overrides ?? []).map((r) => [r.slug as string, r as { slug: string; enabled: boolean; intro: string | null; faqs: Faq[] | null }]));
  const termLandings = [...new Set([...terms.roles, ...terms.skills].map(slugify))].map((s) => resolveLanding(s, terms)).flatMap((r) => (r && "landing" in r ? [r.landing] : []));
  const seen = new Set<string>();
  const rows: SeoRow[] = [...FIXED_LANDINGS, ...termLandings]
    .filter((l) => !seen.has(l.slug) && seen.add(l.slug))
    .map((l) => ({
      slug: l.slug,
      kind: l.kind,
      h1: l.h1,
      jobs: jobsFor(l, jobs).length,
      enabled: o.get(l.slug)?.enabled ?? true,
      intro: o.get(l.slug)?.intro ?? "",
      faqs: o.get(l.slug)?.faqs ?? [],
      defaultIntro: l.intro,
      defaultFaqs: l.faqs,
    }));
  return (
    <div>
      <PageHeader
        title="SEO landing pages"
        description="Public pages at /jobs/<page> that list live jobs. Pages with 0 jobs show “No openings right now” and are hidden from Google (noindex) until they have jobs. Switch a page off to remove it completely."
      />
      <SeoPagesTable rows={rows} />
    </div>
  );
}
