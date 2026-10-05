"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { ChipInput, TextField } from "@/components/ui/fields";
import { Card } from "@/components/ui/misc";
import { cn, friendlyError } from "@/lib/utils";
import type { JobRole, Skill } from "@/lib/types";

type Tab = "skills" | "roles";
type Editing = { kind: Tab; id?: string; name: string; group: string; aliases: string[] };

export function MastersManager({
  skills,
  roles,
  skillUse,
  roleUse,
}: {
  skills: Skill[];
  roles: JobRole[];
  skillUse: Record<string, number>;
  roleUse: Record<string, number>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("skills");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<{ kind: Tab; id: string; name: string; used: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list =
      tab === "skills"
        ? skills.map((x) => ({ id: x.id, name: x.name, group: x.category, aliases: x.aliases, used: skillUse[x.id] ?? 0 }))
        : roles.map((x) => ({ id: x.id, name: x.name, group: x.department, aliases: [] as string[], used: roleUse[x.id] ?? 0 }));
    return list.filter((r) => !s || r.name.toLowerCase().includes(s) || r.group.toLowerCase().includes(s) || r.aliases.some((a) => a.toLowerCase().includes(s)));
  }, [tab, q, skills, roles, skillUse, roleUse]);

  const groups = useMemo(
    () => Array.from(new Set((tab === "skills" ? skills.map((s) => s.category) : roles.map((r) => r.department)).filter(Boolean))).sort(),
    [tab, skills, roles]
  );

  async function save() {
    if (!editing || !editing.name.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const table = editing.kind === "skills" ? "skills" : "job_roles";
    const row: Record<string, unknown> =
      editing.kind === "skills"
        ? { name: editing.name.trim(), category: editing.group.trim() || "Other", aliases: editing.aliases.map((a) => a.toLowerCase()) }
        : { name: editing.name.trim(), department: editing.group.trim() || "Other" };
    const { error } = editing.id ? await supabase.from(table).update(row).eq("id", editing.id) : await supabase.from(table).insert(row);
    setBusy(false);
    if (error) {
      return toast.error(error.message.includes("duplicate") ? "This name already exists" : friendlyError(error.message));
    }
    toast.success(editing.id ? "Updated" : "Added");
    setEditing(null);
    router.refresh();
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const { error } = await createClient()
      .from(deleting.kind === "skills" ? "skills" : "job_roles")
      .delete()
      .eq("id", deleting.id);
    setBusy(false);
    setDeleting(null);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(`"${deleting.name}" deleted`);
    router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg bg-surface p-1 shadow-card" role="tablist">
          {(["skills", "roles"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("rounded-md px-4 py-1.5 text-sm font-medium", tab === t ? "bg-ink-900 text-surface" : "text-ink-500 hover:text-ink-800")}
            >
              {t === "skills" ? `Skills (${skills.length})` : `Job roles (${roles.length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="field-input w-56 pl-9" aria-label="Search" />
          </div>
          <Button onClick={() => setEditing({ kind: tab, name: "", group: "", aliases: [] })}>
            <Plus className="h-4 w-4" /> Add {tab === "skills" ? "skill" : "role"}
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-400">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">{tab === "skills" ? "Category" : "Department"}</th>
                {tab === "skills" && <th className="px-3 py-3 font-medium">Aliases</th>}
                <th className="px-3 py-3 text-right font-medium">Candidates</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="group">
                  <td className="px-5 py-2.5 font-medium text-ink-800">{r.name}</td>
                  <td className="px-3 py-2.5 text-ink-500">{r.group}</td>
                  {tab === "skills" && <td className="px-3 py-2.5 text-xs text-ink-400">{r.aliases.join(", ")}</td>}
                  <td className="px-3 py-2.5 text-right tabular text-ink-700">{r.used}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
                      <button
                        onClick={() => setEditing({ kind: tab, id: r.id, name: r.name, group: r.group, aliases: r.aliases })}
                        className="rounded-md p-1.5 text-ink-400 hover:bg-canvas hover:text-ink-800"
                        aria-label={`Edit ${r.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting({ kind: tab, id: r.id, name: r.name, used: r.used })}
                        className="rounded-md p-1.5 text-ink-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600"
                        aria-label={`Delete ${r.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit" : editing?.kind === "skills" ? "New skill" : "New role"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy} disabled={!editing?.name.trim()}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <TextField label="Name" required value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <div>
              <TextField
                label={editing.kind === "skills" ? "Category" : "Department"}
                value={editing.group}
                onChange={(v) => setEditing({ ...editing, group: v })}
                list="group-list"
              />
              <datalist id="group-list">
                {groups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            {editing.kind === "skills" && (
              <ChipInput
                label="Aliases (other names / spellings)"
                value={editing.aliases}
                onChange={(v) => setEditing({ ...editing, aliases: v })}
                hint="For example, for React: reactjs, react.js"
              />
            )}
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        danger
        title={`Delete "${deleting?.name}"?`}
        description={
          deleting?.used
            ? `This is used on ${deleting.used} candidate profiles — it will be removed from all of them. If it's a spelling issue, edit it and add an alias instead of deleting.`
            : "Not used by any candidate. Safe to delete."
        }
        confirmLabel="Delete"
      />
    </>
  );
}
