"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, friendlyError } from "@/lib/utils";

/** Staff: "Message candidate" / "Message client" — opens (or creates) the conversation in the inbox */
export function MessageButton({
  kind,
  id,
  label,
  variant = "secondary",
  className,
  iconOnly,
}: {
  kind: "candidate" | "client";
  id: string;
  label?: string;
  variant?: "secondary" | "soft" | "ghost";
  className?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const text = label ?? (kind === "candidate" ? "Message" : "Message client");

  const go = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    const { data, error } = await createClient().rpc(kind === "candidate" ? "chat_start_candidate" : "chat_start_client", kind === "candidate" ? { p_candidate: id } : { p_client: id });
    setBusy(false);
    if (error || !data) return toast.error(friendlyError(error?.message));
    router.push(`/messages?c=${data}`);
  };

  return (
    <button
      type="button"
      onClick={go}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={busy}
      title={iconOnly ? text : undefined}
      aria-label={iconOnly ? text : undefined}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-colors disabled:opacity-60",
        iconOnly ? "h-7 w-7" : "h-8 px-3",
        variant === "secondary" && "border border-line bg-surface text-ink-800 shadow-card hover:bg-surface-2",
        variant === "soft" && "bg-jade-50 text-jade-700 hover:bg-jade-100",
        variant === "ghost" && "text-ink-500 hover:bg-surface-3 hover:text-ink-800",
        className
      )}
      data-testid={`message-${kind}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessagesSquare className="h-3.5 w-3.5" />}
      {!iconOnly && text}
    </button>
  );
}
