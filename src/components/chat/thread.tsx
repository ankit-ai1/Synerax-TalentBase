"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Bot, Check, CheckCheck, ChevronDown, FileText, Loader2, MessageSquareText, MoreHorizontal, Paperclip, Pencil, RotateCcw, SendHorizontal, Smile, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useThread } from "@/lib/chat/hooks";
import { isStaffRole, type ChatMessage, type ChatViewer, type SenderRole } from "@/lib/chat/types";
import { Menu, MenuItem } from "@/components/ui/interactive";
import { istDayKey, istTime } from "@/components/portal-ui/kit";
import { cn, fileSize, friendlyError } from "@/lib/utils";

const EMOJI = ["😀", "😊", "🙂", "😉", "😍", "🤝", "👍", "👏", "🙏", "🎉", "✅", "❌", "⏰", "📅", "📞", "📧", "📄", "💼", "💰", "🚀", "🔥", "⭐", "❤️", "🤔", "😅", "😂", "😢", "😮", "👌", "✌️", "💡", "📌"];

export type ChatTemplate = { id: string; name: string; body: string };

function dayLabel(d: string) {
  const key = istDayKey(d);
  const today = istDayKey(new Date());
  const yest = istDayKey(new Date(Date.now() - 864e5));
  if (key === today) return "Today";
  if (key === yest) return "Yesterday";
  return new Date(d).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

const fill = (body: string, vars: Record<string, string>) => body.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => vars[k] ?? m);

export function ChatThread({
  conversationId,
  me,
  viewer,
  canSend = true,
  cannotSendReason,
  templates,
  templateVars = {},
  header,
  emptyState,
  ensureConversation,
  placeholder = "Write a message…",
  className,
}: {
  conversationId: string | null;
  me: { id: string; name: string; role: SenderRole };
  viewer: ChatViewer;
  canSend?: boolean;
  cannotSendReason?: string;
  templates?: ChatTemplate[];
  templateVars?: Record<string, string>;
  header?: React.ReactNode;
  emptyState?: React.ReactNode;
  /** client portal: create the thread on the first message */
  ensureConversation?: () => Promise<string | null>;
  placeholder?: string;
  className?: string;
}) {
  const t = useThread(conversationId, { id: me.id, name: me.name });
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const prevHeight = useRef<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // read receipts: mark read when opened and whenever something new arrives while visible
  const lastIncoming = useMemo(() => {
    const mine = (m: ChatMessage) => m.sender_id === me.id;
    return [...t.messages].reverse().find((m) => !mine(m) && !m.pending)?.id;
  }, [t.messages, me.id]);
  const { markRead } = t;
  useEffect(() => {
    if (!conversationId) return;
    if (document.visibilityState === "visible") markRead();
    const onVis = () => document.visibilityState === "visible" && markRead();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [conversationId, lastIncoming, markRead]);

  // keep the view pinned to the bottom unless the user scrolled up; keep position when older messages load
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (prevHeight.current !== null) {
      el.scrollTop += el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
      return;
    }
    if (nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [t.messages, t.typingNames.length]);

  const onScroll = useCallback(async () => {
    const el = scroller.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 60 && t.hasOlder && !loadingOlder) {
      setLoadingOlder(true);
      prevHeight.current = el.scrollHeight;
      await t.loadOlder();
      setLoadingOlder(false);
    }
  }, [t, loadingOlder]);

  // "seen": the other side has read up to this message
  const otherReadAt = useMemo(() => {
    const others = t.participants.filter((p) => (viewer === "staff" ? !isStaffRole(p.role) : isStaffRole(p.role)) && p.user_id !== me.id);
    return others.reduce<string | null>((max, p) => (p.last_read_at && (!max || p.last_read_at > max) ? p.last_read_at : max), null);
  }, [t.participants, viewer, me.id]);

  const visible = t.messages;
  const groups = useMemo(() => groupMessages(visible), [visible]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {header}
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite" aria-label="Messages">
        {t.hasOlder && (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              onClick={async () => {
                prevHeight.current = scroller.current?.scrollHeight ?? null;
                setLoadingOlder(true);
                await t.loadOlder();
                setLoadingOlder(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-ink-500 hover:text-ink-800"
            >
              {loadingOlder && <Loader2 className="h-3 w-3 animate-spin" />} Load older messages
            </button>
          </div>
        )}
        {t.loading && !visible.length ? (
          <div className="flex h-full items-center justify-center text-ink-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading messages" />
          </div>
        ) : !visible.length ? (
          <div className="flex h-full items-center justify-center">{emptyState ?? <DefaultEmpty />}</div>
        ) : (
          groups.map((g, gi) => (
            <Fragment key={g.key}>
              {g.day && (
                <div className="my-4 flex items-center gap-3 text-[11.5px] font-medium text-ink-400" role="separator">
                  <span className="h-px flex-1 bg-line" />
                  {g.day}
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              {g.kind === "bot" ? (
                <BotGroup messages={g.messages} defaultOpen={viewer !== "staff" && gi === groups.length - 1} />
              ) : g.kind === "system" ? (
                g.messages.map((m) => <SystemLine key={m.id} m={m} viewer={viewer} />)
              ) : (
                g.messages.map((m, i) => (
                  <Bubble
                    key={m.id}
                    m={m}
                    mine={m.sender_id === me.id}
                    showName={i === 0 && m.sender_id !== me.id}
                    seen={!!(m.sender_id === me.id && otherReadAt && otherReadAt >= m.created_at)}
                    onRetry={() => {
                      t.setMessages((p) => p.filter((x) => x.id !== m.id));
                      t.send(m.body, me.role);
                    }}
                    onEdit={async (body) => {
                      const { error } = await createClient().rpc("chat_edit_message", { p_message: m.id, p_body: body });
                      if (error) toast.error(friendlyError(error.message));
                    }}
                    onDelete={async () => {
                      const { error } = await createClient().rpc("chat_delete_message", { p_message: m.id });
                      if (error) toast.error(friendlyError(error.message));
                    }}
                  />
                ))
              )}
            </Fragment>
          ))
        )}
        {t.typingNames.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-500" data-testid="typing">
            <span className="inline-flex gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" />
            </span>
            {t.typingNames.slice(0, 2).join(", ")} {t.typingNames.length > 1 ? "are" : "is"} typing…
          </div>
        )}
      </div>
      {canSend ? (
        <Composer
          conversationId={conversationId}
          placeholder={placeholder}
          templates={templates}
          templateVars={templateVars}
          onTyping={t.notifyTyping}
          onSend={async (body) => {
            nearBottom.current = true;
            if (!conversationId && ensureConversation) {
              const id = await ensureConversation();
              if (!id) return false;
              const { error } = await createClient().rpc("chat_send", { p_conversation: id, p_body: body });
              if (error) {
                toast.error(friendlyError(error.message));
                return false;
              }
              return true;
            }
            const r = await t.send(body, me.role);
            if (r.error) toast.error(friendlyError(r.error));
            return !r.error;
          }}
          ensureConversation={ensureConversation}
        />
      ) : (
        <p className="border-t border-line bg-surface-2 px-4 py-3 text-center text-[13px] text-ink-500">{cannotSendReason ?? "You can't reply in this conversation."}</p>
      )}
    </div>
  );
}

type Group = { key: string; day: string | null; kind: "text" | "bot" | "system"; messages: ChatMessage[] };

/** split into runs: same day, same kind, same sender (text) — bot exchanges collapse into one block */
function groupMessages(list: ChatMessage[]): Group[] {
  const out: Group[] = [];
  let lastDay = "";
  for (const m of list) {
    const day = istDayKey(m.created_at);
    const newDay = day !== lastDay;
    lastDay = day;
    const kind = m.kind;
    const prev = out[out.length - 1];
    const sameRun =
      !newDay &&
      prev &&
      prev.kind === kind &&
      (kind === "bot" || kind === "system" || (prev.messages[prev.messages.length - 1].sender_id === m.sender_id &&
        new Date(m.created_at).getTime() - new Date(prev.messages[prev.messages.length - 1].created_at).getTime() < 5 * 60e3));
    if (sameRun) prev.messages.push(m);
    else out.push({ key: m.id, day: newDay ? dayLabel(m.created_at) : null, kind, messages: [m] });
  }
  return out;
}

function DefaultEmpty() {
  return (
    <div className="text-center">
      <MessageSquareText className="mx-auto h-8 w-8 text-ink-300" aria-hidden />
      <p className="mt-2 text-sm font-medium text-ink-700">No messages yet</p>
      <p className="text-[12.5px] text-ink-400">Say hello — messages appear here instantly.</p>
    </div>
  );
}

function SystemLine({ m, viewer }: { m: ChatMessage; viewer: ChatViewer }) {
  const [open, setOpen] = useState(false);
  const [first, ...rest] = m.body.split("\n");
  const more = rest.join("\n").trim();
  return (
    <div className="my-3 flex flex-col items-center">
      <p className="rounded-full bg-surface-3 px-3 py-1 text-center text-[12px] text-ink-600">
        {viewer === "staff" && !isStaffRole(m.sender_role) && <span className="font-medium text-ink-800">{m.sender_name}: </span>}
        {first} · <span className="text-ink-400">{istTime(m.created_at)}</span>
      </p>
      {more && (
        <>
          <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-[11.5px] font-medium text-jade-700 hover:underline">
            {open ? "Hide details" : "Show details"}
          </button>
          {open && <pre className="mt-1 max-w-[560px] whitespace-pre-wrap rounded-xl border border-line bg-surface p-3 text-[12px] leading-relaxed text-ink-600">{more}</pre>}
        </>
      )}
    </div>
  );
}

function BotGroup({ messages, defaultOpen }: { messages: ChatMessage[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="my-3 rounded-2xl border border-dashed border-line bg-surface-2/60">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-ink-600" aria-expanded={open}>
        <Bot className="h-4 w-4 text-jade-700" aria-hidden />
        <span className="flex-1">
          Chatbot conversation · {messages.length} message{messages.length === 1 ? "" : "s"} · <span className="text-ink-400">{istTime(messages[0].created_at)}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-line px-3 py-2.5">
          {messages.map((m) => (
            <p key={m.id} className={cn("text-[12.5px] leading-relaxed", m.sender_role === "bot" ? "text-ink-500" : "font-medium text-ink-800")}>
              <span className="mr-1.5 text-[11px] uppercase tracking-wide text-ink-400">{m.sender_role === "bot" ? "Bot" : m.sender_name.split(" ")[0]}</span>
              <span className="whitespace-pre-wrap">{m.body}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Bubble({
  m,
  mine,
  showName,
  seen,
  onRetry,
  onEdit,
  onDelete,
}: {
  m: ChatMessage;
  mine: boolean;
  showName: boolean;
  seen: boolean;
  onRetry: () => void;
  onEdit: (body: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body);
  const deleted = !!m.deleted_at;
  return (
    <div className={cn("group mt-1 flex", mine ? "justify-end" : "justify-start")} data-testid="message">
      <div className={cn("flex max-w-[85%] flex-col sm:max-w-[72%]", mine ? "items-end" : "items-start")}>
        {showName && <span className="mb-0.5 mt-2 px-1 text-[11.5px] font-medium text-ink-500">{m.sender_name}</span>}
        <div className="flex items-end gap-1">
          {mine && !deleted && !m.pending && !m.failed && m.kind === "text" && (
            <Menu
              align="end"
              width="w-36"
              trigger={({ toggle }) => (
                <button type="button" onClick={toggle} className="mb-1 rounded p-1 text-ink-300 opacity-0 transition hover:text-ink-700 focus:opacity-100 group-hover:opacity-100" aria-label="Message options">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              )}
            >
              {(close) => (
                <div>
                  {m.body && (
                    <MenuItem icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => (close(), setDraft(m.body), setEditing(true))}>
                      Edit
                    </MenuItem>
                  )}
                  <MenuItem icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => (close(), onDelete())}>
                    Delete
                  </MenuItem>
                </div>
              )}
            </Menu>
          )}
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed shadow-sm",
              mine ? "rounded-br-md bg-jade text-white" : "rounded-bl-md border border-line bg-surface text-ink-900",
              deleted && "border border-dashed border-line bg-transparent text-ink-400 shadow-none",
              m.failed && "ring-2 ring-red-400"
            )}
          >
            {deleted ? (
              <span className="italic">Message deleted</span>
            ) : editing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.trim() && draft.trim() !== m.body) onEdit(draft.trim());
                  setEditing(false);
                }}
                className="flex min-w-[220px] flex-col gap-2"
              >
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="w-full rounded-lg bg-white/95 p-2 text-[13.5px] text-ink-900 outline-none" autoFocus />
                <span className="flex justify-end gap-2 text-[12px]">
                  <button type="button" onClick={() => setEditing(false)} className="rounded px-2 py-1 hover:bg-white/15">
                    Cancel
                  </button>
                  <button type="submit" className="rounded bg-white/20 px-2 py-1 font-semibold hover:bg-white/30">
                    Save
                  </button>
                </span>
              </form>
            ) : (
              <>
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                {m.attachment && (
                  <a
                    href={`/api/chat/attachments/${m.id}`}
                    target="_blank"
                    rel="noopener"
                    className={cn("mt-1 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px]", mine ? "bg-white/15 hover:bg-white/25" : "bg-surface-2 hover:bg-surface-3")}
                  >
                    <FileText className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{m.attachment.name}</span>
                      <span className={cn("block text-[11.5px]", mine ? "text-white/75" : "text-ink-400")}>{fileSize(m.attachment.size)}</span>
                    </span>
                  </a>
                )}
              </>
            )}
          </div>
        </div>
        <span className="mt-0.5 flex items-center gap-1 px-1 text-[10.5px] text-ink-400">
          {istTime(m.created_at)}
          {m.edited_at && !deleted && " · edited"}
          {mine && !deleted &&
            (m.pending ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-label="Sending" />
            ) : m.failed ? (
              <button type="button" onClick={onRetry} className="inline-flex items-center gap-0.5 font-medium text-red-600">
                <RotateCcw className="h-3 w-3" /> Not sent · Retry
              </button>
            ) : seen ? (
              <CheckCheck className="h-3.5 w-3.5 text-jade" aria-label="Seen" data-testid="seen" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-label="Sent" />
            ))}
        </span>
      </div>
    </div>
  );
}

function Composer({
  conversationId,
  placeholder,
  templates,
  templateVars,
  onTyping,
  onSend,
  ensureConversation,
}: {
  conversationId: string | null;
  placeholder: string;
  templates?: ChatTemplate[];
  templateVars: Record<string, string>;
  onTyping: () => void;
  onSend: (body: string) => Promise<boolean>;
  ensureConversation?: () => Promise<string | null>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const insert = (s: string) => {
    const el = area.current;
    if (!el) return setText((t) => t + s);
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + s + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + s.length;
    });
  };

  const submit = async () => {
    const body = text.trim();
    if ((!body && !file) || busy) return;
    setBusy(true);
    try {
      if (file) {
        let id = conversationId;
        if (!id && ensureConversation) id = await ensureConversation();
        if (!id) return;
        const fd = new FormData();
        fd.set("conversation_id", id);
        fd.set("file", file);
        if (body) fd.set("body", body);
        const res = await fetch("/api/chat/attachments", { method: "POST", body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(json.error ?? "Couldn't send the file");
          return;
        }
        setFile(null);
        setText("");
        return;
      }
      setText("");
      const ok = await onSend(body);
      if (!ok) setText(body);
    } finally {
      setBusy(false);
      area.current?.focus();
    }
  };

  return (
    <div className="border-t border-line bg-surface px-3 py-2.5 sm:px-4">
      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px]">
          <Paperclip className="h-4 w-4 text-ink-400" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <span className="text-[11.5px] text-ink-400">{fileSize(file.size)}</span>
          <button type="button" onClick={() => setFile(null)} className="rounded p-0.5 text-ink-400 hover:text-red-600" aria-label="Remove attachment">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          data-testid="chat-file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt,.xls,.xlsx,.csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (f.size > 4 * 1024 * 1024) return toast.error("File is larger than 4 MB");
            setFile(f);
          }}
        />
        <button type="button" onClick={() => fileRef.current?.click()} className="mb-0.5 rounded-lg p-2 text-ink-500 hover:bg-surface-3 hover:text-ink-800" aria-label="Attach a file">
          <Paperclip className="h-[18px] w-[18px]" />
        </button>
        <Menu
          side="top"
          width="w-64"
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} className="mb-0.5 rounded-lg p-2 text-ink-500 hover:bg-surface-3 hover:text-ink-800" aria-label="Insert emoji">
              <Smile className="h-[18px] w-[18px]" />
            </button>
          )}
        >
          {(close) => (
            <div className="grid grid-cols-8 gap-0.5 p-1.5">
              {EMOJI.map((e) => (
                <button key={e} type="button" onClick={() => (insert(e), close())} className="rounded-md p-1 text-[19px] leading-none hover:bg-surface-3" aria-label={`Insert ${e}`}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </Menu>
        {templates && templates.length > 0 && (
          <Menu
            side="top"
            width="w-72"
            trigger={({ toggle }) => (
              <button type="button" onClick={toggle} className="mb-0.5 rounded-lg p-2 text-ink-500 hover:bg-surface-3 hover:text-ink-800" aria-label="Quick replies">
                <MessageSquareText className="h-[18px] w-[18px]" />
              </button>
            )}
          >
            {(close) => (
              <div className="max-h-72 overflow-y-auto">
                <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Quick replies</p>
                {templates.map((tp) => (
                  <button
                    key={tp.id}
                    type="button"
                    onClick={() => {
                      close();
                      setText(fill(tp.body, templateVars));
                      requestAnimationFrame(() => area.current?.focus());
                    }}
                    className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-surface-3"
                  >
                    <span className="block text-[13px] font-medium text-ink-800">{tp.name}</span>
                    <span className="line-clamp-2 block text-[12px] text-ink-500">{fill(tp.body, templateVars)}</span>
                  </button>
                ))}
              </div>
            )}
          </Menu>
        )}
        <label className="sr-only" htmlFor="chat-composer">
          Message
        </label>
        <textarea
          id="chat-composer"
          ref={area}
          value={text}
          rows={1}
          maxLength={5000}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value) onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-40 min-h-[40px] flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-[14px] leading-relaxed text-ink-900 outline-none transition focus:border-jade/60 focus:bg-surface focus:ring-2 focus:ring-jade/15"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || (!text.trim() && !file)}
          className="mb-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-jade text-white transition hover:bg-[rgb(var(--jade-hover))] disabled:opacity-40"
          aria-label="Send message"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-1 hidden px-1 text-[11px] text-ink-400 sm:block">Enter to send · Shift + Enter for a new line · files up to 4 MB</p>
    </div>
  );
}
