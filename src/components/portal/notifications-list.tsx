"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "./notification-bell";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";

const PAGE = 30;

/** Full notifications list (own rows only — RLS) with mark-as-read */
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
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-3" />
        ))}
      </div>
    );
  }

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500">{unread ? `${unread} unread` : "All caught up"}</p>
        {unread > 0 && (
          <button onClick={markAll} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-jade-700 hover:underline">
            <CheckCheck className="h-4 w-4" aria-hidden /> Mark all as read
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line-strong p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-ink-300" aria-hidden />
          <p className="mt-3 text-[15px] font-medium text-ink-800">No notifications yet</p>
          <p className="mt-1 text-sm text-ink-500">We&apos;ll let you know about every important update here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          {items.map((n) => {
            const inner = (
              <div className="flex gap-3 px-5 py-4">
                <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.read_at ? "bg-transparent ring-1 ring-line-strong" : "bg-saffron")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[14.5px]", n.read_at ? "text-ink-700" : "font-semibold text-ink-900")}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-[13.5px] text-ink-500">{n.body}</p>}
                  <p className="mt-1 text-[12px] text-ink-400" title={formatDateTime(n.created_at)}>
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={n.id} className="transition-colors hover:bg-surface-2">
                {n.link ? (
                  <Link href={n.link} onClick={() => markOne(n)} className="block">
                    {inner}
                  </Link>
                ) : (
                  <button onClick={() => markOne(n)} className="block w-full text-left">
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {more && (
        <div className="mt-4 flex justify-center">
          <button onClick={() => load(items.length)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Load more
          </button>
        </div>
      )}
    </div>
  );
}
