"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConversations } from "@/lib/chat/hooks";
import { ChatThread } from "./thread";
import { BrandMark } from "@/components/brand-logo";
import { friendlyError } from "@/lib/utils";

/**
 * Candidate / client "Messages" page.
 * Candidates only see threads Synerax started (they can never start one).
 * Clients have one thread per company with Synerax — created on their first message.
 */
export function MemberMessages({ viewer, me }: { viewer: "candidate" | "client"; me: { id: string; name: string } }) {
  const router = useRouter();
  const { items, loading } = useConversations({});
  const [created, setCreated] = useState<string | null>(null);
  const thread = items[0] ?? null;
  const conversationId = thread?.id ?? created;

  const ensure = useCallback(async () => {
    const { data, error } = await createClient().rpc("chat_my_thread", { p_create: true });
    if (error || !data) {
      toast.error(friendlyError(error?.message));
      return null;
    }
    setCreated(data as string);
    router.replace(`/client/messages?c=${data}`, { scroll: false });
    return data as string;
  }, [router]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink-900">Messages</h1>
        <p className="text-[14px] text-ink-500">
          {viewer === "client" ? "Your direct line to the Synerax team — one shared thread for everyone at your company." : "Messages from your Synerax recruiter."}
        </p>
      </div>
      <div className="portal-card flex h-[calc(100dvh-260px)] min-h-[440px] flex-col overflow-hidden md:h-[calc(100dvh-220px)]" data-testid="member-thread">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-ink-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" />
          </div>
        ) : !conversationId && viewer === "candidate" ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <MessagesSquare className="h-10 w-10 text-ink-300" aria-hidden />
            <p className="mt-3 text-[15px] font-medium text-ink-800">No messages yet</p>
            <p className="max-w-sm text-[13px] text-ink-500">When your recruiter messages you, the conversation appears here. Need help now? Open the assistant (bottom-right) and request a call back.</p>
          </div>
        ) : (
          <ChatThread
            key={conversationId ?? "new"}
            className="h-full"
            conversationId={conversationId}
            me={{ id: me.id, name: me.name, role: viewer }}
            viewer={viewer}
            ensureConversation={viewer === "client" ? ensure : undefined}
            placeholder="Write to the Synerax team…"
            header={
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <BrandMark size={34} />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ink-900">Synerax</p>
                  <p className="truncate text-[12px] text-ink-500">{thread?.subtitle ?? "Your Synerax team"} · usually replies within a few hours</p>
                </div>
                {thread?.status === "closed" && <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-ink-500">Closed — reply to reopen</span>}
              </div>
            }
            emptyState={
              <div className="text-center">
                <MessagesSquare className="mx-auto h-8 w-8 text-ink-300" aria-hidden />
                <p className="mt-2 text-sm font-medium text-ink-700">Start a conversation</p>
                <p className="text-[12.5px] text-ink-400">Ask about a role, a profile or anything else — the Synerax team replies here.</p>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
