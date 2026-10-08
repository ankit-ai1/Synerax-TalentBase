"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { notificationIconName as notificationIcon } from "./notification-icons";
import { createClient } from "@/lib/supabase/client";
import { Menu } from "@/components/ui/interactive";
import { istDayKey, relTime } from "@/components/portal-ui/kit";
import { cn } from "@/lib/utils";

export type Notification = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };


/** Header bell: unread count + latest notifications grouped Today / Earlier (own rows only — RLS) */
export function NotificationBell({ allHref }: { allHref: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data }, { count }] = await Promise.all([
      supabase.from("notifications").select("id, type, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    setItems((data ?? []) as Notification[]);
    setUnread(count ?? 0);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const markAll = async () => {
    await createClient().from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    load();
    router.refresh();
  };

  const open = async (n: Notification, close: () => void) => {
    close();
    if (!n.read_at) await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    load();
    if (n.link) router.push(n.link);
  };

  const today = istDayKey(new Date());
  const groups = [
    { label: "Today", list: items.filter((n) => istDayKey(n.created_at) === today) },
    { label: "Earlier", list: items.filter((n) => istDayKey(n.created_at) !== today) },
  ].filter((g) => g.list.length);

  return (
    <Menu
      align="end"
      width="w-[min(380px,calc(100vw-24px))]"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition hover:bg-surface-3 hover:text-ink-900"
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        >
          <Bell className="h-[19px] w-[19px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-saffron px-1 text-[10px] font-bold text-[rgb(var(--on-accent))] ring-2 ring-canvas">{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 pb-2 pt-3">
            <p className="text-[15px] font-semibold text-ink-900">
              Notifications {unread > 0 && <span className="ml-1 rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] font-semibold text-saffron-800">{unread} new</span>}
            </p>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium text-jade-700 hover:bg-jade-50">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center px-3 py-10 text-center">
              <BellOff className="h-7 w-7 text-ink-300" aria-hidden />
              <p className="mt-2 text-sm font-medium text-ink-700">You&apos;re all caught up</p>
              <p className="text-[12px] text-ink-400">New updates will show up here.</p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto px-1 pb-1">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">{g.label}</p>
                  <ul>
                    {g.list.map((n) => {
                      const Icon = notificationIcon(n.type);
                      return (
                        <li key={n.id}>
                          <button onClick={() => open(n, close)} className={cn("flex w-full gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-surface-3", !n.read_at && "bg-jade-50/40")}>
                            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", n.read_at ? "bg-surface-3 text-ink-500" : "bg-jade-50 text-jade-700")}>
                              <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start gap-2">
                                <span className="flex-1 text-[13px] font-medium leading-snug text-ink-900">{n.title}</span>
                                {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-saffron" aria-label="Unread" />}
                              </span>
                              {n.body && <span className="mt-0.5 line-clamp-2 block text-[12px] text-ink-500">{n.body}</span>}
                              <span className="mt-0.5 block text-[11px] text-ink-400" suppressHydrationWarning>
                                {relTime(n.created_at)}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-line p-1">
            <Link href={allHref} onClick={close} className="block rounded-lg px-3 py-2 text-center text-[13px] font-medium text-jade-700 hover:bg-surface-3">
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </Menu>
  );
}
