"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLACE } from "./launcher-place";

const loadFull = () => import("./launcher-full");

/** the exact button the full chat renders — shown immediately, and while the chat code is loading */
function LauncherButton({ placement, open, onClick, onIntent }: { placement: keyof typeof PLACE; open: boolean; onClick?: () => void; onIntent?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      className={cn(
        "fixed right-4 z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full bg-jade text-white shadow-[0_12px_32px_-8px_rgb(var(--jade)/0.7)] transition hover:scale-105 hover:bg-[rgb(var(--jade-hover))] sm:right-5",
        PLACE[placement].button
      )}
      aria-label={open ? "Close chat" : "Open chat with the Synerax assistant"}
      aria-expanded={open}
      data-testid="chat-launcher"
    >
      {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
    </button>
  );
}

/**
 * Floating assistant. The button renders right away; the chat window and the assistant code load in their
 * own chunk on the first click (prefetched when the browser is idle or on hover, so it opens just as fast).
 */
export function ChatLauncher({ placement = "portal" }: { placement?: keyof typeof PLACE }) {
  const path = usePathname();
  const [active, setActive] = useState(false);

  // warm the chunk once the page is idle (no work on the critical path)
  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const h = idle ? idle(() => loadFull(), { timeout: 8000 }) : window.setTimeout(() => loadFull(), 4000);
    return () => {
      if (!idle) clearTimeout(h as number);
    };
  }, []);

  // staff: not on the Messages page (the inbox needs the space)
  if (placement === "staff" && (path === "/messages" || path.startsWith("/messages/"))) return null;
  if (active) return <Full placement={placement} />;
  return <LauncherButton placement={placement} open={false} onClick={() => setActive(true)} onIntent={() => loadFull()} />;
}

const FullChat = dynamic(() => loadFull().then((m) => m.ChatLauncherFull), {
  ssr: false,
  // keep showing the (now "open") button while the chunk arrives
  loading: () => <LoadingButton />,
});
let loadingPlacement: keyof typeof PLACE = "portal";
function LoadingButton() {
  return <LauncherButton placement={loadingPlacement} open />;
}
function Full({ placement }: { placement: keyof typeof PLACE }) {
  loadingPlacement = placement;
  return <FullChat placement={placement} initialOpen />;
}
