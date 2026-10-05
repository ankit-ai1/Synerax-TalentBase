"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarPlus,
  CheckSquare,
  FileUp,
  Menu as MenuIcon,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Menu, MenuDivider, MenuItem } from "@/components/ui/interactive";
import { Kbd } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/theme";
import { useDialogs } from "@/components/dialogs/provider";
import { createClient } from "@/lib/supabase/client";
import { cn, dayLabel, formatTime, istDayRange } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import type { ShellCounts } from "./app-shell";
import { LogoMark } from "./sidebar";

export function Topbar({ onMenu, onSearch, counts, profile }: { onMenu: () => void; onSearch: () => void; counts: ShellCounts; profile: Profile }) {
  const router = useRouter();
  const dialogs = useDialogs();
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/80 backdrop-blur-xl no-print">
      <div className="mx-auto flex h-14 max-w-[1360px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={onMenu} className="-ml-1 rounded-md p-1.5 text-ink-600 lg:hidden" aria-label="Open menu">
          <MenuIcon className="h-5 w-5" />
        </button>
        <Link href="/" className="lg:hidden">
          <LogoMark size={26} />
        </Link>

        <button
          onClick={onSearch}
          className="group hidden h-9 w-full max-w-md items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-[13px] text-ink-400 shadow-card transition-colors hover:border-line-strong sm:flex"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search candidates, jobs, clients…</span>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={onSearch} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-3 sm:hidden" aria-label="Search">
            <Search className="h-[18px] w-[18px]" />
          </button>

          <Menu
            width="w-60"
            trigger={({ toggle, open }) => (
              <button
                onClick={toggle}
                className={cn(
                  "mr-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-jade px-3 text-[13px] font-medium text-white shadow-sm shadow-jade/25 ring-1 ring-inset ring-white/10 transition hover:brightness-110",
                  open && "brightness-110"
                )}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon={<UserPlus className="h-4 w-4" />} onClick={() => (close(), router.push("/candidates/new"))}>
                  Candidate
                </MenuItem>
                <MenuItem icon={<Briefcase className="h-4 w-4" />} onClick={() => (close(), router.push("/jobs/new"))}>
                  Job opening
                </MenuItem>
                <MenuItem icon={<Building2 className="h-4 w-4" />} onClick={() => (close(), router.push("/clients/new"))}>
                  Client
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={<CalendarPlus className="h-4 w-4" />} onClick={() => (close(), dialogs.openInterview({}))}>
                  Schedule interview
                </MenuItem>
                <MenuItem icon={<CheckSquare className="h-4 w-4" />} onClick={() => (close(), dialogs.openTask({ assigned_to: profile.id }))}>
                  Task / follow-up
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={<FileUp className="h-4 w-4" />} onClick={() => (close(), router.push("/import"))}>
                  Import from Excel
                </MenuItem>
              </>
            )}
          </Menu>

          <Notifications count={counts.tasks + counts.interviews} userId={profile.id} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

type Notif = {
  tasks: { id: string; title: string; due_at: string | null; candidate_id: string | null }[];
  interviews: { id: string; scheduled_at: string; round_name: string; application: { candidate: { id: string; first_name: string; last_name: string | null }; job: { title: string } } }[];
};

function Notifications({ count, userId }: { count: number; userId: string }) {
  const [data, setData] = useState<Notif | null>(null);
  const load = async () => {
    const supabase = createClient();
    const { to } = istDayRange(1);
    const [t, i] = await Promise.all([
      supabase.from("tasks").select("id, title, due_at, candidate_id").eq("status", "Open").eq("assigned_to", userId).lt("due_at", to).order("due_at").limit(8),
      supabase
        .from("interviews")
        .select("id, scheduled_at, round_name, application:applications!inner(candidate:candidates!inner(id, first_name, last_name), job:jobs!inner(title))")
        .gte("scheduled_at", new Date(Date.now() - 2 * 3600e3).toISOString())
        .lt("scheduled_at", to)
        .eq("status", "Scheduled")
        .order("scheduled_at")
        .limit(8),
    ]);
    setData({ tasks: (t.data ?? []) as Notif["tasks"], interviews: (i.data ?? []) as unknown as Notif["interviews"] });
  };
  return (
    <Menu
      width="w-[340px]"
      trigger={({ toggle }) => (
        <button
          onClick={() => {
            toggle();
            load();
          }}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-surface-3 hover:text-ink-900"
          aria-label={`Notifications${count ? `: ${count}` : ""}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-saffron ring-2 ring-canvas" />}
        </button>
      )}
    >
      {(close) => (
        <div className="max-h-[70vh] overflow-y-auto">
          <p className="px-3 pb-1 pt-2.5 text-sm font-semibold text-ink-900">Today and tomorrow</p>
          {!data ? (
            <p className="px-3 py-6 text-center text-sm text-ink-400">Loading…</p>
          ) : data.tasks.length + data.interviews.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-400">All clear. Nothing pending.</p>
          ) : (
            <div className="pb-1">
              {data.interviews.map((iv) => (
                <Link
                  key={iv.id}
                  href={`/interviews`}
                  onClick={close}
                  className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-surface-3"
                >
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-ink-800">
                      {iv.application.candidate.first_name} {iv.application.candidate.last_name ?? ""} — {iv.round_name}
                    </p>
                    <p className="truncate text-xs text-ink-400">
                      {dayLabel(iv.scheduled_at)}, {formatTime(iv.scheduled_at)} · {iv.application.job.title}
                    </p>
                  </div>
                </Link>
              ))}
              {data.tasks.map((t) => {
                const overdue = t.due_at && new Date(t.due_at).getTime() < Date.now();
                return (
                  <Link key={t.id} href="/tasks" onClick={close} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-surface-3">
                    <CheckSquare className={cn("mt-0.5 h-4 w-4 shrink-0", overdue ? "text-red-500" : "text-jade")} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-ink-800">{t.title}</p>
                      <p className={cn("text-xs", overdue ? "text-red-600 dark:text-red-400" : "text-ink-400")}>
                        {t.due_at ? `${overdue ? "Overdue · " : ""}${dayLabel(t.due_at)}, ${formatTime(t.due_at)}` : "No due date"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-1 border-t border-line p-1">
            <Link href="/tasks" onClick={close} className="rounded-lg py-2 text-center text-xs font-medium text-ink-600 hover:bg-surface-3">
              All tasks
            </Link>
            <Link href="/interviews" onClick={close} className="rounded-lg py-2 text-center text-xs font-medium text-ink-600 hover:bg-surface-3">
              All interviews
            </Link>
          </div>
        </div>
      )}
    </Menu>
  );
}
