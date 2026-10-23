"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/misc";
import { Switch, TextArea, TextField } from "@/components/ui/fields";
import { cn, friendlyError } from "@/lib/utils";

type Faq = { q: string; a: string };
export type SeoRow = { slug: string; kind: string; h1: string; jobs: number; enabled: boolean; intro: string; faqs: Faq[]; defaultIntro: string; defaultFaqs: Faq[] };

const KINDS = [
  { key: "", label: "All" },
  { key: "city", label: "Cities" },
  { key: "mode", label: "Work mode" },
  { key: "country", label: "Countries" },
  { key: "combo", label: "Combinations" },
  { key: "skill", label: "Skills" },
  { key: "role", label: "Roles" },
];

export function SeoPagesTable({ rows }: { rows: SeoRow[] }) {
  const router = useRouter();
  const [kind, setKind] = useState("");
  const [withJobs, setWithJobs] = useState(false);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<SeoRow | null>(null);
  const [saving, setSaving] = useState(false);
  const list = rows.filter((r) => (!kind || r.kind === kind) && (!withJobs || r.jobs > 0) && (!q || `${r.slug} ${r.h1}`.toLowerCase().includes(q.toLowerCase())));

  async function persist(r: SeoRow, patch: Partial<SeoRow>) {
    const next = { ...r, ...patch };
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const faqs = next.faqs.filter((f) => f.q.trim() && f.a.trim());
    const { error } = await sb.from("seo_pages").upsert({ slug: r.slug, enabled: next.enabled, intro: next.intro.trim() || null, faqs: faqs.length ? faqs : null, updated_by: user?.id ?? null, updated_at: new Date().toISOString() });
    if (error) {
      toast.error(friendlyError(error.message));
      return false;
    }
    await fetch("/api/blog/revalidate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ landing: r.slug }) }).catch(() => null);
    router.refresh();
    return true;
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <button key={k.key} onClick={() => setKind(k.key)} className={cn("rounded-full px-3 py-1.5 text-[13px] font-medium", kind === k.key ? "bg-ink-900 text-surface" : "text-ink-600 hover:bg-surface-2")}>
            {k.label}
          </button>
        ))}
        <label className="ml-2 inline-flex items-center gap-1.5 text-[13px] text-ink-600">
          <input type="checkbox" checked={withJobs} onChange={(e) => setWithJobs(e.target.checked)} /> Only pages with jobs
        </label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages" className="field-input ml-auto h-8 w-48 text-[13px]" aria-label="Search pages" />
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13.5px]" data-testid="seo-pages">
            <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
              <tr className="border-b border-line">
                <th className="px-5 py-2.5 font-medium">Page</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 text-right font-medium">Live jobs</th>
                <th className="px-3 py-2.5 font-medium">In Google</th>
                <th className="px-3 py-2.5 font-medium">On</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((r) => (
                <tr key={r.slug} className={cn(!r.enabled && "opacity-60")}>
                  <td className="px-5 py-2.5">
                    <span className="font-medium text-ink-900">{r.h1}</span>
                    {(r.intro || r.faqs.length > 0) && <span className="ml-2 rounded-full bg-jade-50 px-1.5 text-[11px] font-semibold text-jade-700">Custom</span>}
                    <span className="block text-[12px] text-ink-400">/jobs/{r.slug}</span>
                  </td>
                  <td className="px-3 py-2.5 capitalize text-ink-600">{r.kind}</td>
                  <td className="px-3 py-2.5 text-right tabular">{r.jobs}</td>
                  <td className="px-3 py-2.5 text-[12.5px]">{!r.enabled ? <span className="text-ink-400">Off (404)</span> : r.jobs ? <span className="font-medium text-emerald-700">Indexed</span> : <span className="text-amber-700">noindex (0 jobs)</span>}</td>
                  <td className="px-3 py-2.5">
                    <Switch checked={r.enabled} onChange={async (v) => (await persist(r, { enabled: v })) && toast.success(v ? "Page switched on" : "Page switched off")} label="" />
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-right">
                    <a href={`/jobs/${r.slug}`} target="_blank" rel="noopener noreferrer" className="mr-1 inline-flex rounded-md p-1.5 text-ink-500 hover:bg-surface-2" aria-label={`Open /jobs/${r.slug}`}>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button onClick={() => setEdit({ ...r, faqs: r.faqs.length ? r.faqs : [] })} className="inline-flex rounded-md p-1.5 text-ink-500 hover:bg-surface-2" aria-label={`Edit ${r.h1}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {edit && (
        <Dialog
          open
          onClose={() => setEdit(null)}
          size="lg"
          title={`Edit ${edit.h1}`}
          description="Leave the intro or FAQ empty to use the default text."
          footer={
            <>
              <Button variant="ghost" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button
                loading={saving}
                onClick={async () => {
                  setSaving(true);
                  const r = rows.find((x) => x.slug === edit.slug)!;
                  const ok = await persist(r, { intro: edit.intro, faqs: edit.faqs, enabled: edit.enabled });
                  setSaving(false);
                  if (ok) {
                    toast.success("Saved");
                    setEdit(null);
                  }
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Switch checked={edit.enabled} onChange={(v) => setEdit({ ...edit, enabled: v })} label="Page is on" description="Off = the page returns 404 and leaves the sitemap" />
            <TextArea label="Intro paragraph" rows={4} value={edit.intro} onChange={(v) => setEdit({ ...edit, intro: v })} placeholder={edit.defaultIntro} hint="Unique, helpful text about these jobs — no keyword stuffing." />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="field-label mb-0">FAQ {edit.faqs.length === 0 && <span className="font-normal text-ink-400">(using the {edit.defaultFaqs.length} default questions)</span>}</p>
                <div className="flex gap-2">
                  {edit.faqs.length === 0 && (
                    <Button size="xs" variant="ghost" onClick={() => setEdit({ ...edit, faqs: edit.defaultFaqs.map((f) => ({ ...f })) })}>
                      Start from defaults
                    </Button>
                  )}
                  <Button size="xs" variant="secondary" onClick={() => setEdit({ ...edit, faqs: [...edit.faqs, { q: "", a: "" }] })}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {edit.faqs.map((f, i) => (
                  <div key={i} className="relative rounded-xl border border-line p-3">
                    <button type="button" onClick={() => setEdit({ ...edit, faqs: edit.faqs.filter((_, j) => j !== i) })} className="absolute right-2 top-2 rounded p-1 text-ink-400 hover:bg-surface-2" aria-label="Remove question">
                      <X className="h-4 w-4" />
                    </button>
                    <TextField label="Question" value={f.q} onChange={(v) => setEdit({ ...edit, faqs: edit.faqs.map((x, j) => (j === i ? { ...x, q: v } : x)) })} />
                    <TextArea className="mt-2" label="Answer" rows={2} value={f.a} onChange={(v) => setEdit({ ...edit, faqs: edit.faqs.map((x, j) => (j === i ? { ...x, a: v } : x)) })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
