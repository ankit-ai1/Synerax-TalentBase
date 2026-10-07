"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/misc";
import { cn, lpa, years } from "@/lib/utils";

export type Option = { id: string; label: string; sub?: string; avatar?: boolean };

/** Async searchable select */
export function AsyncPicker({
  label,
  value,
  onChange,
  search,
  placeholder = "Search karo…",
  disabled,
  required,
  hint,
}: {
  label?: string;
  value: Option | null;
  onChange: (v: Option | null) => void;
  search: (term: string) => Promise<Option[]>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  hint?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const req = useRef(0);

  useEffect(() => {
    if (!open) return;
    const rid = ++req.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await search(q.trim());
      if (rid === req.current) {
        setOpts(r);
        setLoading(false);
        setActive(0);
      }
    }, 160);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {!open ? (
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="field-input flex items-center gap-2 text-left"
        >
          {value ? (
            <>
              {value.avatar && <Avatar name={value.label} size="xs" />}
              <span className="min-w-0 flex-1 truncate">
                {value.label}
                {value.sub && <span className="ml-1.5 text-ink-400">{value.sub}</span>}
              </span>
              {!disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                  className="rounded p-0.5 text-ink-400 hover:bg-surface-3 hover:text-ink-800"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
            </>
          ) : (
            <>
              <span className="flex-1 text-ink-300">{placeholder}</span>
              <ChevronsUpDown className="h-4 w-4 text-ink-300" />
            </>
          )}
        </button>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, opts.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (opts[active]) {
                  onChange(opts[active]);
                  setOpen(false);
                  setQ("");
                }
              } else if (e.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder}
            className="field-input pl-9"
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-400" />}
        </div>
      )}
      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-pop animate-pop-in">
          {opts.length === 0 && !loading && <p className="px-3 py-4 text-center text-sm text-ink-400">No results</p>}
          {opts.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onMouseMove={() => setActive(i)}
              onClick={() => {
                onChange(o);
                setOpen(false);
                setQ("");
              }}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left", active === i && "bg-surface-3")}
            >
              {o.avatar && <Avatar name={o.label} size="xs" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink-900">{o.label}</span>
                {o.sub && <span className="block truncate text-xs text-ink-400">{o.sub}</span>}
              </span>
              {value?.id === o.id && <Check className="h-4 w-4 text-jade" />}
            </button>
          ))}
        </div>
      )}
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const searchCandidates = async (term: string): Promise<Option[]> => {
  const { data } = await createClient().rpc("search_candidates", { f: { q: term, page_size: 8, sort: term ? "relevance" : "recent" } });
  return ((data as any)?.items ?? []).map((c: any) => ({
    id: c.id,
    label: [c.first_name, c.last_name].filter(Boolean).join(" "),
    sub: [c.current_designation || c.headline, years(c.total_experience), c.expected_ctc ? lpa(c.expected_ctc) : null].filter(Boolean).join(" · "),
    avatar: true,
  }));
};

export const searchJobs = async (term: string, onlyOpen = true): Promise<Option[]> => {
  let q = createClient().from("jobs").select("id, job_code, title, status, client:clients(name)").order("created_at", { ascending: false }).limit(10);
  if (onlyOpen) q = q.in("status", ["Open", "On Hold"]);
  if (term) q = q.or(`title.ilike.%${term.replace(/[%_,()]/g, "")}%,job_code.ilike.%${term.replace(/[%_,()]/g, "")}%`);
  const { data } = await q;
  return (data ?? []).map((j: any) => ({ id: j.id, label: j.title, sub: [j.job_code, j.client?.name].filter(Boolean).join(" · ") }));
};

export const searchClients = async (term: string): Promise<Option[]> => {
  let q = createClient().from("clients").select("id, name, city, client_code").order("name").limit(10);
  if (term) q = q.ilike("name", `%${term.replace(/[%_]/g, "")}%`);
  const { data } = await q;
  return (data ?? []).map((c: any) => ({ id: c.id, label: c.name, sub: [c.client_code, c.city].filter(Boolean).join(" · ") }));
};

/** Team members dropdown */
export function UserSelect({
  label,
  value,
  onChange,
  placeholder = "Assign to someone",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  useEffect(() => {
    createClient()
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .in("role", ["admin", "hr"])
      .order("full_name")
      .then(({ data }) => setUsers(data ?? []));
  }, []);
  return (
    <div>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field-input">
        <option value="">{placeholder}</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function useUsers() {
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  useEffect(() => {
    createClient()
      .from("profiles")
      .select("id, full_name")
      .eq("is_active", true)
      .in("role", ["admin", "hr"])
      .order("full_name")
      .then(({ data }) => setUsers(data ?? []));
  }, []);
  return users;
}
