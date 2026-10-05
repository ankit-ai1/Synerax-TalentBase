"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, Card, EmptyState } from "@/components/ui/misc";
import { friendlyError, timeAgo } from "@/lib/utils";

interface Note {
  id: string;
  content: string;
  created_at: string;
  author_id: string | null;
  author: { full_name: string } | null;
}

export function NotesPanel({
  candidateId,
  notes,
  currentUserId,
  isAdmin,
}: {
  candidateId: string;
  notes: Note[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setSaving(true);
    const { error } = await createClient()
      .from("candidate_notes")
      .insert({ candidate_id: candidateId, content: text.trim(), author_id: currentUserId });
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message));
    setText("");
    router.refresh();
  }

  async function remove(id: string) {
    const { error } = await createClient().from("candidate_notes").delete().eq("id", id);
    if (error) return toast.error(friendlyError(error.message));
    router.refresh();
  }

  return (
    <Card>
      <div className="border-b border-line p-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          rows={3}
          placeholder="Call update, interview feedback, client response…"
          className="field-input h-auto py-2.5"
          aria-label="New note"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-ink-400">Ctrl + Enter also saves</p>
          <Button size="sm" onClick={add} loading={saving} disabled={!text.trim()}>
            Add note
          </Button>
        </div>
      </div>
      {notes.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="No notes yet" description="Log every call and interview update here so the whole team stays informed." />
      ) : (
        <ul className="divide-y divide-line">
          {notes.map((n) => (
            <li key={n.id} className="group flex gap-3 px-5 py-4">
              <Avatar name={n.author?.full_name || "?"} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">
                  <span className="font-medium text-ink-800">{n.author?.full_name ?? "Unknown"}</span>
                  <span className="ml-2 text-ink-400">{timeAgo(n.created_at)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{n.content}</p>
              </div>
              {(n.author_id === currentUserId || isAdmin) && (
                <button
                  onClick={() => remove(n.id)}
                  className="self-start rounded-md p-1.5 text-ink-300 opacity-0 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
