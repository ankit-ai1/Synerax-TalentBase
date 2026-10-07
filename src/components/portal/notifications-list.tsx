"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellOff, CheckCheck, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "./notification-bell";
import { notificationIconName } from "./notification-icons";
import { EmptyState, istDate, istDateTime, istDayKey, relTime } from "@/components/portal-ui/kit";
import { cn } from "@/lib/utils";

const PAGE = 30;

/** Full notifications list grouped by day (own rows only — RLS) with mark-as-read */
export function NotificationsList() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    const { data } = await createClient()
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE);
    const rows = (data ?? []) as Notification[];
    setMore(rows.length > PAGE);
    setItems((prev) => (offset === 0 ? rows.slice(0, PAGE) : [...(prev ?? []), ...rows.slice(0, PAGE)]));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    await createClient().from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    setItems((prev) => prev?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? null);
  };
  const markOne = async (n: Notification) => {
    if (n.read_at) return;
    await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) ?? null);
  };

  if (items === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="portal-card flex gap-3 p-4">
            <div className="skeleton h-10 w-10" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const unread = items.filter((n) => !n.read_at).length;
  const today = istDayKey(new Date());
  const yesterday = istDayKey(new Date(Date.now() - 864e5));
  const groups: { label: string; list: Notification[] }[] = [];
  for (const n of items) {
    const k = istDayKey(n.created_at);
    const label = k === today ? "Today" : k === yesterday ? "Yesterday" : istDate(n.created_at, { weekday: "long", day: "numeric", month: "short" });
    const g = groups.find((x) => x.label === label);
    if (g) g.list.push(n);
    else groups.push({ label, list: [n] });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500">{unread ? `${unread} unread` : "All caught up"}</p>
        {unread > 0 && (
          <button onClick={markAll} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-jade-700 hover:bg-jade-50">
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={BellOff} title="No notifications yet" text="Updates about your jobs, profiles and interviews will appear here." />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{g.label}</h2>
              <ul className="portal-card divide-y divide-line overflow-hidden">
                {g.list.map((n) => {
                  const Icon = notificationIconName(n.type);
                  const body = (
                    <>
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", n.read_at ? "bg-surface-3 text-ink-500" : "bg-jade-50 text-jade-700")}>
                        <Icon className="h-[18px] w-[18px]" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className={cn("flex-1 text-[14px] leading-snug", n.read_at ? "text-ink-700" : "font-semibold text-ink-900")}>{n.title}</span>
                          {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-saffron" aria-label="Unread" />}
                        </span>
                        {n.body && <span className="mt-0.5 block text-[13px] text-ink-500">{n.body}</span>}
                        <span className="mt-1 block text-[11.5px] text-ink-400" title={istDateTime(n.created_at)} suppressHydrationWarning>
                          {relTime(n.created_at)}
                        </span>
                      </span>
                      {n.link && <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-ink-300" aria-hidden />}
                    </>
                  );
                  return (
                    <li key={n.id} className={cn(!n.read_at && "bg-jade-50/30")}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => markOne(n)} className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2">
                          {body}
                        </Link>
                      ) : (
                        <button onClick={() => markOne(n)} className="flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2">
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {more && (
            <div className="text-center">
              <button onClick={() => load(items.length)} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-[13.5px] font-medium text-ink-700 hover:border-line-strong">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
