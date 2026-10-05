"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarPlus,
  CheckSquare,
  CornerDownLeft,
  Loader2,
  Moon,
  Search,
  UserPlus,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme";
import { useDialogs } from "@/components/dialogs/provider";
import { Avatar, Kbd } from "@/components/ui/misc";
import { cn, lpa, years } from "@/lib/utils";
import { NAV } from "./nav";

type Item = {
  id: string;
  group: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  run: () => void;
  keywords?: string;
};

export function CommandPalette({ open, onClose, isAdmin }: { open: boolean; onClose: () => void; isAdmin: boolean }) {
  const router = useRouter();
  const { resolved, setTheme } = useTheme();
  const dialogs = useDialogs();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (open) {
      setQ("");
      setRemote([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const staticItems: Item[] = useMemo(
    () => [
      { id: "a-cand", group: "Actions", label: "Add new candidate", icon: <UserPlus className="h-4 w-4" />, run: () => go("/candidates/new"), keywords: "add new candidate profile" },
      { id: "a-job", group: "Actions", label: "New job opening", icon: <Briefcase className="h-4 w-4" />, run: () => go("/jobs/new"), keywords: "add new job requirement" },
      { id: "a-client", group: "Actions", label: "New client", icon: <Building2 className="h-4 w-4" />, run: () => go("/clients/new"), keywords: "add company client" },
      {
        id: "a-int",
        group: "Actions",
        label: "Schedule interview",
        icon: <CalendarPlus className="h-4 w-4" />,
        run: () => {
          onClose();
          dialogs.openInterview({});
        },
        keywords: "schedule interview",
      },
      {
        id: "a-task",
        group: "Actions",
        label: "Create task / follow-up",
        icon: <CheckSquare className="h-4 w-4" />,
        run: () => {
          onClose();
          dialogs.openTask({});
        },
        keywords: "reminder todo",
      },
      {
        id: "a-theme",
        group: "Actions",
        label: resolved === "dark" ? "Switch to light mode" : "Switch to dark mode",
        icon: <Moon className="h-4 w-4" />,
        run: () => {
          setTheme(resolved === "dark" ? "light" : "dark");
          onClose();
        },
        keywords: "theme dark light",
      },
      ...NAV.filter((g) => !g.admin || isAdmin).flatMap((g) =>
        g.items.map((n) => ({
          id: "n-" + n.href,
          group: "Pages",
          label: n.label,
          icon: <n.icon className="h-4 w-4" />,
          run: () => go(n.href),
        }))
      ),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolved, isAdmin]
  );

  // remote search
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setRemote([]);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      const like = `%${term.replace(/[%_]/g, "")}%`;
      const [cands, jobs, clients] = await Promise.all([
        supabase.rpc("search_candidates", { f: { q: term, page_size: 6 } }),
        supabase.from("jobs").select("id, job_code, title, status, client:clients(name)").or(`title.ilike.${like},job_code.ilike.${like}`).limit(5),
        supabase.from("clients").select("id, name, city, client_code").ilike("name", like).limit(4),
      ]);
      if (id !== reqId.current) return;
      setLoading(false);
      const items: Item[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const c of ((cands.data as any)?.items ?? []) as any[]) {
        const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
        items.push({
          id: "c-" + c.id,
          group: "Candidates",
          label: name,
          sub: [c.current_designation || c.headline, years(c.total_experience), c.expected_ctc ? lpa(c.expected_ctc) : null, c.current_city].filter(Boolean).join(" · "),
          icon: <Avatar name={name} size="xs" />,
          run: () => go(`/candidates/${c.id}`),
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const j of (jobs.data ?? []) as any[]) {
        items.push({
          id: "j-" + j.id,
          group: "Jobs",
          label: j.title,
          sub: [j.job_code, j.client?.name, j.status].filter(Boolean).join(" · "),
          icon: <Briefcase className="h-4 w-4" />,
          run: () => go(`/jobs/${j.id}`),
        });
      }
      for (const c of clients.data ?? []) {
        items.push({
          id: "cl-" + c.id,
          group: "Clients",
          label: c.name,
          sub: [c.client_code, c.city].filter(Boolean).join(" · "),
          icon: <Building2 className="h-4 w-4" />,
          run: () => go(`/clients/${c.id}`),
        });
      }
      setRemote(items);
    }, 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term
      ? staticItems.filter((i) => (i.label + " " + (i.keywords ?? "")).toLowerCase().includes(term))
      : staticItems.filter((i) => i.group === "Actions").concat(staticItems.filter((i) => i.group === "Pages").slice(0, 6));
    const all = term ? [...remote, ...filtered] : filtered;
    if (term.length >= 2) {
      all.push({
        id: "search-all",
        group: "Search",
        label: `See all candidates for "${q.trim()}"`,
        icon: <Search className="h-4 w-4" />,
        run: () => go(`/candidates?q=${encodeURIComponent(q.trim())}`),
      });
    }
    return all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, remote, staticItems]);

  useEffect(() => setActive(0), [items.length]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const groups: { name: string; items: (Item & { idx: number })[] }[] = [];
  items.forEach((it, idx) => {
    let g = groups.find((x) => x.name === it.group);
    if (!g) groups.push((g = { name: it.group, items: [] }));
    g.items.push({ ...it, idx });
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm animate-fade-in dark:bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-[640px] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop animate-pop-in">
        <div className="flex items-center gap-3 border-b border-line px-4">
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-ink-400" /> : <Search className="h-5 w-5 text-ink-400" />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                items[active]?.run();
              } else if (e.key === "Escape") onClose();
            }}
            placeholder="Type a name, skill, phone, job or client…"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink-900 outline-none placeholder:text-ink-300 focus-visible:ring-0 focus-visible:ring-offset-0"
            aria-label="Search"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {groups.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-ink-400">{q.trim().length < 2 ? "Type at least 2 letters" : "No results"}</p>
          )}
          {groups.map((g) => (
            <div key={g.name} className="mb-1">
              <p className="px-2.5 pb-1 pt-2 text-[11.5px] font-medium text-ink-400">{g.name}</p>
              {g.items.map((it) => (
                <button
                  key={it.id}
                  data-idx={it.idx}
                  onMouseMove={() => setActive(it.idx)}
                  onClick={it.run}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    active === it.idx ? "bg-surface-3" : ""
                  )}
                >
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", it.group === "Candidates" ? "" : "bg-surface-3 text-ink-500")}>
                    {it.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink-900">{it.label}</span>
                    {it.sub && <span className="block truncate text-xs text-ink-400">{it.sub}</span>}
                  </span>
                  {active === it.idx && (it.group === "Candidates" ? <UserRound className="h-4 w-4 text-ink-300" /> : <ArrowRight className="h-4 w-4 text-ink-300" />)}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-4 py-2 text-[11.5px] text-ink-400">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> select
          </span>
          <span className="flex items-center gap-1">
            <Kbd>
              <CornerDownLeft className="h-3 w-3" />
            </Kbd>{" "}
            open
          </span>
          <span className="ml-auto">
            Press <Kbd>/</Kbd> from anywhere
          </span>
        </div>
      </div>
    </div>
  );
}
