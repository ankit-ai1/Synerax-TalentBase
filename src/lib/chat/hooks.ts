"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { ChatConversation, ChatMessage, ChatParticipant } from "./types";

/* Live chat data over Supabase Realtime (free plan). RLS decides which rows each user receives. */

const uid = () => Math.random().toString(36).slice(2, 10);

function useDebounced(fn: () => void, ms: number) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => ref.current(), ms);
  }, [ms]);
}

/** Number of conversations with unread messages (header / sidebar badge) */
export function useChatUnread(initial = 0, enabled = true) {
  const [count, setCount] = useState(initial);
  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc("chat_unread_total");
    if (!error && typeof data === "number") setCount(data);
  }, []);
  const refresh = useDebounced(load, 500);

  useEffect(() => {
    if (!enabled) return;
    const sb = createClient();
    load();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const me = data.session?.user.id;
      channel = sb
        .channel(`chat-unread-${uid()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants", ...(me ? { filter: `user_id=eq.${me}` } : {}) }, refresh)
        .subscribe();
    });
    const onFocus = () => load();
    const onRead = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("chat:read", onRead);
    const t = setInterval(load, 90_000);
    return () => {
      cancelled = true;
      if (channel) sb.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("chat:read", onRead);
      clearInterval(t);
    };
  }, [enabled, load, refresh]);

  return count;
}

/** Conversation list (staff inbox / portal list) with live refresh */
export function useConversations(filter: { tab?: string; q?: string } = {}) {
  const [items, setItems] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(filter);

  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc("chat_list", { p: JSON.parse(key) });
    setLoading(false);
    if (error) return setError(error.message);
    setError(null);
    setItems((data ?? []) as ChatConversation[]);
  }, [key]);
  const refresh = useDebounced(load, 400);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`chat-list-${uid()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .subscribe();
    const onRead = () => refresh();
    window.addEventListener("chat:read", onRead);
    return () => {
      sb.removeChannel(channel);
      window.removeEventListener("chat:read", onRead);
    };
  }, [refresh]);

  return { items, loading, error, reload: load, setItems };
}

const PAGE = 40;
const sortAsc = (a: ChatMessage, b: ChatMessage) => a.created_at.localeCompare(b.created_at);

/** One conversation: messages (paged), live inserts/edits, read state, typing indicator */
export function useThread(conversationId: string | null, me: { id: string; name: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [typing, setTyping] = useState<Record<string, { name: string; at: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const typingChannel = useRef<RealtimeChannel | null>(null);
  const lastTypingSent = useRef(0);
  const names = useRef(new Map<string, string>());

  const merge = useCallback((incoming: ChatMessage[]) => {
    for (const m of incoming) if (m.sender_id) names.current.set(`${m.sender_id}:${m.sender_role}`, m.sender_name);
    setMessages((prev) => {
      const map = new Map(prev.filter((p) => !p.pending || !incoming.some((m) => m.sender_id === p.sender_id && m.body === p.body && m.kind === p.kind)).map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, { ...map.get(m.id), ...m, pending: false, failed: false });
      return [...map.values()].sort(sortAsc);
    });
  }, []);

  const loadParticipants = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await createClient().from("conversation_participants").select("conversation_id, user_id, role, last_read_at").eq("conversation_id", conversationId);
    setParticipants((data ?? []) as ChatParticipant[]);
  }, [conversationId]);

  // initial load
  useEffect(() => {
    setMessages([]);
    setParticipants([]);
    setTyping({});
    setError(null);
    if (!conversationId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await createClient().rpc("chat_messages", { p_conversation: conversationId, p_limit: PAGE });
      if (cancelled) return;
      setLoading(false);
      if (error) return setError(error.message);
      const list = (data ?? []) as ChatMessage[];
      setHasOlder(list.length >= PAGE);
      merge(list);
      loadParticipants();
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, merge, loadParticipants]);

  // realtime: new + edited messages, read receipts, typing
  useEffect(() => {
    if (!conversationId) return;
    const sb = createClient();
    const db = sb
      .channel(`chat-db-${conversationId}-${uid()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
        const row = payload.new as Omit<ChatMessage, "sender_name">;
        const known = row.sender_role === "bot" ? "Synerax assistant" : row.sender_id ? names.current.get(`${row.sender_id}:${row.sender_role}`) : undefined;
        if (known || row.sender_role === "system") {
          merge([{ ...row, sender_name: known ?? "Synerax" } as ChatMessage]);
        } else {
          const since = new Date(new Date(row.created_at).getTime() - 1000).toISOString();
          const { data } = await sb.rpc("chat_messages", { p_conversation: conversationId, p_after: since, p_limit: 20 });
          merge((data ?? []) as ChatMessage[]);
        }
        setTyping((t) => {
          if (!row.sender_id || !t[row.sender_id]) return t;
          const n = { ...t };
          delete n[row.sender_id];
          return n;
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const row = payload.new as ChatMessage;
        setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, body: row.body, edited_at: row.edited_at, deleted_at: row.deleted_at, attachment: row.attachment } : m)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants", filter: `conversation_id=eq.${conversationId}` }, () => loadParticipants())
      .subscribe();

    const live = sb.channel(`chat:${conversationId}`, { config: { private: true, broadcast: { self: false } } });
    live
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as { user_id?: string; name?: string };
        if (!p?.user_id || p.user_id === me.id) return;
        setTyping((t) => ({ ...t, [p.user_id!]: { name: p.name || "Someone", at: Date.now() } }));
      })
      .subscribe();
    typingChannel.current = live;

    const sweep = setInterval(() => {
      setTyping((t) => {
        const now = Date.now();
        const keys = Object.keys(t).filter((k) => now - t[k].at > 4000);
        if (!keys.length) return t;
        const n = { ...t };
        keys.forEach((k) => delete n[k]);
        return n;
      });
    }, 1000);

    return () => {
      clearInterval(sweep);
      sb.removeChannel(db);
      sb.removeChannel(live);
      typingChannel.current = null;
    };
  }, [conversationId, me.id, merge, loadParticipants]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || !messages.length) return;
    const oldest = messages.find((m) => !m.pending)?.created_at;
    const { data } = await createClient().rpc("chat_messages", { p_conversation: conversationId, p_before: oldest, p_limit: PAGE });
    const list = (data ?? []) as ChatMessage[];
    setHasOlder(list.length >= PAGE);
    merge(list);
  }, [conversationId, messages, merge]);

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    await createClient().rpc("chat_mark_read", { p_conversation: conversationId });
    window.dispatchEvent(new Event("chat:read"));
  }, [conversationId]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000 || !typingChannel.current) return;
    lastTypingSent.current = now;
    typingChannel.current.send({ type: "broadcast", event: "typing", payload: { user_id: me.id, name: me.name } });
  }, [me.id, me.name]);

  /** optimistic text send */
  const send = useCallback(
    async (body: string, role: ChatMessage["sender_role"]) => {
      if (!conversationId) return { error: "No conversation" };
      const temp: ChatMessage = {
        id: `tmp-${uid()}`,
        conversation_id: conversationId,
        sender_id: me.id,
        sender_role: role,
        sender_name: me.name,
        body,
        kind: "text",
        attachment: null,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        pending: true,
      };
      setMessages((p) => [...p, temp]);
      const { data, error } = await createClient().rpc("chat_send", { p_conversation: conversationId, p_body: body });
      if (error) {
        setMessages((p) => p.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)));
        return { error: error.message };
      }
      setMessages((p) => {
        if (p.some((m) => m.id === data)) return p.filter((m) => m.id !== temp.id);
        return p.map((m) => (m.id === temp.id ? { ...m, id: data as string, pending: false } : m));
      });
      return { id: data as string };
    },
    [conversationId, me.id, me.name]
  );

  const typingNames = useMemo(() => Object.values(typing).map((t) => t.name), [typing]);

  return { messages, setMessages, participants, loading, hasOlder, loadOlder, markRead, notifyTyping, typingNames, send, error, reloadParticipants: loadParticipants };
}
