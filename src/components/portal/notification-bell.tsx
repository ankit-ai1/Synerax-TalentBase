"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Menu } from "@/components/ui/interactive";
import { cn, timeAgo } from "@/lib/utils";

export type Notification = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

/** Header bell: unread count + latest notifications (own rows only — RLS) */
export function NotificationBell({ allHref }: { allHref: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data }, { count }] = await Promise.all([
      supabase.from("notifications").select("id, type, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(8),
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
  };

  const open = async (n: Notification, close: () => void) => {
    close();
    if (!n.read_at) await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    load();
    if (n.link) router.push(n.link);
  };

  return (
    <Menu
      align="end"
      width="w-[340px]"
      trigger={({ toggle }) => (
        <button onClick={toggle} className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-600 hover:bg-surface-3 hover:text-ink-900" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-saffron px-1 text-[10px] font-bold text-[#3A2503]">{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
            <p className="text-sm font-semibold text-ink-900">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-[12px] font-medium text-jade-700 hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-400">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto p-1">
              {items.map((n) => (
                <li key={n.id}>
                  <button onClick={() => open(n, close)} className="flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface-3">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-saffron")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-ink-900">{n.title}</span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-[12px] text-ink-500">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-ink-400">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
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
