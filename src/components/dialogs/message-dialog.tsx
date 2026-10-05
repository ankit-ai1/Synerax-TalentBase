"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/interactive";
import { cn, fillTemplate, waLink } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export type MessagePrefill = {
  candidates: { id: string; first_name: string; last_name?: string | null; phone?: string | null; email?: string | null }[];
  vars?: Record<string, string | null | undefined>;
  channel?: "WhatsApp" | "Email";
};

type Template = { id: string; name: string; channel: string; subject: string | null; body: string };

export function MessageDialog({ prefill, me, onClose }: { prefill: MessagePrefill; me: Profile; onClose: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [channel, setChannel] = useState<"WhatsApp" | "Email">(prefill.channel ?? "WhatsApp");
  const [tplId, setTplId] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [idx, setIdx] = useState(0);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    createClient()
      .from("message_templates")
      .select("id, name, channel, subject, body")
      .order("name")
      .then(({ data }) => setTemplates((data ?? []) as Template[]));
  }, []);

  const list = templates.filter((t) => t.channel === channel);
  const cand = prefill.candidates[idx];
  const vars = useMemo(
    () => ({ first_name: cand?.first_name, last_name: cand?.last_name ?? "", full_name: `${cand?.first_name ?? ""} ${cand?.last_name ?? ""}`.trim(), my_name: me.full_name, ...prefill.vars }),
    [cand, me.full_name, prefill.vars]
  );
  const text = fillTemplate(body, vars);
  const subj = fillTemplate(subject, vars);

  const pick = (t: Template) => {
    setTplId(t.id);
    setBody(t.body);
    setSubject(t.subject ?? "");
  };

  const send = () => {
    if (!cand) return;
    if (channel === "WhatsApp") {
      const url = waLink(cand.phone, text);
      if (!url) return toast.error(`${cand.first_name} has no phone number`);
      window.open(url, "_blank", "noopener");
    } else {
      if (!cand.email) return toast.error(`${cand.first_name} has no email`);
      window.location.href = `mailto:${cand.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(text)}`;
    }
    setSent((s) => new Set(s).add(cand.id));
    if (idx < prefill.candidates.length - 1) setIdx(idx + 1);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Send message"
      description={prefill.candidates.length > 1 ? `${prefill.candidates.length} candidates — must be sent one at a time` : `To ${vars.full_name}`}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(text);
              toast.success("Message copied");
            }}
            disabled={!text}
          >
            <Copy className="h-4 w-4" /> Copy
          </Button>
          <Button onClick={send} disabled={!text}>
            {channel === "WhatsApp" ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {channel === "WhatsApp" ? "Open WhatsApp" : "Open email"}
            {prefill.candidates.length > 1 && ` (${idx + 1}/${prefill.candidates.length})`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented
          value={channel}
          onChange={(v) => {
            setChannel(v);
            setTplId("");
          }}
          options={[
            { value: "WhatsApp", label: "WhatsApp" },
            { value: "Email", label: "Email" },
          ]}
        />
        {list.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {list.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pick(t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  tplId === t.id ? "border-jade bg-jade-50 text-jade-700" : "border-line text-ink-600 hover:border-line-strong"
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
        {channel === "Email" && (
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="field-input" aria-label="Subject" />
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Choose a template or write a message. Placeholders like {{first_name}} are filled in automatically."
          className="field-input h-auto py-2.5 font-mono text-[13px]"
          aria-label="Message"
        />
        {text && (
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <p className="mb-1.5 text-[11.5px] font-medium text-ink-400">Preview — {vars.full_name}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{text}</p>
          </div>
        )}
        {prefill.candidates.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {prefill.candidates.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setIdx(i)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs",
                  i === idx ? "bg-ink-900 text-surface" : sent.has(c.id) ? "bg-jade-50 text-jade-700 line-through" : "bg-surface-3 text-ink-600"
                )}
              >
                {c.first_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
