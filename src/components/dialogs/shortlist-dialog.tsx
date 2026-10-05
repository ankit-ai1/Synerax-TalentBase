"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, friendlyError } from "@/lib/utils";

export function ShortlistDialog({ candidateIds, onDone, onClose }: { candidateIds: string[]; onDone?: () => void; onClose: () => void }) {
  const router = useRouter();
  const [lists, setLists] = useState<{ id: string; name: string; count: number }[]>([]);
  const [sel, setSel] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createClient()
      .from("shortlists")
      .select("id, name, shortlist_candidates(count)")
      .order("updated_at", { ascending: false })
      .then(({ data }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setLists((data ?? []).map((l: any) => ({ id: l.id, name: l.name, count: l.shortlist_candidates?.[0]?.count ?? 0 })))
      );
  }, []);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    let id = sel;
    if (!id) {
      if (!newName.trim()) {
        setSaving(false);
        return toast.error("Choose a shortlist or enter a new name");
      }
      const { data: me } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("shortlists").insert({ name: newName.trim(), created_by: me.user?.id }).select("id").single();
      if (error || !data) {
        setSaving(false);
        return toast.error(friendlyError(error?.message));
      }
      id = data.id;
    }
    const { data: n, error } = await supabase.rpc("bulk_candidates", { p_ids: candidateIds, p_action: "shortlist", p_value: id });
    await supabase.from("shortlists").update({ name: sel ? lists.find((l) => l.id === sel)?.name : newName.trim() }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(`${n} candidate(s) added to shortlist`, { action: { label: "Open", onClick: () => router.push(`/shortlists/${id}`) } });
    onDone?.();
    router.refresh();
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Add to shortlist"
      description={`${candidateIds.length} candidate${candidateIds.length > 1 ? "s" : ""} selected`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Add
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {lists.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setSel(l.id);
                setNewName("");
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                sel === l.id ? "border-jade bg-jade-50 ring-1 ring-jade" : "border-line hover:border-line-strong"
              )}
            >
              <Bookmark className={cn("h-4 w-4", sel === l.id ? "fill-jade text-jade" : "text-ink-400")} />
              <span className="flex-1 text-sm font-medium text-ink-900">{l.name}</span>
              <span className="text-xs tabular text-ink-400">{l.count}</span>
            </button>
          ))}
        </div>
        <div className={cn("flex items-center gap-2 rounded-xl border border-dashed px-3 py-1", !sel && newName ? "border-jade" : "border-line-strong")}>
          <Plus className="h-4 w-4 text-ink-400" />
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setSel("");
            }}
            placeholder="New shortlist name (e.g. Acme — React)"
            className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-300 focus-visible:ring-0"
          />
        </div>
      </div>
    </Dialog>
  );
}
