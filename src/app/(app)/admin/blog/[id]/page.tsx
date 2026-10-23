import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { team } from "@/data/team";
import { site } from "@/content/site";
import { PageHeader } from "@/components/ui/misc";
import { BlogEditor, type EditorPost } from "./editor";

export const metadata = { title: "Edit post" };

const EMPTY: EditorPost = { id: null, slug: "", title: "", excerpt: "", body_md: "", cover_url: "", cover_alt: "", categories: [], tags: [], author_name: "", seo_title: "", meta_description: "", focus_keyword: "", canonical_url: "", og_image_url: "", faqs: [], featured: false, status: "draft", publish_at: null, updated_at: null };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  let initial = EMPTY;
  if (id !== "new") {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const { data } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    initial = Object.fromEntries(Object.entries({ ...EMPTY, ...data }).map(([k, v]) => [k, v ?? (EMPTY as Record<string, unknown>)[k]])) as EditorPost;
  }
  const { data: all } = await supabase.from("blog_posts").select("categories, tags").limit(1000);
  const uniq = (k: "categories" | "tags") => [...new Set((all ?? []).flatMap((r) => (r[k] as string[]) ?? []))].sort();
  return (
    <div>
      <PageHeader
        title={initial.id ? "Edit post" : "New post"}
        description="Write in Markdown. Drafts stay private; published and scheduled posts appear on /blog."
        actions={
          <Link href="/admin/blog" className="text-[13px] font-medium text-jade-700 hover:underline">
            ← All posts
          </Link>
        }
      />
      <BlogEditor initial={initial} authors={team.map((t) => t.name)} categories={uniq("categories")} tags={uniq("tags")} siteHost={new URL(site.url).host} />
    </div>
  );
}
