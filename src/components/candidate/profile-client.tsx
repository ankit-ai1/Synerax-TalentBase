"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ChevronDown, Eye, EyeOff, MoreHorizontal, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STATUSES, STATUS_STYLE } from "@/lib/constants";
import { cn, friendlyError, mask } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/dialog";
import { StarInput } from "@/components/ui/interactive";

export function StatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [open, setOpen] = useState(false);
  const s = STATUS_STYLE[value] ?? STATUS_STYLE.New;

  async function change(next: string) {
    setOpen(false);
    if (next === value) return;
    const prev = value;
    setValue(next);
    const { error } = await createClient().from("candidates").update({ status: next }).eq("id", id);
    if (error) {
      setValue(prev);
      toast.error(friendlyError(error.message));
      return;
    }
    toast.success(`Status: ${next}`);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={cn("inline-flex h-8 items-center gap-2 rounded-full pl-3 pr-2 text-[13px] font-medium", s.bg, s.text)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn("h-2 w-2 rounded-full", s.dot)} />
        {value}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 z-30 mt-1 w-48 rounded-lg border border-line bg-surface p-1 shadow-pop animate-pop-in">
          {STATUSES.map((st) => (
            <button
              key={st}
              role="option"
              aria-selected={st === value}
              onMouseDown={(e) => {
                e.preventDefault();
                change(st);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-canvas",
                st === value ? "font-medium text-ink-800" : "text-ink-600"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", STATUS_STYLE[st].dot)} />
              {st}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RatingControl({ id, rating }: { id: string; rating: number | null }) {
  const [value, setValue] = useState(rating);
  return (
    <StarInput
      value={value}
      onChange={async (v) => {
        setValue(v);
        const { error } = await createClient().from("candidates").update({ rating: v }).eq("id", id);
        if (error) toast.error(friendlyError(error.message));
      }}
    />
  );
}

export function MoreActions({ id, archived, isAdmin, name }: { id: string; archived: boolean; isAdmin: boolean; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const supabase = createClient();
    if (confirm === "archive") {
      const { error } = await supabase.from("candidates").update({ is_archived: !archived }).eq("id", id);
      setLoading(false);
      setConfirm(null);
      if (error) return toast.error(friendlyError(error.message));
      toast.success(archived ? "Candidate restored" : "Candidate archived");
      router.refresh();
    } else if (confirm === "delete") {
      const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
      setLoading(false);
      setConfirm(null);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return toast.error(j.error ?? "Delete failed");
      }
      toast.success("Candidate permanently deleted");
      router.push("/candidates");
      router.refresh();
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink-600 shadow-card hover:bg-canvas"
        aria-label="More options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-52 rounded-lg border border-line bg-surface p-1 shadow-pop animate-pop-in">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
              setConfirm("archive");
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-ink-700 hover:bg-canvas"
          >
            {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {archived ? "Restore candidate" : "Archive candidate"}
          </button>
          {isAdmin && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                setConfirm("delete");
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Delete permanently
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={run}
        loading={loading}
        danger={confirm === "delete"}
        title={confirm === "delete" ? `Delete ${name}?` : archived ? `Restore ${name}?` : `Archive ${name}?`}
        description={
          confirm === "delete"
            ? "The profile, notes and all documents (including in Google Drive) will be removed permanently. This can't be undone."
            : archived
              ? "The candidate will appear in search results again."
              : "The candidate will be hidden from search, but the data stays safe. You can restore it any time."
        }
        confirmLabel={confirm === "delete" ? "Delete permanently" : archived ? "Restore" : "Archive"}
      />
    </div>
  );
}

export function Sensitive({ value, visible = 4 }: { value: string | null; visible?: number }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-ink-300">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-[13px]">{show ? value : mask(value, visible)}</span>
      <button onClick={() => setShow(!show)} className="text-ink-400 hover:text-ink-800" aria-label={show ? "Hide" : "Show"}>
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

export function ProfileTabs({
  tabs,
}: {
  tabs: { id: string; label: string; count?: number; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0].id);
  return (
    <div>
      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "relative -mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm transition-colors",
              active === t.id ? "border-ink-800 font-medium text-ink-800" : "border-transparent text-ink-400 hover:text-ink-700"
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-xs tabular", active === t.id ? "bg-ink-900 text-surface" : "bg-ink-800/[0.06] text-ink-600")}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" hidden={active !== t.id}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
