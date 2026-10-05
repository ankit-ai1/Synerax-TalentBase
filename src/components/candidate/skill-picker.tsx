"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Star, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { SKILL_LEVELS } from "@/lib/constants";
import type { JobRole, RoleEntry, Skill, SkillEntry } from "@/lib/types";

/** Search the master list and add; create a new one if not found */
export function MasterSearch<T extends { id: string; name: string }>({
  items,
  selectedIds,
  onPick,
  onCreate,
  placeholder,
  groupBy,
}: {
  items: T[];
  selectedIds: string[];
  onPick: (item: T) => void;
  onCreate: (name: string) => Promise<void>;
  placeholder: string;
  groupBy?: (item: T) => string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items
      .filter((i) => !selectedIds.includes(i.id))
      .filter((i) => {
        if (!s) return true;
        const aliases = (i as unknown as { aliases?: string[] }).aliases ?? [];
        return i.name.toLowerCase().includes(s) || aliases.some((a) => a.toLowerCase().includes(s));
      })
      .slice(0, 40);
  }, [q, items, selectedIds]);

  const exact = items.some((i) => i.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results[0]) {
                onPick(results[0]);
                setQ("");
              }
            }
          }}
          placeholder={placeholder}
          className="field-input pl-9"
        />
      </div>
      {open && (results.length > 0 || (q.trim() && !exact)) && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-surface p-1 shadow-pop animate-pop-in">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(r);
                setQ("");
              }}
              className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm text-ink-700 hover:bg-canvas"
            >
              <span>{r.name}</span>
              {groupBy && <span className="text-xs text-ink-400">{groupBy(r)}</span>}
            </button>
          ))}
          {q.trim() && !exact && (
            <button
              type="button"
              disabled={creating}
              onMouseDown={async (e) => {
                e.preventDefault();
                setCreating(true);
                await onCreate(q.trim());
                setCreating(false);
                setQ("");
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-jade-700 hover:bg-jade-50"
            >
              <Plus className="h-4 w-4" />
              {creating ? "Adding…" : `Add "${q.trim()}" as new`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SkillPicker({
  value,
  onChange,
  skills,
  onSkillsChange,
}: {
  value: SkillEntry[];
  onChange: (v: SkillEntry[]) => void;
  skills: Skill[];
  onSkillsChange: (s: Skill[]) => void;
}) {
  const add = (s: Skill) =>
    onChange([...value, { skill_id: s.id, name: s.name, years: "", level: "Intermediate", is_primary: value.length < 3 }]);

  const create = async (name: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.from("skills").insert({ name }).select("id, name, category, aliases").single();
    if (error) {
      toast.error("Couldn't add skill: " + error.message);
      return;
    }
    onSkillsChange([...skills, data as Skill].sort((a, b) => a.name.localeCompare(b.name)));
    add(data as Skill);
    toast.success(`"${name}" added to the skills list`);
  };

  const update = (i: number, patch: Partial<SkillEntry>) =>
    onChange(value.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  return (
    <div className="space-y-3">
      <MasterSearch
        items={skills}
        selectedIds={value.map((v) => v.skill_id)}
        onPick={add}
        onCreate={create}
        placeholder="Search skills — React, Java, Excel, Payroll…"
        groupBy={(s) => s.category}
      />
      {value.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="hidden grid-cols-[1fr_110px_150px_88px_36px] gap-3 border-b border-line bg-canvas px-3 py-2 text-xs font-medium text-ink-400 sm:grid">
            <span>Skill</span>
            <span>Experience</span>
            <span>Level</span>
            <span>Primary</span>
            <span />
          </div>
          {value.map((s, i) => (
            <div
              key={s.skill_id}
              className="grid grid-cols-2 items-center gap-2 border-b border-line px-3 py-2 last:border-0 sm:grid-cols-[1fr_110px_150px_88px_36px] sm:gap-3"
            >
              <span className="col-span-2 text-sm font-medium text-ink-800 sm:col-span-1">{s.name}</span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={s.years}
                  onChange={(e) => update(i, { years: e.target.value })}
                  className="field-input h-8 pr-9 text-[13px]"
                  aria-label={`${s.name} experience years`}
                  placeholder="0"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-400">yrs</span>
              </div>
              <select
                value={s.level}
                onChange={(e) => update(i, { level: e.target.value })}
                className="field-input h-8 text-[13px]"
                aria-label={`${s.name} level`}
              >
                {SKILL_LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => update(i, { is_primary: !s.is_primary })}
                className={cn(
                  "inline-flex h-8 items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors",
                  s.is_primary ? "bg-saffron-50 text-saffron-800" : "text-ink-400 hover:bg-canvas"
                )}
                aria-pressed={s.is_primary}
              >
                <Star className={cn("h-3.5 w-3.5", s.is_primary && "fill-saffron text-saffron")} />
                {s.is_primary ? "Primary" : "Mark"}
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="justify-self-end rounded-md p-1.5 text-ink-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600"
                aria-label={`Remove ${s.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RolePicker({
  value,
  onChange,
  roles,
  onRolesChange,
}: {
  value: RoleEntry[];
  onChange: (v: RoleEntry[]) => void;
  roles: JobRole[];
  onRolesChange: (r: JobRole[]) => void;
}) {
  const add = (r: JobRole) => onChange([...value, { job_role_id: r.id, name: r.name, is_primary: value.length === 0 }]);

  const create = async (name: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.from("job_roles").insert({ name }).select("id, name, department").single();
    if (error) {
      toast.error("Couldn't add role: " + error.message);
      return;
    }
    onRolesChange([...roles, data as JobRole].sort((a, b) => a.name.localeCompare(b.name)));
    add(data as JobRole);
  };

  return (
    <div className="space-y-3">
      <MasterSearch
        items={roles}
        selectedIds={value.map((v) => v.job_role_id)}
        onPick={add}
        onCreate={create}
        placeholder="Search roles — Backend Developer, Recruiter…"
        groupBy={(r) => r.department}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((r) => (
            <span
              key={r.job_role_id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-1.5 text-sm",
                r.is_primary ? "border-ink-800 bg-ink-900 text-surface" : "border-line bg-surface text-ink-700"
              )}
            >
              <button
                type="button"
                title="Make primary role"
                onClick={() => onChange(value.map((x) => ({ ...x, is_primary: x.job_role_id === r.job_role_id })))}
              >
                {r.name}
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.job_role_id !== r.job_role_id))}
                className={cn("rounded-full p-0.5", r.is_primary ? "hover:bg-white/20" : "hover:bg-canvas")}
                aria-label={`Remove ${r.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <p className="w-full text-xs text-ink-400">Click a role to make it the primary one.</p>
        </div>
      )}
    </div>
  );
}
