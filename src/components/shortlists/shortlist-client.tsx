"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Download, MessageCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { TextArea, TextField } from "@/components/ui/fields";
import { Avatar, Card, EmptyState, StatusBadge } from "@/components/ui/misc";
import { Checkbox } from "@/components/ui/interactive";
import { useDialogs } from "@/components/dialogs/provider";
import { AsyncPicker, searchCandidates } from "@/components/pickers";
import { cn, friendlyError, lpa, noticeLabel, timeAgo, years } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function NewShortlistButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New shortlist
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="New shortlist"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={busy}
              disabled={!name.trim()}
              onClick={async () => {
                setBusy(true);
                const supabase = createClient();
                const { data: me } = await supabase.auth.getUser();
                const { data, error } = await supabase.from("shortlists").insert({ name: name.trim(), description: desc.trim() || null, created_by: me.user?.id }).select("id").single();
                setBusy(false);
                if (error || !data) return toast.error(friendlyError(error?.message));
                router.push(`/shortlists/${data.id}`);
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextField label="Name" value={name} onChange={setName} placeholder="e.g. Acme — Java submissions" autoFocus />
          <TextArea label="Description" rows={2} value={desc} onChange={setDesc} />
        </div>
      </Dialog>
    </>
  );
}

export function ShortlistDetail({ list, members, isAdmin }: { list: any; members: any[]; isAdmin: boolean }) {
  const router = useRouter();
  const d = useDialogs();
  const [sel, setSel] = useState<string[]>([]);
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(list.name);
  const [desc, setDesc] = useState(list.description ?? "");
  const [del, setDel] = useState(false);

  const ids = sel.length ? sel : members.map((m) => m.candidate.id);
  const cands = members.filter((m) => ids.includes(m.candidate.id)).map((m) => m.candidate);

  async function removeMember(id: string) {
    const { error } = await createClient().from("shortlist_candidates").delete().eq("shortlist_id", list.id).eq("candidate_id", id);
    if (error) return toast.error(friendlyError(error.message));
    router.refresh();
  }
  async function addMember(id: string) {
    const { error } = await createClient().rpc("bulk_candidates", { p_ids: [id], p_action: "shortlist", p_value: list.id });
    if (error) return toast.error(friendlyError(error.message));
    router.refresh();
  }
  async function saveNote(id: string, note: string) {
    await createClient().from("shortlist_candidates").update({ note: note || null }).eq("shortlist_id", list.id).eq("candidate_id", id);
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink-900">{list.name}</h1>
            <button onClick={() => setEdit(true)} className="rounded-md p-1 text-ink-400 hover:bg-surface-3 hover:text-ink-800" aria-label="Rename">
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-500">{list.description || `${members.length} candidates`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => d.openAddToJob(ids, () => setSel([]))} disabled={!ids.length}>
            <Briefcase className="h-4 w-4" /> Add {sel.length ? `${sel.length}` : "all"} to a job
          </Button>
          <Button variant="secondary" onClick={() => d.openMessage({ candidates: cands })} disabled={!ids.length}>
            <MessageCircle className="h-4 w-4" /> Message
          </Button>
          {isAdmin && ids.length > 0 && (
            <a href={`/api/export?ids=${ids.join(",")}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-sm font-medium text-ink-800 shadow-card hover:bg-surface-2">
              <Download className="h-4 w-4" /> Export
            </a>
          )}
          <Button variant="secondary" size="icon" onClick={() => setDel(true)} aria-label="Delete shortlist">
            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
          </Button>
        </div>
      </div>

      <div className="mb-4 max-w-md">
        <AsyncPicker value={null} onChange={(v) => v && addMember(v.id)} search={searchCandidates} placeholder="+ Add candidate" />
      </div>

      {members.length === 0 ? (
        <Card>
          <EmptyState title="This shortlist is empty" description="Search for candidates above to add them." />
        </Card>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {members.map((m) => {
            const c = m.candidate;
            const nm = `${c.first_name} ${c.last_name ?? ""}`.trim();
            const on = sel.includes(c.id);
            return (
              <div key={c.id} className={cn("group flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center", on && "bg-jade-50/50")}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Checkbox checked={on} onChange={(v) => setSel((s) => (v ? [...s, c.id] : s.filter((x) => x !== c.id)))} label={`${nm} select`} />
                  <Avatar name={nm} size="sm" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <Link href={`/candidates/${c.id}`} className="truncate font-medium text-ink-900 hover:text-jade-700">
                        {nm}
                      </Link>
                      <StatusBadge status={c.status} />
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {[c.current_designation, years(c.total_experience), `${lpa(c.current_ctc)} → ${lpa(c.expected_ctc)}`, noticeLabel(c.notice_period_days), c.current_city].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <input
                  defaultValue={m.note ?? ""}
                  onBlur={(e) => saveNote(c.id, e.target.value)}
                  placeholder="Note (e.g. sent to client on 12 Oct)"
                  className="field-input h-8 text-xs md:w-64"
                  aria-label="Note"
                />
                <div className="flex items-center gap-2 text-xs text-ink-400">
                  <span className="whitespace-nowrap">added {timeAgo(m.added_at)}</span>
                  <button onClick={() => removeMember(c.id)} className="rounded p-1 text-ink-300 hover:text-red-600" aria-label="Remove from shortlist">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <Dialog
        open={edit}
        onClose={() => setEdit(false)}
        size="sm"
        title="Edit shortlist"
        footer={
          <Button
            onClick={async () => {
              await createClient().from("shortlists").update({ name: name.trim() || list.name, description: desc.trim() || null }).eq("id", list.id);
              setEdit(false);
              router.refresh();
            }}
          >
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          <TextField label="Name" value={name} onChange={setName} />
          <TextArea label="Description" rows={2} value={desc} onChange={setDesc} />
        </div>
      </Dialog>
      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        danger
        title="Delete shortlist?"
        description="Only the list is removed — candidate profiles stay safe."
        confirmLabel="Delete"
        onConfirm={async () => {
          await createClient().from("shortlists").delete().eq("id", list.id);
          router.push("/shortlists");
          router.refresh();
        }}
      />
    </>
  );
}
