"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bold, CheckCircle2, CircleAlert, CircleX, ExternalLink, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Plus, Quote, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { ChipInput, SelectField, Switch, TextArea, TextField } from "@/components/ui/fields";
import { Segmented } from "@/components/ui/interactive";
import { renderMarkdown, slugify, mdStats } from "@/lib/blog/markdown";
import { META_MAX, SEO_TITLE_MAX, allGreen, seoChecklist } from "@/lib/blog/seo-check";
import { cn, friendlyError, fromLocalInput, toLocalInput } from "@/lib/utils";

export type EditorPost = {
  id: string | null;
  slug: string;
  title: string;
  excerpt: string;
  body_md: string;
  cover_url: string;
  cover_alt: string;
  categories: string[];
  tags: string[];
  author_name: string;
  seo_title: string;
  meta_description: string;
  focus_keyword: string;
  canonical_url: string;
  og_image_url: string;
  faqs: { q: string; a: string }[];
  featured: boolean;
  status: "draft" | "scheduled" | "published";
  publish_at: string | null;
  updated_at: string | null;
};

const RESERVED = new Set(["page", "search", "category", "tag"]);

export function BlogEditor({ initial, authors, categories, tags, siteHost }: { initial: EditorPost; authors: string[]; categories: string[]; tags: string[]; siteHost: string }) {
  const router = useRouter();
  const [p, setP] = useState<EditorPost>(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const body = useRef<HTMLTextAreaElement>(null);
  const set = <K extends keyof EditorPost>(k: K, v: EditorPost[K]) => setP((x) => ({ ...x, [k]: v }));

  const checks = useMemo(() => seoChecklist(p, siteHost), [p, siteHost]);
  const passed = checks.filter((c) => c.status === "pass").length;
  const stats = useMemo(() => mdStats(p.body_md, siteHost), [p.body_md, siteHost]);
  const preview = useMemo(() => (tab === "preview" ? renderMarkdown(p.body_md, { siteHost }).html : ""), [tab, p.body_md, siteHost]);

  /** wrap the selection / insert at the cursor */
  function wrap(before: string, after = "", placeholder = "") {
    const el = body.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    set("body_md", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  }
  function linePrefix(prefix: string) {
    const el = body.current;
    if (!el) return;
    const { selectionStart: s, value } = el;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    set("body_md", value.slice(0, start) + prefix + value.slice(start));
    requestAnimationFrame(() => el.focus());
  }

  async function upload(file: File, alt = ""): Promise<string | null> {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("alt", alt);
    const res = await fetch("/api/blog/upload", { method: "POST", body: fd }).catch(() => null);
    setUploading(false);
    const j = (await res?.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res?.ok || !j.url) {
      toast.error(j.error ?? "Upload failed");
      return null;
    }
    return j.url;
  }
  async function insertImage(file: File) {
    const alt = prompt("Describe the image (alt text — important for SEO and screen readers):", "") ?? "";
    const url = await upload(file, alt);
    if (url) wrap(`\n\n![${alt.replace(/[[\]]/g, "")}](${url})\n\n`);
  }

  async function save(status?: EditorPost["status"]) {
    const next = { ...p, status: status ?? p.status };
    const slug = slugify(next.slug || next.title);
    if (!next.title.trim()) return toast.error("Add a title");
    if (!slug) return toast.error("Add a slug");
    if (RESERVED.has(slug)) return toast.error(`"${slug}" is reserved — pick another slug`);
    if (next.status === "scheduled" && (!next.publish_at || new Date(next.publish_at).getTime() <= Date.now())) return toast.error("Pick a future publish date to schedule");
    if (next.seo_title.length > SEO_TITLE_MAX) return toast.error(`SEO title must be ${SEO_TITLE_MAX} characters or less`);
    if (next.meta_description.length > META_MAX) return toast.error(`Meta description must be ${META_MAX} characters or less`);
    setSaving(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const row = {
      slug,
      title: next.title.trim(),
      excerpt: next.excerpt.trim() || null,
      body_md: next.body_md,
      cover_url: next.cover_url.trim() || null,
      cover_alt: next.cover_alt.trim() || null,
      categories: next.categories,
      tags: next.tags,
      author_name: next.author_name || null,
      seo_title: next.seo_title.trim() || null,
      meta_description: next.meta_description.trim() || null,
      focus_keyword: next.focus_keyword.trim() || null,
      canonical_url: next.canonical_url.trim() || null,
      og_image_url: next.og_image_url.trim() || null,
      faqs: next.faqs.filter((f) => f.q.trim() && f.a.trim()),
      featured: next.featured,
      status: next.status,
      publish_at: next.status === "published" && !next.publish_at ? new Date().toISOString() : next.publish_at,
      updated_by: user?.id ?? null,
    };
    const q = p.id ? sb.from("blog_posts").update(row).eq("id", p.id).select("id, updated_at, publish_at").single() : sb.from("blog_posts").insert({ ...row, created_by: user?.id ?? null }).select("id, updated_at, publish_at").single();
    const { data, error } = await q;
    setSaving(false);
    if (error) return toast.error(/duplicate|unique/i.test(error.message) ? "Another post already uses this slug" : friendlyError(error.message));
    await fetch("/api/blog/revalidate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slugs: [slug, initial.slug].filter(Boolean) }) }).catch(() => null);
    setP({ ...next, slug, id: data.id, updated_at: data.updated_at, publish_at: data.publish_at });
    toast.success(next.status === "published" ? "Published" : next.status === "scheduled" ? "Scheduled" : "Draft saved");
    if (!p.id) router.replace(`/admin/blog/${data.id}`);
    else router.refresh();
  }

  async function remove() {
    if (!p.id || !confirm("Delete this post permanently?")) return;
    const { error } = await createClient().from("blog_posts").delete().eq("id", p.id);
    if (error) return toast.error(friendlyError(error.message));
    await fetch("/api/blog/revalidate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slugs: [p.slug] }) }).catch(() => null);
    toast.success("Post deleted");
    router.push("/admin/blog");
  }

  const tool = "inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-600 hover:bg-surface-2 hover:text-ink-900";
  const live = p.status === "published" || (p.status === "scheduled" && p.publish_at && new Date(p.publish_at).getTime() <= Date.now());

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        <Card className="space-y-4 p-5">
          <TextField label="Title (H1)" required value={p.title} onChange={(v) => setP((x) => ({ ...x, title: v, slug: slugTouched ? x.slug : slugify(v) }))} placeholder="e.g. How to find IT jobs in Bangalore" data-testid="post-title" />
          <TextField
            label="Slug"
            value={p.slug}
            onChange={(v) => {
              setSlugTouched(true);
              set("slug", v.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
            }}
            prefix={<span className="text-[12.5px] text-ink-400">/blog/</span>}
            hint="Short, lowercase, with the focus keyword. Changing it after publishing breaks old links."
          />
          <TextArea label="Excerpt" value={p.excerpt} onChange={(v) => set("excerpt", v)} rows={2} hint="1–2 sentences shown on the blog list and in search results if there's no meta description." />
        </Card>

        <Card>
          <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-2">
            <Segmented value={tab} onChange={(v) => setTab(v)} options={[{ value: "write", label: "Write" }, { value: "preview", label: "Preview" }]} />
            {tab === "write" && (
              <div className="ml-2 flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Formatting">
                <button type="button" className={tool} title="Heading" onClick={() => linePrefix("## ")}><Heading2 className="h-4 w-4" /></button>
                <button type="button" className={tool} title="Subheading" onClick={() => linePrefix("### ")}><Heading3 className="h-4 w-4" /></button>
                <button type="button" className={tool} title="Bold" onClick={() => wrap("**", "**", "bold text")}><Bold className="h-4 w-4" /></button>
                <button type="button" className={tool} title="Italic" onClick={() => wrap("*", "*", "italic text")}><Italic className="h-4 w-4" /></button>
                <button type="button" className={tool} title="Link" onClick={() => { const u = prompt("Link URL (e.g. /jobs/bangalore or https://…)"); if (u) wrap("[", `](${u})`, "link text"); }}><Link2 className="h-4 w-4" /></button>
                <button type="button" className={tool} title="Bulleted list" onClick={() => linePrefix("- ")}><List className="h-4 w-4" /></button>
                <button type="button" className={tool} title="Numbered list" onClick={() => linePrefix("1. ")}><ListOrdered className="h-4 w-4" /></button>
                <button type="button" className={tool} title="Quote" onClick={() => linePrefix("> ")}><Quote className="h-4 w-4" /></button>
                <label className={cn(tool, "cursor-pointer")} title="Upload an image">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) insertImage(f); }} />
                </label>
              </div>
            )}
            <span className="ml-auto text-[12px] tabular text-ink-400">{stats.words.toLocaleString("en-IN")} words · {stats.minutes} min read</span>
          </div>
          {tab === "write" ? (
            <textarea
              ref={body}
              value={p.body_md}
              onChange={(e) => set("body_md", e.target.value)}
              onPaste={(e) => {
                const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
                if (f) {
                  e.preventDefault();
                  insertImage(f);
                }
              }}
              rows={28}
              spellCheck
              placeholder={"Write in Markdown.\n\n## A subheading\n\nA paragraph with **bold**, *italic* and a [link](/jobs/bangalore).\n\n- a list item\n\n![Describe the image](https://…)"}
              className="block w-full resize-y bg-transparent px-5 py-4 font-mono text-[13.5px] leading-relaxed text-ink-800 outline-none"
              aria-label="Post body (Markdown)"
              data-testid="post-body-input"
            />
          ) : (
            <div className="blog-prose max-w-none px-6 py-5" dangerouslySetInnerHTML={{ __html: preview || "<p><em>Nothing to preview yet.</em></p>" }} />
          )}
        </Card>

        <Card>
          <CardHeader title="FAQ block" description="Question / answer pairs shown at the end of the post (and as FAQ rich results)." action={<Button size="sm" variant="secondary" onClick={() => set("faqs", [...p.faqs, { q: "", a: "" }])}><Plus className="h-3.5 w-3.5" /> Add question</Button>} />
          <div className="space-y-4 p-5">
            {p.faqs.length === 0 && <p className="text-[13px] text-ink-500">No questions yet.</p>}
            {p.faqs.map((f, i) => (
              <div key={i} className="relative rounded-xl border border-line p-4">
                <button type="button" onClick={() => set("faqs", p.faqs.filter((_, j) => j !== i))} className="absolute right-2 top-2 rounded-md p-1 text-ink-400 hover:bg-surface-2 hover:text-ink-700" aria-label="Remove question">
                  <X className="h-4 w-4" />
                </button>
                <TextField label={`Question ${i + 1}`} value={f.q} onChange={(v) => set("faqs", p.faqs.map((x, j) => (j === i ? { ...x, q: v } : x)))} />
                <TextArea className="mt-3" label="Answer" rows={3} value={f.a} onChange={(v) => set("faqs", p.faqs.map((x, j) => (j === i ? { ...x, a: v } : x)))} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13.5px] font-semibold text-ink-900">Publishing</p>
            {p.id && live && (
              <Link href={`/blog/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-jade-700 hover:underline">
                View live <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <SelectField label="Status" value={p.status} onChange={(v) => set("status", v as EditorPost["status"])} options={[{ value: "draft", label: "Draft" }, { value: "scheduled", label: "Scheduled" }, { value: "published", label: "Published" }]} />
          <label className="block text-[13px] text-ink-600">
            <span className="field-label">Publish date</span>
            <input type="datetime-local" value={toLocalInput(p.publish_at)} onChange={(e) => set("publish_at", e.target.value ? fromLocalInput(e.target.value) : null)} className="field-input" />
            <span className="mt-1 block text-xs text-ink-400">{p.status === "scheduled" ? "Goes live automatically at this time (IST)." : "Leave empty to use the time you publish."}</span>
          </label>
          {p.updated_at && <p className="text-[12px] text-ink-400">Last updated {new Date(p.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p>}
          <Switch checked={p.featured} onChange={(v) => set("featured", v)} label="Featured" description="Shown large at the top of /blog" />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="secondary" onClick={() => save("draft")} loading={saving} data-testid="save-draft">
              Save draft
            </Button>
            {p.status === "scheduled" ? (
              <Button onClick={() => save("scheduled")} loading={saving}>
                Schedule
              </Button>
            ) : (
              <Button onClick={() => save("published")} loading={saving} data-testid="publish">
                {p.status === "published" && p.id ? "Update" : "Publish"}
              </Button>
            )}
            {p.id && (
              <Button variant="ghost" onClick={remove} aria-label="Delete post">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-5" id="seo-checklist">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13.5px] font-semibold text-ink-900">SEO checklist</p>
            <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-semibold tabular", allGreen(checks) ? "bg-emerald-100 text-emerald-800" : "bg-surface-2 text-ink-600")} data-testid="seo-score">
              {passed}/{checks.length}
            </span>
          </div>
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-[13px]">
                {c.status === "pass" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Pass" /> : c.status === "warn" ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="Warning" /> : <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-label="Fail" />}
                <span>
                  <span className="text-ink-800">{c.label}</span>
                  {c.hint && <span className="block text-[12px] text-ink-500">{c.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-4 p-5">
          <p className="text-[13.5px] font-semibold text-ink-900">Search & sharing</p>
          <TextField label="Focus keyword" value={p.focus_keyword} onChange={(v) => set("focus_keyword", v)} placeholder="e.g. jobs in Bangalore" />
          <TextField label="SEO title" value={p.seo_title} onChange={(v) => set("seo_title", v)} maxLength={SEO_TITLE_MAX + 20} hint={`${(p.seo_title || p.title).length}/${SEO_TITLE_MAX} — defaults to the title`} />
          <TextArea label="Meta description" value={p.meta_description} onChange={(v) => set("meta_description", v)} rows={3} hint={`${p.meta_description.length}/${META_MAX}`} />
          <TextField label="Canonical URL" value={p.canonical_url} onChange={(v) => set("canonical_url", v)} placeholder="Leave empty (this post's own URL)" />
          <TextField label="OG image URL" value={p.og_image_url} onChange={(v) => set("og_image_url", v)} placeholder="Leave empty to auto-generate" />
          <div className="rounded-xl border border-line p-3">
            <p className="truncate text-[15px] text-[#1a0dab] dark:text-sky-300">{(p.seo_title || p.title || "Post title").slice(0, 70)}</p>
            <p className="truncate text-[12.5px] text-emerald-700">{siteHost}/blog/{p.slug || "slug"}</p>
            <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-600">{p.meta_description || p.excerpt || "Meta description…"}</p>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <p className="text-[13.5px] font-semibold text-ink-900">Details</p>
          <SelectField label="Author" value={p.author_name} onChange={(v) => set("author_name", v)} options={authors} placeholder="Choose a team member" />
          <ChipInput label="Categories" value={p.categories} onChange={(v) => set("categories", v)} suggestions={categories} placeholder="e.g. Job search" />
          <ChipInput label="Tags" value={p.tags} onChange={(v) => set("tags", v)} suggestions={tags} placeholder="e.g. bangalore" />
        </Card>

        <Card className="space-y-3 p-5">
          <p className="text-[13.5px] font-semibold text-ink-900">Cover image</p>
          {p.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.cover_url} alt={p.cover_alt} className="aspect-[16/9] w-full rounded-lg border border-line object-cover" />
          )}
          <TextField label="Image URL" value={p.cover_url} onChange={(v) => set("cover_url", v)} placeholder="/blog/cover.jpg or https://…" />
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-jade-700 hover:underline">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Upload an image
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { const u = await upload(f, p.cover_alt); if (u) set("cover_url", u); } }} />
          </label>
          <TextField label="Alt text" value={p.cover_alt} onChange={(v) => set("cover_alt", v)} placeholder="Describe the image" />
        </Card>
      </div>
    </div>
  );
}
