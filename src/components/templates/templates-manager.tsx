"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/fields";
import { Card, EmptyState } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/interactive";
import { fillTemplate, friendlyError } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const VARS = ["first_name", "full_name", "my_name", "job_title", "location", "round", "interview_date", "interview_time", "meeting_link"];
const SAMPLE = {
  first_name: "Rahul",
  full_name: "Rahul Sharma",
  my_name: "Priya (HR)",
  job_title: "Senior Java Developer",
  location: "Pune",
  round: "Technical",
  interview_date: "Thu, 9 Oct",
  interview_time: "3:00 pm",
  meeting_link: "Link: meet.google.com/abc-defg-hij",
};

export function TemplatesManager({ templates }: { templates: any[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<any | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  async function save() {
    if (!edit.name.trim() || !edit.body.trim()) return toast.error("Name and message are both required");
    const supabase = createClient();
    const row = { name: edit.name.trim(), channel: edit.channel, subject: edit.channel === "Email" ? edit.subject || null : null, body: edit.body };
    const { error } = edit.id ? await supabase.from("message_templates").update(row).eq("id", edit.id) : await supabase.from("message_templates").insert(row);
    if (error) return toast.error(friendlyError(error.message));
    toast.success("Template saved");
    setEdit(null);
    router.refresh();
  }

  const insertVar = (v: string) => {
    const el = ta.current;
    const token = `{{${v}}}`;
    if (!el) return setEdit({ ...edit, body: edit.body + token });
    const s = el.selectionStart, e = el.selectionEnd;
    const body = edit.body.slice(0, s) + token + edit.body.slice(e);
    setEdit({ ...edit, body });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = s + token.length;
    });
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEdit({ name: "", channel: "WhatsApp", subject: "", body: "" })}>
          <Plus className="h-4 w-4" /> New template
        </Button>
      </div>
      {templates.length === 0 ? (
        <Card>
          <EmptyState title="No templates" />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="group flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className={t.channel === "WhatsApp" ? "rounded-lg bg-[#25D366]/10 p-2 text-[#1DA851]" : "rounded-lg bg-sky-50 p-2 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300"}>
                  {t.channel === "WhatsApp" ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900">{t.name}</p>
                  <p className="text-xs text-ink-400">{t.channel}{t.subject ? ` · ${t.subject}` : ""}</p>
                </div>
                <div className="flex gap-1 opacity-60 group-hover:opacity-100">
                  <button onClick={() => setEdit({ ...t, subject: t.subject ?? "" })} className="rounded-md p-1.5 text-ink-400 hover:bg-surface-3 hover:text-ink-800" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${t.name}"?`)) return;
                      await createClient().from("message_templates").delete().eq("id", t.id);
                      router.refresh();
                    }}
                    className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-4 flex-1 whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-[13px] leading-relaxed text-ink-700">{fillTemplate(t.body, SAMPLE)}</p>
            </Card>
          ))}
        </div>
      )}

      {edit && (
        <Dialog
          open
          onClose={() => setEdit(null)}
          size="lg"
          title={edit.id ? "Edit template" : "New template"}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <TextField label="Name" value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} />
              <div>
                <span className="field-label">Channel</span>
                <Segmented value={edit.channel} onChange={(v) => setEdit({ ...edit, channel: v })} options={[{ value: "WhatsApp", label: "WhatsApp" }, { value: "Email", label: "Email" }]} />
              </div>
            </div>
            {edit.channel === "Email" && <TextField label="Subject" value={edit.subject} onChange={(v) => setEdit({ ...edit, subject: v })} />}
            <div>
              <span className="field-label">Message</span>
              <textarea ref={ta} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} rows={7} className="field-input h-auto py-2.5 font-mono text-[13px]" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VARS.map((v) => (
                  <button key={v} type="button" onClick={() => insertVar(v)} className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink-600 hover:border-jade hover:text-jade-700">
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
            {edit.body && (
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="mb-1 text-[11.5px] font-medium text-ink-400">Preview</p>
                <p className="whitespace-pre-wrap text-sm text-ink-800">{fillTemplate(edit.body, SAMPLE)}</p>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
