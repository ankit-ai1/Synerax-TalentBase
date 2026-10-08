"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Building2, FileText, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/fields";
import { cn, formatDate, formatDateTime, friendlyError, timeAgo } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = { id: string; file_name: string; doc_type: string; created_at: string };

/** Share one or many pipeline profiles with the job's client */
export function ShareDialog({
  open,
  onClose,
  apps,
  clientName,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  apps: any[];
  clientName: string | null;
  onDone: () => void;
}) {
  const single = apps.length === 1 ? apps[0] : null;
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [cv, setCv] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote(single?.share_note ?? "");
    setDocs(null);
    setCv(single?.client_cv_document_id ?? "");
    if (!single) return;
    createClient()
      .from("candidate_documents")
      .select("id, file_name, doc_type, created_at")
      .eq("candidate_id", single.candidate.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []) as Doc[];
        // CV-like documents first
        list.sort((a, b) => Number(b.doc_type === "Resume") - Number(a.doc_type === "Resume"));
        setDocs(list);
        setCv((prev) => prev || list.find((d) => d.doc_type === "Resume")?.id || list[0]?.id || "");
      });
  }, [open, single]);

  async function submit() {
    if (single && !cv) return toast.error("Upload a CV to this candidate's profile first.");
    setBusy(true);
    const res = await fetch("/api/applications/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: apps.map((a) => a.id), cv_doc: single ? cv : null, note }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(friendlyError(out.error ?? "Could not share"));
    toast.success(`${out.count} profile${out.count === 1 ? "" : "s"} shared with ${clientName ?? "the client"}`);
    onDone();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={single ? `Share ${single.candidate.first_name} with the client` : `Share ${apps.length} profiles with the client`}
      description={clientName ? `They’ll appear in ${clientName}’s portal for approval.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            <Send className="h-4 w-4" /> Share
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!clientName && <p className="rounded-lg bg-saffron-50 px-3 py-2 text-[13px] text-saffron-800">This job isn’t linked to a client, so profiles can’t be shared.</p>}
        {single ? (
          <div>
            <p className="field-label">Client-ready CV</p>
            {docs === null ? (
              <p className="flex items-center gap-2 py-3 text-sm text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
              </p>
            ) : docs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-sm text-ink-500">No documents on this profile. Upload a CV first.</p>
            ) : (
              <div className="space-y-1.5">
                {docs.map((d) => (
                  <label
                    key={d.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                      cv === d.id ? "border-jade bg-jade-50/60 ring-1 ring-jade/30" : "border-line hover:border-line-strong"
                    )}
                  >
                    <input type="radio" name="cv" checked={cv === d.id} onChange={() => setCv(d.id)} className="accent-[rgb(var(--jade))]" />
                    <FileText className="h-4 w-4 shrink-0 text-ink-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink-800">{d.file_name}</span>
                      <span className="block text-xs text-ink-400">
                        {d.doc_type} · {formatDate(d.created_at)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-xs text-ink-400">Only this file is visible to the client — never contact details on the profile itself.</p>
          </div>
        ) : (
          <p className="text-sm text-ink-600">Each candidate’s latest CV (Resume) will be shared. Profiles without a CV will stop the share — fix those first.</p>
        )}
        <TextArea label="Note for the client (optional)" value={note} onChange={setNote} rows={3} placeholder="e.g. Strong in React, can join in 15 days" />
        <p className="text-xs text-ink-400">Profiles in Applied / Sourced / Screening move to Submitted. The client gets one email for this share.</p>
      </div>
    </Dialog>
  );
}

/** Conversation with the client about one shared profile */
export function CommentsDialog({ open, onClose, app, onPosted }: { open: boolean; onClose: () => void; app: any | null; onPosted?: () => void }) {
  const [list, setList] = useState<any[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !app) return;
    setList(null);
    fetch(`/api/applications/${app.id}/comments`)
      .then((r) => r.json())
      .then((d) => setList(d.comments ?? []))
      .catch(() => setList([]));
  }, [open, app]);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [list]);

  async function send() {
    if (!body.trim() || !app) return;
    setBusy(true);
    const res = await fetch(`/api/applications/${app.id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(friendlyError(out.error ?? "Could not send"));
    setList((l) => [...(l ?? []), out.comment]);
    setBody("");
    onPosted?.();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={app ? `Client conversation — ${app.candidate.first_name} ${app.candidate.last_name ?? ""}`.trim() : "Conversation"}
      description="Visible to the client in their portal."
    >
      <div className="flex max-h-[50vh] min-h-[160px] flex-col gap-3 overflow-y-auto pb-2">
        {list === null ? (
          <p className="flex items-center gap-2 text-sm text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">No messages yet.</p>
        ) : (
          list.map((c) => {
            const staff = c.author_role === "staff";
            return (
              <div key={c.id} className={cn("flex max-w-[85%] flex-col", staff ? "self-end items-end" : "self-start")}>
                <div className={cn("whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm", staff ? "rounded-br-md bg-jade text-white" : "rounded-bl-md bg-surface-3 text-ink-800")}>{c.body}</div>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-400" title={formatDateTime(c.created_at)}>
                  {!staff && <Building2 className="h-3 w-3" />}
                  {staff ? (c.author?.full_name ?? "Synerax") : (c.author?.full_name ?? "Client")} · {timeAgo(c.created_at)}
                </p>
              </div>
            );
          })
        )}
        <div ref={end} />
      </div>
      <div className="mt-3 flex items-end gap-2 border-t border-line pt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
          rows={2}
          placeholder="Reply to the client… (Ctrl+Enter to send)"
          className="field-input h-auto flex-1 py-2"
          aria-label="Message"
        />
        <Button onClick={send} loading={busy} disabled={!body.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Dialog>
  );
}
