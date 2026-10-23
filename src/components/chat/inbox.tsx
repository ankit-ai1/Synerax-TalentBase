"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Inbox as InboxIcon,
  Loader2,
  MapPin,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Search,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConversations } from "@/lib/chat/hooks";
import type { ChatConversation, SenderRole } from "@/lib/chat/types";
import { ChatThread, type ChatTemplate } from "./thread";
import { Menu, MenuDivider, MenuItem } from "@/components/ui/interactive";
import { Avatar, StageBadge } from "@/components/ui/misc";
import { relTime } from "@/components/portal-ui/kit";
import { cn, friendlyError } from "@/lib/utils";
import { ctcLabel } from "@/lib/money";

/* eslint-disable @typescript-eslint/no-explicit-any */

const TABS = [
  { id: "all", label: "All" },
  { id: "clients", label: "Clients" },
  { id: "candidates", label: "Candidates" },
  { id: "unassigned", label: "Unassigned" },
] as const;

export function StaffInbox({
  me,
  staff,
  templates,
}: {
  me: { id: string; name: string; role: "admin" | "hr" };
  staff: { id: string; name: string }[];
  templates: ChatTemplate[];
}) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [showContext, setShowContext] = useState(true);
  const selected = params.get("c");
  const { items, loading, error, reload } = useConversations({ tab, q: query });

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // a conversation opened from elsewhere may not be in the current tab — load it on its own
  const [extra, setExtra] = useState<ChatConversation | null>(null);
  const current = useMemo(() => items.find((c) => c.id === selected) ?? (extra?.id === selected ? extra : null), [items, selected, extra]);
  useEffect(() => {
    if (!selected || loading || items.some((c) => c.id === selected)) return;
    createClient()
      .rpc("chat_list", { p: { tab: "all", limit: 200 } })
      .then(({ data }) => setExtra(((data ?? []) as ChatConversation[]).find((c) => c.id === selected) ?? null));
  }, [selected, loading, items]);

  const open = (id: string | null) => {
    const sp = new URLSearchParams(params.toString());
    if (id) sp.set("c", id);
    else sp.delete("c");
    router.replace(`${path}${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
  };

  const update = async (patch: Record<string, unknown>) => {
    if (!current) return;
    const { error } = await createClient().rpc("chat_update_conversation", { p_conversation: current.id, p: patch });
    if (error) return toast.error(friendlyError(error.message));
    reload();
    if (extra) setExtra({ ...extra, ...(patch as Partial<ChatConversation>) });
  };

  const firstName = (current?.title ?? "").split(" ")[0];
  const vars = { first_name: firstName, candidate_name: current?.title ?? "", company: current?.type === "client" ? current?.title ?? "" : "", my_name: me.name, client_name: current?.title ?? "" };

  return (
    <div className="-mx-4 -mb-16 -mt-6 flex h-[calc(100dvh-56px)] border-t border-line bg-surface sm:-mx-6 lg:-mx-8 lg:-mt-7" data-testid="staff-inbox">
      {/* list */}
      <aside className={cn("flex w-full shrink-0 flex-col border-r border-line md:w-[320px] xl:w-[340px]", selected && "hidden md:flex")} aria-label="Conversations">
        <div className="space-y-2.5 border-b border-line p-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[17px] font-semibold text-ink-900">Messages</h1>
          </div>
          <label className="relative block">
            <span className="sr-only">Search conversations</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, message…" className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-8 pr-3 text-[13px] outline-none focus:border-jade/60 focus:bg-surface" />
          </label>
          <div className="flex gap-1 rounded-lg bg-surface-3 p-0.5" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn("flex-1 rounded-md px-1.5 py-1 text-[12px] font-medium transition", tab === t.id ? "bg-surface text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800")}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10 text-ink-400">
              <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" />
            </div>
          ) : error ? (
            <p className="p-4 text-[13px] text-red-600">{friendlyError(error)}</p>
          ) : !items.length ? (
            <div className="px-6 py-14 text-center">
              <InboxIcon className="mx-auto h-8 w-8 text-ink-300" aria-hidden />
              <p className="mt-2 text-sm font-medium text-ink-700">No conversations</p>
              <p className="text-[12.5px] text-ink-400">Use “Message candidate” or “Message client” on a profile to start one.</p>
            </div>
          ) : (
            <ul>
              {items.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => open(c.id)}
                    className={cn("flex w-full gap-3 border-b border-line/70 px-3 py-3 text-left transition-colors hover:bg-surface-2", selected === c.id && "bg-jade-50/60 hover:bg-jade-50/60")}
                    data-testid="conversation"
                  >
                    <span className="relative">
                      {c.type === "client" ? (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron-50 text-saffron-800">
                          <Building2 className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                      ) : (
                        <Avatar name={c.title} size="md" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={cn("flex-1 truncate text-[13.5px]", c.unread ? "font-semibold text-ink-900" : "font-medium text-ink-800")}>{c.title}</span>
                        {c.last_message_at && (
                          <span className={cn("shrink-0 text-[11px]", c.unread ? "font-semibold text-jade-700" : "text-ink-400")} suppressHydrationWarning>
                            {relTime(c.last_message_at)}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={cn("flex-1 truncate text-[12.5px]", c.unread ? "text-ink-800" : "text-ink-500")}>
                          {c.last_message_preview ? `${c.last_sender_role === "admin" || c.last_sender_role === "hr" ? "You: " : ""}${c.last_message_preview}` : "No messages yet"}
                        </span>
                        {c.unread > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-saffron px-1.5 text-[10.5px] font-bold text-[rgb(var(--on-accent))]" aria-label={`${c.unread} unread`}>
                            {c.unread > 9 ? "9+" : c.unread}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-400">
                        <span className={cn("rounded px-1 py-px font-medium", c.type === "client" ? "bg-saffron-50 text-saffron-800" : "bg-jade-50 text-jade-700")}>{c.type === "client" ? "Client" : "Candidate"}</span>
                        {c.status === "closed" && <span className="rounded bg-surface-3 px-1 py-px font-medium text-ink-500">Closed</span>}
                        <span className="truncate">{c.assigned_name ? `· ${c.assigned_name}` : "· Unassigned"}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* thread */}
      <section className={cn("min-w-0 flex-1 flex-col", selected ? "flex" : "hidden md:flex")} aria-label="Conversation">
        {selected && current ? (
          <ChatThread
            key={current.id}
            className="h-full"
            conversationId={current.id}
            me={{ id: me.id, name: me.name, role: me.role as SenderRole }}
            viewer="staff"
            canSend={current.can_send}
            cannotSendReason="Only admins can message candidates. An admin can allow HR in Admin → Chatbot & chat."
            templates={templates}
            templateVars={vars}
            header={
              <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
                <button onClick={() => open(null)} className="-ml-1 rounded-md p-1.5 text-ink-500 hover:bg-surface-3 md:hidden" aria-label="Back to conversations">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink-900">{current.title}</p>
                  <p className="truncate text-[12px] text-ink-500">
                    {current.type === "client" ? "Client company" : "Candidate"}
                    {current.subtitle ? ` · ${current.subtitle}` : ""}
                  </p>
                </div>
                <Menu
                  align="end"
                  width="w-60"
                  trigger={({ toggle }) => (
                    <button onClick={toggle} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] font-medium text-ink-700 hover:bg-surface-2" disabled={!current.can_send}>
                      <UserRoundCheck className="h-3.5 w-3.5" /> <span className="hidden max-w-[120px] truncate sm:inline">{current.assigned_name ?? "Assign"}</span>
                    </button>
                  )}
                >
                  {(close) => (
                    <div className="max-h-72 overflow-y-auto">
                      <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Assign to</p>
                      {staff.map((s) => (
                        <MenuItem key={s.id} onClick={() => (close(), update({ assigned_to: s.id }))} icon={<UserRound className="h-3.5 w-3.5" />}>
                          {s.name}
                          {s.id === me.id ? " (me)" : ""}
                        </MenuItem>
                      ))}
                      <MenuDivider />
                      <MenuItem onClick={() => (close(), update({ assigned_to: null }))}>Unassign</MenuItem>
                    </div>
                  )}
                </Menu>
                {current.can_send &&
                  (current.status === "open" ? (
                    <button onClick={() => update({ status: "closed" })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] font-medium text-ink-700 hover:bg-surface-2">
                      <CheckCircle2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Close</span>
                    </button>
                  ) : (
                    <button onClick={() => update({ status: "open" })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] font-medium text-ink-700 hover:bg-surface-2">
                      <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Reopen</span>
                    </button>
                  ))}
                <button onClick={() => setShowContext((s) => !s)} className="hidden rounded-lg p-1.5 text-ink-500 hover:bg-surface-3 lg:inline-flex" aria-label={showContext ? "Hide details" : "Show details"}>
                  {showContext ? <PanelRightClose className="h-[18px] w-[18px]" /> : <PanelRightOpen className="h-[18px] w-[18px]" />}
                </button>
              </div>
            }
          />
        ) : selected && !current ? (
          <div className="flex flex-1 items-center justify-center text-ink-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <InboxIcon className="h-10 w-10 text-ink-300" aria-hidden />
            <p className="mt-3 text-[15px] font-medium text-ink-700">Select a conversation</p>
            <p className="max-w-xs text-[13px] text-ink-400">Client and candidate messages arrive here live. Start new chats from a candidate or client profile.</p>
          </div>
        )}
      </section>

      {/* context */}
      {selected && current && showContext && (
        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-line bg-surface-2/40 lg:block" aria-label="Details">
          <ContextPanel conversationId={current.id} />
        </aside>
      )}
    </div>
  );
}

function ContextPanel({ conversationId }: { conversationId: string }) {
  const [ctx, setCtx] = useState<any>(null);
  useEffect(() => {
    setCtx(null);
    createClient()
      .rpc("chat_context", { p_conversation: conversationId })
      .then(({ data }) => setCtx(data ?? {}));
  }, [conversationId]);

  if (!ctx) return <div className="flex justify-center py-10 text-ink-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (ctx.type === "candidate")
    return (
      <div className="space-y-5 p-4">
        <div className="text-center">
          {ctx.photo_id ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/documents/${ctx.photo_id}`} alt="" className="mx-auto h-16 w-16 rounded-full object-cover ring-2 ring-line" />
          ) : (
            <div className="flex justify-center">
              <Avatar name={ctx.name} size="lg" />
            </div>
          )}
          <p className="mt-2 text-[15px] font-semibold text-ink-900">{ctx.name}</p>
          {ctx.headline && <p className="text-[12.5px] text-ink-500">{ctx.headline}</p>}
          <p className="mt-1 text-[11.5px] text-ink-400">{ctx.code}</p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-[12px]">
          <Fact label="Experience" value={ctx.experience != null ? `${ctx.experience} yrs` : "—"} />
          <Fact label="City" value={ctx.city ?? "—"} />
          <Fact label="Notice" value={ctx.notice_days != null ? (ctx.notice_days === 0 ? "Immediate" : `${ctx.notice_days} days`) : "—"} />
          <Fact label="Expected" value={ctcLabel(ctx, "expected_ctc")} />
        </dl>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Active jobs</p>
          {ctx.applications?.length ? (
            <ul className="space-y-1.5">
              {ctx.applications.map((a: any) => (
                <li key={a.job_id} className="rounded-lg border border-line bg-surface px-2.5 py-2">
                  <Link href={`/jobs/${a.job_id}`} className="block truncate text-[12.5px] font-medium text-ink-800 hover:text-jade-700">
                    {a.job_title}
                  </Link>
                  <span className="mt-1 flex items-center justify-between gap-2 text-[11.5px] text-ink-400">
                    <span className="truncate">{a.client ?? "Internal"}</span>
                    <StageBadge stage={a.stage} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-400">Not in any active pipeline.</p>
          )}
        </div>
        <div className="space-y-1">
          <QuickLink href={`/candidates/${ctx.id}`} icon={<UserRound className="h-3.5 w-3.5" />}>Open profile</QuickLink>
          {ctx.resume_id && <QuickLink href={`/api/documents/${ctx.resume_id}`} external icon={<FileText className="h-3.5 w-3.5" />}>View CV</QuickLink>}
        </div>
      </div>
    );
  if (ctx.type === "client")
    return (
      <div className="space-y-5 p-4">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron-50 text-saffron-800">
            <Building2 className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-2 text-[15px] font-semibold text-ink-900">{ctx.name}</p>
          <p className="text-[12.5px] text-ink-500">{[ctx.industry, ctx.city].filter(Boolean).join(" · ") || ctx.code}</p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-[12px]">
          <Fact label="Open jobs" value={String(ctx.open_jobs?.length ?? 0)} />
          <Fact label="Pending decisions" value={String(ctx.pending_decisions ?? 0)} highlight={ctx.pending_decisions > 0} />
          <Fact label="Account manager" value={ctx.account_manager ?? "—"} />
          <Fact label="Status" value={ctx.status ?? "—"} />
        </dl>
        {ctx.users?.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Portal users</p>
            <ul className="space-y-1 text-[12.5px] text-ink-700">
              {ctx.users.map((u: any) => (
                <li key={u.name}>
                  {u.name}
                  {u.designation && <span className="text-ink-400"> · {u.designation}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Open jobs</p>
          {ctx.open_jobs?.length ? (
            <ul className="space-y-1.5">
              {ctx.open_jobs.map((j: any) => (
                <li key={j.id}>
                  <Link href={`/jobs/${j.id}`} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2 text-[12.5px] hover:border-jade/40">
                    <Briefcase className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-medium text-ink-800">{j.title}</span>
                    {j.pending > 0 && <span className="rounded-full bg-saffron-50 px-1.5 text-[11px] font-semibold text-saffron-800">{j.pending} pending</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-400">No open jobs.</p>
          )}
        </div>
        <QuickLink href={`/clients/${ctx.id}`} icon={<MapPin className="h-3.5 w-3.5" />}>Open client</QuickLink>
      </div>
    );
  return null;
}

function Fact({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
      <dt className="text-[10.5px] uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className={cn("truncate text-[13px] font-medium", highlight ? "text-saffron-800" : "text-ink-800")}>{value}</dd>
    </div>
  );
}

function QuickLink({ href, icon, children, external }: { href: string; icon: React.ReactNode; children: React.ReactNode; external?: boolean }) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-jade-700 hover:bg-jade-50">
      {icon} {children} {external && <ExternalLink className="ml-auto h-3 w-3 opacity-60" />}
    </Link>
  );
}
