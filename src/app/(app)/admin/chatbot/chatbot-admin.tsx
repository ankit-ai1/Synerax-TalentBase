"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState } from "@/components/ui/misc";
import { Switch, TextArea, TextField } from "@/components/ui/fields";
import { cn, friendlyError, timeAgo } from "@/lib/utils";

type Audience = "visitor" | "candidate" | "client";
type Faq = { id: string; question: string; answer: string; audience: string[]; keywords: string[]; is_active: boolean; updated_at: string };
type Unanswered = { id: string; question: string; audience: string; created_at: string };
const AUD: { id: Audience; label: string }[] = [
  { id: "visitor", label: "Website visitors" },
  { id: "candidate", label: "Candidates" },
  { id: "client", label: "Clients" },
];

export function ChatbotAdmin({
  hrCanChat,
  faqs,
  builtIn,
  unanswered,
}: {
  hrCanChat: boolean;
  faqs: Faq[];
  builtIn: { id: string; question: string; answer: string; audience: string[] }[];
  unanswered: Unanswered[];
}) {
  const router = useRouter();
  const [hr, setHr] = useState(hrCanChat);
  const [editing, setEditing] = useState<Partial<Faq> | null>(null);
  const [saving, setSaving] = useState(false);
  const [showBuiltIn, setShowBuiltIn] = useState(false);

  const toggleHr = async (v: boolean) => {
    setHr(v);
    const { error } = await createClient().from("chat_settings").update({ hr_can_chat_candidates: v, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) {
      setHr(!v);
      return toast.error(friendlyError(error.message));
    }
    toast.success(v ? "HR can now chat with candidates" : "Only admins can chat with candidates");
  };

  const saveFaq = async () => {
    if (!editing) return;
    const q = (editing.question ?? "").trim();
    const a = (editing.answer ?? "").trim();
    if (q.length < 5 || a.length < 2) return toast.error("Add a question and an answer");
    if (!(editing.audience ?? []).length) return toast.error("Choose who can see it");
    setSaving(true);
    const row = {
      question: q.slice(0, 300),
      answer: a.slice(0, 3000),
      audience: editing.audience,
      keywords: (editing.keywords ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 20),
      is_active: editing.is_active ?? true,
      updated_at: new Date().toISOString(),
    };
    const sb = createClient();
    const { error } = editing.id ? await sb.from("bot_faqs").update(row).eq("id", editing.id) : await sb.from("bot_faqs").insert(row);
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message));
    // the question that prompted this FAQ is answered now
    if ((editing as { fromUnanswered?: string }).fromUnanswered) await sb.from("bot_unanswered").update({ status: "answered" }).eq("id", (editing as { fromUnanswered?: string }).fromUnanswered!);
    toast.success("Saved — the chatbot uses it right away");
    setEditing(null);
    router.refresh();
  };

  const removeFaq = async (id: string) => {
    const { error } = await createClient().from("bot_faqs").delete().eq("id", id);
    if (error) return toast.error(friendlyError(error.message));
    router.refresh();
  };

  const dismiss = async (id: string) => {
    const { error } = await createClient().from("bot_unanswered").update({ status: "dismissed" }).eq("id", id);
    if (error) return toast.error(friendlyError(error.message));
    router.refresh();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Chat permissions" description="Clients can always message Synerax. Only staff can start a chat with a candidate." />
          <div className="p-5">
            <Switch checked={hr} onChange={toggleHr} label="HR can chat with candidates" description="Off: only admins can message candidates (HR can still read those chats). On: HR can start and reply too." />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Chatbot questions & answers"
            description="Added here = live immediately. The bot also knows the built-in answers from src/data/bot-faq.ts."
            action={
              <Button size="sm" onClick={() => setEditing({ audience: ["visitor", "candidate", "client"], keywords: [], is_active: true })}>
                <Plus className="h-3.5 w-3.5" /> Add Q&A
              </Button>
            }
          />
          <div className="space-y-3 p-5">
            {editing && (
              <div className="space-y-3 rounded-xl border border-jade/30 bg-jade-50/40 p-4">
                <TextField label="Question" value={editing.question ?? ""} onChange={(v) => setEditing({ ...editing, question: v })} placeholder="e.g. Do you hire freshers?" maxLength={300} />
                <TextArea label="Answer" value={editing.answer ?? ""} onChange={(v) => setEditing({ ...editing, answer: v })} rows={3} maxLength={3000} />
                <TextField label="Other words people might type (comma separated)" value={(editing.keywords ?? []).join(", ")} onChange={(v) => setEditing({ ...editing, keywords: v.split(",") })} placeholder="freshers, graduates, no experience" />
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-ink-700">Show to</p>
                  <div className="flex flex-wrap gap-2">
                    {AUD.map((a) => {
                      const on = (editing.audience ?? []).includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setEditing({ ...editing, audience: on ? (editing.audience ?? []).filter((x) => x !== a.id) : [...(editing.audience ?? []), a.id] })}
                          className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12.5px] font-medium", on ? "border-jade bg-jade text-white" : "border-line bg-surface text-ink-600")}
                        >
                          {on && <Check className="h-3 w-3" />} {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Switch checked={editing.is_active ?? true} onChange={(v) => setEditing({ ...editing, is_active: v })} label="Active" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveFaq} loading={saving}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {faqs.length === 0 && !editing ? (
              <EmptyState compact icon={<Bot className="h-5 w-5" />} title="No custom answers yet" description="Add Q&A here, or turn an unanswered question into one." />
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {faqs.map((f) => (
                  <li key={f.id} className="flex gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium text-ink-900">
                        {f.question} {!f.is_active && <span className="ml-1 rounded bg-surface-3 px-1.5 text-[11px] text-ink-500">Off</span>}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-500">{f.answer}</p>
                      <p className="mt-1 text-[11.5px] text-ink-400">{f.audience.join(" · ")}</p>
                    </div>
                    <button onClick={() => setEditing(f)} className="self-start rounded p-1.5 text-ink-400 hover:bg-surface-3 hover:text-ink-800" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => removeFaq(f.id)} className="self-start rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => setShowBuiltIn((s) => !s)} className="text-[12.5px] font-medium text-jade-700 hover:underline">
              {showBuiltIn ? "Hide" : "Show"} {builtIn.length} built-in answers
            </button>
            {showBuiltIn && (
              <ul className="divide-y divide-line rounded-xl border border-dashed border-line">
                {builtIn.map((f) => (
                  <li key={f.id} className="p-3">
                    <p className="text-[13px] font-medium text-ink-800">{f.question}</p>
                    <p className="mt-0.5 text-[12px] text-ink-500">{f.answer}</p>
                    <p className="mt-1 text-[11px] text-ink-400">{f.audience.join(" · ")} · edit in src/data/bot-faq.ts</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="self-start">
        <CardHeader title="Questions the bot couldn't answer" description={`${unanswered.length} open · turn them into answers`} />
        {unanswered.length === 0 ? (
          <EmptyState compact title="Nothing here" description="Unanswered questions show up here." />
        ) : (
          <ul className="divide-y divide-line">
            {unanswered.map((u) => (
              <li key={u.id} className="px-5 py-3">
                <p className="text-[13.5px] text-ink-900">“{u.question}”</p>
                <p className="mt-0.5 text-[11.5px] text-ink-400">
                  {u.audience} · {timeAgo(u.created_at)}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setEditing({ question: u.question, answer: "", audience: u.audience === "hr" || u.audience === "admin" ? ["visitor", "candidate", "client"] : [u.audience], keywords: [], is_active: true, ...({ fromUnanswered: u.id } as object) })}
                    className="inline-flex items-center gap-1 rounded-md bg-jade-50 px-2 py-1 text-[12px] font-semibold text-jade-700 hover:bg-jade-100"
                  >
                    <Plus className="h-3 w-3" /> Add answer
                  </button>
                  <button onClick={() => dismiss(u.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-ink-500 hover:bg-surface-3">
                    <X className="h-3 w-3" /> Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
