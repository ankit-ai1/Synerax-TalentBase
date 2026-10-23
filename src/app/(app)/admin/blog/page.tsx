import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { site } from "@/content/site";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { seoChecklist } from "@/lib/blog/seo-check";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Blog" };

const STATUS: Record<string, string> = { draft: "bg-surface-2 text-ink-600", scheduled: "bg-amber-50 text-amber-800", published: "bg-emerald-50 text-emerald-800" };

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff();
  const { status } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("blog_posts").select("id, slug, title, status, publish_at, updated_at, author_name, featured, body_md, excerpt, seo_title, meta_description, focus_keyword, cover_url, cover_alt").order("updated_at", { ascending: false });
  if (status && ["draft", "scheduled", "published"].includes(status)) q = q.eq("status", status);
  const { data: posts } = await q;
  const host = new URL(site.url).host;
  const tabs = [
    { key: "", label: "All" },
    { key: "draft", label: "Drafts" },
    { key: "scheduled", label: "Scheduled" },
    { key: "published", label: "Published" },
  ];
  return (
    <div>
      <PageHeader
        title="Blog"
        description="Posts for the public blog at /blog. Drafts are private until you publish or schedule them."
        actions={
          <>
            <Link href="/blog" target="_blank" className="text-[13px] font-medium text-jade-700 hover:underline">
              View blog
            </Link>
            <Link href="/admin/blog/new" className={buttonClass("primary", "md")}>
              <Plus className="h-4 w-4" /> New post
            </Link>
          </>
        }
      />
      <div className="mb-4 flex gap-1.5">
        {tabs.map((t) => (
          <Link key={t.key} href={t.key ? `/admin/blog?status=${t.key}` : "/admin/blog"} className={cn("rounded-full px-3 py-1.5 text-[13px] font-medium", (status ?? "") === t.key ? "bg-ink-900 text-surface" : "text-ink-600 hover:bg-surface-2")}>
            {t.label}
          </Link>
        ))}
      </div>
      <Card>
        {!posts?.length ? (
          <EmptyState icon={<FileText />} title="No posts yet" description="Write the first one — it stays a draft until you publish it." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13.5px]" data-testid="blog-posts">
              <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Title</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Author</th>
                  <th className="px-3 py-2.5 font-medium">SEO</th>
                  <th className="px-3 py-2.5 font-medium">Publish date</th>
                  <th className="px-5 py-2.5 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {posts.map((p) => {
                  const c = seoChecklist(p, host);
                  const ok = c.filter((x) => x.status === "pass").length;
                  return (
                    <tr key={p.id} className="hover:bg-surface-2/50">
                      <td className="px-5 py-2.5">
                        <Link href={`/admin/blog/${p.id}`} className="font-medium text-ink-900 hover:text-jade-700">
                          {p.title}
                        </Link>
                        {p.featured && <span className="ml-2 rounded-full bg-jade-50 px-1.5 text-[11px] font-semibold text-jade-700">Featured</span>}
                        <span className="block text-[12px] text-ink-400">/blog/{p.slug}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-semibold capitalize", STATUS[p.status])}>{p.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-ink-600">{p.author_name ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("tabular text-[12.5px] font-semibold", ok === c.length ? "text-emerald-700" : ok >= c.length - 3 ? "text-amber-700" : "text-red-600")}>
                          {ok}/{c.length}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-600">{p.publish_at ? formatDateTime(p.publish_at) : "—"}</td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-ink-500">{formatDateTime(p.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
