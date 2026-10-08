"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  Bookmark,
  BookmarkPlus,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutList,
  Loader2,
  MapPin,
  MessageCircle,
  Rows3,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button, LinkButton } from "@/components/ui/button";
import { ChipInput, SelectField, TextField } from "@/components/ui/fields";
import { Avatar, Card, EmptyState, ScoreRing, Stars, StatusBadge } from "@/components/ui/misc";
import { Checkbox, Menu, MenuDivider, MenuItem, MenuLabel, Segmented } from "@/components/ui/interactive";
import { Dialog } from "@/components/ui/dialog";
import { useDialogs } from "@/components/dialogs/provider";
import { useUsers } from "@/components/pickers";
import { CheckList, MultiSelect } from "./multi-select";
import { activeFilterCount, emptyFilters, parseFilters, toQueryString, toRpc, type Filters } from "./filters";
import {
  CITIES,
  GENDERS,
  JOB_TYPES,
  NOTICE_OPTIONS,
  QUALIFICATIONS,
  SOURCES,
  STATUSES,
  STATUS_STYLE,
  WORK_MODES,
} from "@/lib/constants";
import { cn, daysUntil, formatDate, friendlyError, lpa, noticeLabel, timeAgo, years } from "@/lib/utils";
import type { JobRole, SearchItem, SearchResult, Skill } from "@/lib/types";

const SORTS = [
  { value: "relevance", label: "Best match" },
  { value: "recent", label: "Recently updated" },
  { value: "exp_desc", label: "Experience: high to low" },
  { value: "exp_asc", label: "Experience: low to high" },
  { value: "ctc_asc", label: "Expected CTC: low to high" },
  { value: "ctc_desc", label: "Expected CTC: high to low" },
  { value: "notice_asc", label: "Notice: earliest joining" },
  { value: "name", label: "Name (A–Z)" },
];

const PRESETS: { label: string; apply: (f: Filters) => Filters; on: (f: Filters) => boolean }[] = [
  { label: "Immediate joiners", apply: (f) => ({ ...f, notice_max: f.notice_max === "15" ? "" : "15" }), on: (f) => f.notice_max === "15" },
  { label: "Serving notice", apply: (f) => ({ ...f, serving_notice: f.serving_notice === "true" ? "" : "true" }), on: (f) => f.serving_notice === "true" },
  {
    label: "Available / on bench",
    apply: (f) => {
      const on = f.statuses.includes("Available") && f.statuses.includes("On Bench");
      return { ...f, statuses: on ? f.statuses.filter((s) => s !== "Available" && s !== "On Bench") : Array.from(new Set([...f.statuses, "Available", "On Bench"])) };
    },
    on: (f) => f.statuses.includes("Available") && f.statuses.includes("On Bench"),
  },
  { label: "Ready to relocate", apply: (f) => ({ ...f, relocate: f.relocate === "true" ? "" : "true" }), on: (f) => f.relocate === "true" },
  { label: "Self-registered", apply: (f) => ({ ...f, portal: f.portal === "true" ? "" : "true" }), on: (f) => f.portal === "true" },
  {
    label: "Added this week",
    apply: (f) => ({ ...f, added_from: f.added_from ? "" : new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 10) }),
    on: (f) => !!f.added_from,
  },
];

type Saved = { id: string; name: string; filters: Partial<Filters>; is_shared: boolean; created_by: string };

export function SearchView({ skills, roles, isAdmin, meId }: { skills: Skill[]; roles: JobRole[]; isAdmin: boolean; meId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const dialogs = useDialogs();
  const users = useUsers();
  const [jobOpts, setJobOpts] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    createClient()
      .from("jobs")
      .select("id, title, job_code, client:clients(name)")
      .in("status", ["Open", "On Hold", "Pending review"])
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setJobOpts((data ?? []).map((j: any) => ({ value: j.id, label: `${j.title}${j.client?.name ? ` — ${j.client.name}` : ""} (${j.job_code})` })))
      );
  }, []);
  const [f, setF] = useState<Filters>(() => parseFilters(new URLSearchParams(sp.toString())));
  const [qInput, setQInput] = useState(f.q);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [pageSize, setPageSize] = useState(20);
  const [sel, setSel] = useState<Map<string, SearchItem>>(new Map());
  const [saved, setSaved] = useState<Saved[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const reqId = useRef(0);

  const loadSaved = useCallback(() => {
    createClient()
      .from("saved_searches")
      .select("id, name, filters, is_shared, created_by")
      .order("name")
      .then(({ data }) => setSaved((data ?? []) as Saved[]));
  }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem("cand-view");
      if (v === "table" || v === "cards") setView(v);
    } catch {}
    loadSaved();
  }, [loadSaved]);

  const update = useCallback((patch: Partial<Filters>, resetPage = true) => {
    setF((prev) => ({ ...prev, ...patch, ...(resetPage ? { page: "1" } : {}) }));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== f.q) update({ q: qInput });
    }, 300);
    return () => clearTimeout(t);
  }, [qInput, f.q, update]);

  const fetchNow = useCallback(() => {
    const qs = toQueryString(f);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    const id = ++reqId.current;
    setLoading(true);
    createClient()
      .rpc("search_candidates", { f: toRpc(f, pageSize) })
      .then(({ data, error }) => {
        if (id !== reqId.current) return;
        setLoading(false);
        if (error) return void toast.error(friendlyError(error.message));
        setResult(data as SearchResult);
      });
  }, [f, pathname, router, pageSize]);

  useEffect(fetchNow, [fetchNow]);

  const count = activeFilterCount(f);
  const total = result?.total ?? 0;
  const page = Number(f.page) || 1;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const items = result?.items ?? [];
  const allOnPage = items.length > 0 && items.every((i) => sel.has(i.id));
  const someOnPage = items.some((i) => sel.has(i.id));

  const toggle = (c: SearchItem, on: boolean) =>
    setSel((m) => {
      const n = new Map(m);
      if (on) n.set(c.id, c);
      else n.delete(c.id);
      return n;
    });
  const toggleAll = (on: boolean) =>
    setSel((m) => {
      const n = new Map(m);
      items.forEach((i) => (on ? n.set(i.id, i) : n.delete(i.id)));
      return n;
    });
  const ids = Array.from(sel.keys());
  const afterBulk = () => {
    setSel(new Map());
    fetchNow();
  };

  async function bulk(action: string, value?: string) {
    const { data, error } = await createClient().rpc("bulk_candidates", { p_ids: ids, p_action: action, p_value: value ?? null });
    if (error) return toast.error(friendlyError(error.message));
    toast.success(`${data} candidates updated`);
    afterBulk();
  }

  const skillOpts = skills.map((s) => ({ id: s.id, name: s.name, group: s.category, aliases: s.aliases }));
  const roleOpts = roles.map((r) => ({ id: r.id, name: r.name, group: r.department }));

  const panel = (
    <div className="space-y-6">
      <div className="space-y-3">
        <MultiSelect label="Skills" options={skillOpts} value={f.skills} onChange={(v) => update({ skills: v })} placeholder="React, SAP, Payroll…" />
        {f.skills.length > 1 && (
          <Segmented
            size="sm"
            className="flex w-full [&>button]:flex-1"
            value={f.skill_mode}
            onChange={(v) => update({ skill_mode: v })}
            options={[
              { value: "any", label: "Any skill" },
              { value: "all", label: "All skills" },
            ]}
          />
        )}
        {f.skills.length > 0 && (
          <TextField label="Min. per skill" type="number" min={0} step={0.5} suffix="years" value={f.min_skill_years} onChange={(v) => update({ min_skill_years: v })} />
        )}
      </div>
      <MultiSelect label="Job roles" options={roleOpts} value={f.job_roles} onChange={(v) => update({ job_roles: v })} placeholder="Backend Developer…" />
      <Range label="Total experience" unit="yrs" min={f.exp_min} max={f.exp_max} onChange={(a, b) => update({ exp_min: a, exp_max: b })} />
      <ChipInput label="Location" value={f.locations} onChange={(v) => update({ locations: v })} suggestions={CITIES} placeholder="Type a city" hint="Current or preferred location" />
      <Range label="Expected CTC" unit="LPA" min={f.exp_ctc_min} max={f.exp_ctc_max} onChange={(a, b) => update({ exp_ctc_min: a, exp_ctc_max: b })} />
      <Range label="Current CTC" unit="LPA" min={f.cur_ctc_min} max={f.cur_ctc_max} onChange={(a, b) => update({ cur_ctc_min: a, cur_ctc_max: b })} />
      <SelectField
        label="Notice period (max)"
        value={f.notice_max}
        onChange={(v) => update({ notice_max: v })}
        options={NOTICE_OPTIONS.filter((o) => o.value !== "120").map((o) => ({ value: o.value, label: o.value === "0" ? "Immediate" : `Up to ${o.label}` }))}
        placeholder="Any"
      />
      <TextField label="Can join by" type="date" value={f.join_by} onChange={(v) => update({ join_by: v })} />
      <CheckList
        label="Status"
        options={STATUSES}
        value={f.statuses}
        onChange={(v) => update({ statuses: v })}
        renderLabel={(o) => (
          <span className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", STATUS_STYLE[o].dot)} />
            {o}
          </span>
        )}
      />
      <SelectField label="Work mode" value={f.work_mode} onChange={(v) => update({ work_mode: v })} options={WORK_MODES.filter((w) => w !== "Any")} placeholder="Any" />
      <SelectField label="Job type" value={f.job_type} onChange={(v) => update({ job_type: v })} options={JOB_TYPES.filter((w) => w !== "Any")} placeholder="Any" />
      <SelectField label="Qualification" value={f.qualification} onChange={(v) => update({ qualification: v })} options={QUALIFICATIONS} placeholder="Any" />
      <SelectField label="Gender" value={f.gender} onChange={(v) => update({ gender: v })} options={GENDERS} placeholder="Any" />
      <SelectField label="Source" value={f.source} onChange={(v) => update({ source: v })} options={SOURCES} placeholder="Any" />
      <SelectField
        label="Candidate portal"
        value={f.portal}
        onChange={(v) => update({ portal: v })}
        options={[
          { value: "true", label: "Self-registered (has portal login)" },
          { value: "false", label: "Added by the team" },
        ]}
        placeholder="Any"
      />
      <SelectField
        label="Profile completion"
        value={f.completion_min}
        onChange={(v) => update({ completion_min: v })}
        options={["50", "70", "80", "90", "100"].map((x) => ({ value: x, label: x === "100" ? "100% complete" : `${x}% or more` }))}
        placeholder="Any"
      />
      <SelectField label="Applied to / in pipeline of" value={f.in_job} onChange={(v) => update({ in_job: v })} options={jobOpts} placeholder="Any job" />
      <SelectField label="Added by" value={f.added_by} onChange={(v) => update({ added_by: v })} options={users.map((u) => ({ value: u.id, label: u.full_name }))} placeholder="Any" />
      <TextField label="Tag" value={f.tag} onChange={(v) => update({ tag: v })} placeholder="e.g. Urgent" />
      <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-700">
        <input type="checkbox" checked={f.archived === "true"} onChange={(e) => update({ archived: e.target.checked ? "true" : "" })} className="h-4 w-4 accent-[rgb(var(--jade))]" />
        Show archived candidates only
      </label>
    </div>
  );

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Name, skill, company, designation, phone, email or city…"
            className="h-12 w-full rounded-xl border border-line bg-surface pl-12 pr-10 text-[15px] text-ink-900 shadow-card placeholder:text-ink-300 focus:border-jade focus:outline-none focus:ring-4 focus:ring-jade/10"
            aria-label="Search candidates"
          />
          {qInput && (
            <button onClick={() => setQInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 hover:text-ink-800" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Menu
          width="w-72"
          trigger={({ toggle: t }) => (
            <Button variant="secondary" className="h-12 px-4" onClick={t}>
              <Bookmark className="h-4 w-4" />
              <span className="hidden md:inline">Saved</span>
            </Button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>Saved searches</MenuLabel>
              {saved.length === 0 && <p className="px-2.5 py-2 text-xs text-ink-400">No saved searches yet.</p>}
              {saved.map((s) => (
                <div key={s.id} className="group flex items-center">
                  <MenuItem
                    icon={<Bookmark className="h-4 w-4" />}
                    hint={s.is_shared ? "Team" : undefined}
                    onClick={() => {
                      close();
                      const nf = { ...emptyFilters(), ...s.filters, page: "1" };
                      setF(nf);
                      setQInput(nf.q);
                    }}
                  >
                    {s.name}
                  </MenuItem>
                  {(s.created_by === meId || isAdmin) && (
                    <button
                      onClick={async () => {
                        await createClient().from("saved_searches").delete().eq("id", s.id);
                        loadSaved();
                      }}
                      className="mr-1 rounded p-1 text-ink-300 opacity-0 hover:text-red-600 group-hover:opacity-100"
                      aria-label="Delete saved search"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <MenuDivider />
              <MenuItem icon={<BookmarkPlus className="h-4 w-4" />} onClick={() => (close(), setSaveOpen(true))} disabled={count === 0 && !f.q}>
                Save this search
              </MenuItem>
            </>
          )}
        </Menu>
        <Button variant="secondary" className="h-12 lg:hidden" onClick={() => setDrawer(true)}>
          <SlidersHorizontal className="h-4 w-4" />
          {count > 0 && <span className="rounded-full bg-jade px-1.5 text-xs text-white">{count}</span>}
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const on = p.on(f);
          return (
            <button
              key={p.label}
              onClick={() => setF((prev) => ({ ...p.apply(prev), page: "1" }))}
              className={cn(
                "rounded-full border px-3 py-1 text-[13px] transition-colors",
                on ? "border-ink-900 bg-ink-900 text-surface" : "border-line bg-surface text-ink-600 hover:border-line-strong"
              )}
              aria-pressed={on}
            >
              {p.label}
            </button>
          );
        })}
        {(count > 0 || f.q) && (
          <button
            onClick={() => {
              setQInput("");
              setF(emptyFilters());
            }}
            className="ml-1 text-[13px] font-medium text-ink-400 hover:text-ink-800"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-6 pr-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-900">Filters</p>
              {count > 0 && <span className="rounded-full bg-jade px-2 text-[11px] font-semibold text-white">{count} active</span>}
            </div>
            {panel}
          </div>
        </aside>

        <section aria-live="polite" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Checkbox checked={allOnPage} indeterminate={!allOnPage && someOnPage} onChange={toggleAll} label="Select all on this page" />
              <p className="text-sm text-ink-500">
                {loading && !result ? (
                  "Searching…"
                ) : (
                  <>
                    <span className="font-semibold tabular text-ink-900">{total.toLocaleString("en-IN")}</span> candidate{total === 1 ? "" : "s"}
                    {loading && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select value={f.sort} onChange={(e) => update({ sort: e.target.value })} className="field-input h-9 w-auto pr-8 text-[13px]" aria-label="Sort">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <Segmented
                size="sm"
                value={view}
                onChange={(v) => {
                  setView(v);
                  try {
                    localStorage.setItem("cand-view", v);
                  } catch {}
                }}
                options={[
                  { value: "cards", label: <Rows3 className="h-3.5 w-3.5" />, title: "Cards" },
                  { value: "table", label: <LayoutList className="h-3.5 w-3.5" />, title: "Table" },
                ]}
              />
              {isAdmin && total > 0 && (
                <a
                  href={`/api/export?${toQueryString({ ...f, page: "1" })}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-medium text-ink-700 shadow-card hover:bg-surface-2"
                >
                  <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
                </a>
              )}
            </div>
          </div>

          {result && items.length === 0 && !loading ? (
            <Card>
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="No candidates match this search"
                description={count > 0 ? "Try removing some filters, or choose 'Any skill' instead of 'All skills'." : "Add candidates to the database to get started."}
                action={
                  count > 0 ? (
                    <Button variant="secondary" onClick={() => setF(emptyFilters())}>
                      Clear filters
                    </Button>
                  ) : (
                    <LinkButton href="/candidates/new">
                      <UserPlus className="h-4 w-4" /> Add candidate
                    </LinkButton>
                  )
                }
              />
            </Card>
          ) : view === "cards" ? (
            <ul className={cn("space-y-3 transition-opacity", loading && result && "opacity-60")}>
              {items.map((c) => (
                <ResultCard key={c.id} c={c} selected={sel.has(c.id)} onSelect={(v) => toggle(c, v)} />
              ))}
              {!result && Array.from({ length: 4 }).map((_, i) => <li key={i} className="h-36 animate-pulse rounded-xl border border-line bg-surface" />)}
            </ul>
          ) : (
            <div className={cn("overflow-x-auto rounded-xl border border-line bg-surface shadow-card transition-opacity", loading && result && "opacity-60")}>
              <table className="w-full min-w-[1050px] text-[13px]">
                <thead className="bg-surface-2">
                  <tr className="border-b border-line text-left text-xs text-ink-400">
                    <th className="w-10 px-3 py-2.5" />
                    <th className="px-2 py-2.5 font-medium">Candidate</th>
                    <th className="px-2 py-2.5 font-medium">Status</th>
                    <th className="px-2 py-2.5 font-medium">Exp</th>
                    <th className="px-2 py-2.5 font-medium">Current → Expected</th>
                    <th className="px-2 py-2.5 font-medium">Notice</th>
                    <th className="px-2 py-2.5 font-medium">City</th>
                    <th className="px-2 py-2.5 font-medium">Top skills</th>
                    <th className="px-2 py-2.5 font-medium">Source</th>
                    <th className="px-3 py-2.5 text-right font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((c) => {
                    const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
                    return (
                      <tr key={c.id} className={cn("hover:bg-surface-2", sel.has(c.id) && "bg-jade-50/60")}>
                        <td className="px-3 py-2">
                          <Checkbox checked={sel.has(c.id)} onChange={(v) => toggle(c, v)} label={`${name} select`} />
                        </td>
                        <td className="px-2 py-2">
                          <Link href={`/candidates/${c.id}`} className="flex items-center gap-2.5">
                            <Avatar name={name} size="xs" />
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5 truncate font-medium text-ink-900 hover:text-jade-700">
                                {name}
                                {c.portal_user && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" title="Self-registered" />}
                              </span>
                              <span className="block max-w-[220px] truncate text-[11.5px] text-ink-400">{c.current_designation || c.headline || "—"}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-2 py-2">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-2 py-2 tabular text-ink-700">{years(c.total_experience)}</td>
                        <td className="px-2 py-2 tabular text-ink-700">
                          {lpa(c.current_ctc)} <span className="text-ink-300">→</span> {lpa(c.expected_ctc)}
                        </td>
                        <td className={cn("px-2 py-2", c.notice_period_days != null && c.notice_period_days <= 15 ? "font-medium text-jade-700" : "text-ink-700")}>
                          {c.serving_notice && c.last_working_day ? `LWD ${formatDate(c.last_working_day, { day: "numeric", month: "short" })}` : noticeLabel(c.notice_period_days)}
                        </td>
                        <td className="px-2 py-2 text-ink-700">{c.current_city ?? "—"}</td>
                        <td className="px-2 py-2">
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {c.skills.slice(0, 3).map((s) => (
                              <span key={s.id} className={cn("rounded px-1.5 py-0.5 text-[11px]", s.matched ? "bg-saffron-50 text-saffron-800" : "bg-surface-3 text-ink-600")}>
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-ink-500">{c.source ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-xs text-ink-400">{timeAgo(c.updated_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {total > 0 && (
            <nav className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-label="Pages">
              <div className="flex items-center gap-2 text-xs text-ink-500">
                Per page
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    update({ page: "1" }, false);
                  }}
                  className="field-input h-8 w-auto pr-7 text-xs"
                  aria-label="Per page"
                >
                  {[20, 50, 100].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              {pages > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)}>
                    <ChevronLeft className="h-4 w-4" /> Pichla
                  </Button>
                  <span className="text-[13px] tabular text-ink-500">
                    {page} / {pages}
                  </span>
                  <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => update({ page: String(page + 1) }, false)}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </nav>
          )}
        </section>
      </div>

      {sel.size > 0 && (
        <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 lg:pl-[var(--sidebar-w,248px)]">
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#38240D] p-1.5 pl-4 text-white shadow-pop animate-pop-in dark:bg-[#46301A]">
            <span className="mr-2 whitespace-nowrap text-sm font-semibold">{sel.size} selected</span>
            <BarBtn icon={<Briefcase className="h-4 w-4" />} onClick={() => dialogs.openAddToJob(ids, afterBulk)}>
              Add to job
            </BarBtn>
            <BarBtn icon={<Bookmark className="h-4 w-4" />} onClick={() => dialogs.openShortlist(ids, afterBulk)}>
              Shortlist
            </BarBtn>
            <BarBtn icon={<MessageCircle className="h-4 w-4" />} onClick={() => dialogs.openMessage({ candidates: Array.from(sel.values()) })}>
              Message
            </BarBtn>
            <Menu
              side="top"
              width="w-48"
              trigger={({ toggle: t }) => (
                <BarBtn icon={<span className="h-2 w-2 rounded-full bg-saffron" />} onClick={t}>
                  Status
                </BarBtn>
              )}
            >
              {(close) =>
                STATUSES.map((s) => (
                  <MenuItem key={s} icon={<span className={cn("block h-2 w-2 rounded-full", STATUS_STYLE[s].dot)} />} onClick={() => (close(), bulk("status", s))}>
                    {s}
                  </MenuItem>
                ))
              }
            </Menu>
            <BarBtn icon={<Tag className="h-4 w-4" />} onClick={() => setTagOpen(true)}>
              Tag
            </BarBtn>
            {isAdmin && (
              <a
                href={`/api/export?${toQueryString({ ...emptyFilters(), ids, archived: f.archived })}`}
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-medium text-white/75 hover:bg-white/10 hover:text-white"
              >
                <Download className="h-4 w-4" /> Export
              </a>
            )}
            <BarBtn icon={<Archive className="h-4 w-4" />} onClick={() => bulk(f.archived === "true" ? "restore" : "archive")}>
              {f.archived === "true" ? "Restore" : "Archive"}
            </BarBtn>
            <button onClick={() => setSel(new Map())} className="ml-1 rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Clear selection">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-surface animate-slide-in">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-semibold text-ink-900">Filters</p>
              <button onClick={() => setDrawer(false)} aria-label="Close" className="rounded-md p-1 text-ink-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{panel}</div>
            <div className="border-t border-line p-3">
              <Button className="w-full" onClick={() => setDrawer(false)}>
                Show {total} results
              </Button>
            </div>
          </div>
        </div>
      )}

      <SaveSearchDialog open={saveOpen} onClose={() => setSaveOpen(false)} filters={f} onSaved={loadSaved} />
      <TagDialog open={tagOpen} onClose={() => setTagOpen(false)} onApply={(tag, remove) => bulk(remove ? "remove_tag" : "add_tag", tag)} />
    </div>
  );
}

function BarBtn({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white">
      {icon}
      {children}
    </button>
  );
}

function SaveSearchDialog({ open, onClose, filters, onSaved }: { open: boolean; onClose: () => void; filters: Filters; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Save search"
      description="Re-apply the same filters later in one click."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={!name.trim()}
            onClick={async () => {
              setBusy(true);
              const clean = Object.fromEntries(Object.entries(filters).filter(([k, v]) => !["page", "ids"].includes(k) && (Array.isArray(v) ? v.length : v)));
              const { error } = await createClient().from("saved_searches").insert({ name: name.trim(), filters: clean, is_shared: shared });
              setBusy(false);
              if (error) return toast.error(friendlyError(error.message));
              toast.success("Search saved");
              setName("");
              onSaved();
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Name" value={name} onChange={setName} placeholder="e.g. Pune Java 5+ yrs immediate" autoFocus />
        <label className="flex items-center gap-2 text-[13px] text-ink-700">
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--jade))]" />
          Share with the whole team
        </label>
      </div>
    </Dialog>
  );
}

function TagDialog({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (tag: string, remove: boolean) => void }) {
  const [tag, setTag] = useState("");
  const [mode, setMode] = useState<"add" | "remove">("add");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Add / remove tag"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!tag.trim()}
            onClick={() => {
              onApply(tag.trim(), mode === "remove");
              setTag("");
              onClose();
            }}
          >
            {mode === "add" ? "Add tag" : "Remove tag"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "add", label: "Add" },
            { value: "remove", label: "Remove" },
          ]}
        />
        <TextField label="Tag" value={tag} onChange={setTag} placeholder="e.g. Hot, Client-ready" autoFocus />
      </div>
    </Dialog>
  );
}

function Range({ label, unit, min, max, onChange }: { label: string; unit: string; min: string; max: string; onChange: (a: string, b: string) => void }) {
  return (
    <div>
      <p className="field-label">
        {label} <span className="font-normal text-ink-400">({unit})</span>
      </p>
      <div className="flex items-center gap-2">
        <input type="number" min={0} step="any" value={min} onChange={(e) => onChange(e.target.value, max)} placeholder="Min" className="field-input h-9 text-[13px]" aria-label={`${label} min`} />
        <span className="text-ink-300">–</span>
        <input type="number" min={0} step="any" value={max} onChange={(e) => onChange(min, e.target.value)} placeholder="Max" className="field-input h-9 text-[13px]" aria-label={`${label} max`} />
      </div>
    </div>
  );
}

function ResultCard({ c, selected, onSelect }: { c: SearchItem; selected: boolean; onSelect: (v: boolean) => void }) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  const lwd = daysUntil(c.last_working_day);
  const shown = c.skills.slice(0, 8);
  const extra = c.skills.length - shown.length;

  return (
    <li>
      <Link
        href={`/candidates/${c.id}`}
        className={cn(
          "group relative block rounded-xl border bg-surface p-4 shadow-card transition-all hover:border-line-strong hover:shadow-pop sm:p-5",
          selected ? "border-jade ring-1 ring-jade" : "border-line"
        )}
      >
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-3 pt-0.5">
            <Checkbox checked={selected} onChange={onSelect} label={`${name} select`} />
            <Avatar name={name} size="lg" className="hidden sm:flex" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="text-base font-semibold text-ink-900 group-hover:text-jade-700">{name}</span>
                  <StatusBadge status={c.status} />
                  {c.portal_user && (
                    <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300">Self-registered</span>
                  )}
                  {c.active_jobs > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
                      <Briefcase className="h-3 w-3" /> {c.active_jobs} active job{c.active_jobs > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-sm text-ink-500">
                  {c.headline || [c.current_designation, c.current_company && `at ${c.current_company}`].filter(Boolean).join(" ") || "—"}
                </p>
              </div>
              {c.skill_match !== null && <ScoreRing value={c.skill_match} size={46} label={`${c.skill_match}% skills match`} />}
            </div>

            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
              <Fact label="Exp" value={years(c.total_experience)} />
              {(c.current_ctc != null || c.expected_ctc != null) && <Fact label="CTC" value={`${lpa(c.current_ctc)} → ${lpa(c.expected_ctc)}`} />}
              <Fact
                label="Notice"
                value={
                  c.serving_notice && c.last_working_day
                    ? `LWD ${formatDate(c.last_working_day, { day: "numeric", month: "short" })}${lwd !== null && lwd >= 0 ? ` (${lwd}d)` : ""}`
                    : noticeLabel(c.notice_period_days)
                }
                highlight={c.notice_period_days !== null && c.notice_period_days <= 15}
              />
              {c.current_city && (
                <span className="inline-flex items-center gap-1 text-ink-500">
                  <MapPin className="h-3.5 w-3.5 text-ink-400" />
                  {c.current_city}
                  {c.preferred_locations.length > 0 && <span className="text-ink-400"> · prefers {c.preferred_locations.slice(0, 2).join(", ")}</span>}
                </span>
              )}
            </dl>

            {shown.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {shown.map((s) => (
                  <span
                    key={s.id}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs",
                      s.matched ? "bg-saffron-50 font-medium text-saffron-800 ring-1 ring-inset ring-saffron/50" : "bg-ink-800/[0.05] text-ink-600"
                    )}
                  >
                    {s.name}
                    {s.years ? <span className="opacity-60"> {Number(s.years)}y</span> : null}
                  </span>
                ))}
                {extra > 0 && <span className="px-1 py-0.5 text-xs text-ink-400">+{extra}</span>}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-ink-400">
              <span className="truncate">
                {c.roles.join(", ")}
                {c.tags?.length ? <span className="ml-2 text-ink-500">#{c.tags.join(" #")}</span> : null}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                {c.rating ? <Stars value={c.rating} size={12} /> : null}
                <span>Updated {timeAgo(c.updated_at)}</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

function Fact({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-ink-400">{label}</dt>
      <dd className={cn("font-medium tabular", highlight ? "text-jade-700" : "text-ink-700")}>{value}</dd>
    </div>
  );
}
