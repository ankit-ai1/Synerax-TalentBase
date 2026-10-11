"use client";

import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { useChatUnread } from "@/lib/chat/hooks";

/** Portal header: messages icon with a live unread badge */
export function MessagesIcon({ href }: { href: string }) {
  const unread = useChatUnread(0);
  return (
    <Link
      href={href}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition hover:bg-surface-3 hover:text-ink-900"
      aria-label={`Messages${unread ? ` (${unread} unread)` : ""}`}
      data-testid="messages-icon"
    >
      <MessagesSquare className="h-[19px] w-[19px]" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-saffron px-1 text-[10px] font-bold text-[rgb(var(--on-accent))] ring-2 ring-canvas" data-testid="messages-badge">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
