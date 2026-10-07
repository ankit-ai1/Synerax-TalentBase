"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  CalendarClock,
  CalendarPlus,
  CheckSquare,
  ExternalLink,
  GripVertical,
  KanbanSquare,
  List,
  MessageCircle,
  MoreHorizontal,
  Search,
  Trash2,
  UserPlus,
  Globe,
  MessagesSquare,
  Share2,
  Undo2,
  X,
} from "lucide-react";
import { CommentsDialog, ShareDialog } from "./share-dialog";
import { createClient } from "@/lib/supabase/client";
import { staffEvent } from "@/lib/portal-rpc";
import { useDialogs } from "@/components/dialogs/provider";
import { Avatar, ScoreRing, StageBadge } from "@/components/ui/misc";
import { Menu, MenuDivider, MenuItem, MenuLabel, Segmented } from "@/components/ui/interactive";
import { AsyncPicker, searchCandidates } from "@/components/pickers";
import { ACTIVE_STAGES, STAGES, STAGE_STYLE } from "@/lib/constants";
import { cn, dayLabel, formatTime, friendlyError, lpa, noticeLabel, timeAgo, years } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type App = any;
const NEEDS_DIALOG = ["Rejected", "Dropped", "Offered", "Joined"];

export function Pipeline({
  jobId,
  jobTitle,
  clientId,
  clientName,
  apps: initial,
}: {
  jobId: string;
  jobTitle: string;
  clientId: string | null;
  clientName: string | null;
  apps: App[];
}) {
  const router = useRouter();
  const dialogs = useDialogs();
  const [apps, setApps] = useState<App[]>(initial);
  const [view, setView] = useState<"board" | "list">("board");
  const [q, setQ] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shareApps, setShareApps] = useState<App[] | null>(null);
  const [thread, setThread] = useState<App | null>(null);
  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  useEffect(() => {
    setApps(initial);
    setSelected((s) => new Set([...s].filter((id) => initial.some((a) => a.id === id))));
  }, [initial]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return apps.filter((a) => !s || `${a.candidate.first_name} ${a.candidate.last_name ?? ""} ${a.candidate.current_company ?? ""}`.toLowerCase().includes(s));
  }, [apps, q]);

  const name = (a: App) => `${a.candidate.first_name} ${a.candidate.last_name ?? ""}`.trim();

  async function move(a: App, to: string) {
    if (a.stage === to) return;
    if (NEEDS_DIALOG.includes(to)) {
      dialogs.openStage({ applicationId: a.id, candidateName: name(a), from: a.stage, to });
      return;
    }
    const prev = apps;
    setApps((list) => list.map((x) => (x.id === a.id ? { ...x, stage: to, stage_changed_at: new Date().toISOString() } : x)));
    const { error } = await createClient().from("applications").update({ stage: to }).eq("id", a.id);
    if (error) {
      setApps(prev);
      return toast.error(friendlyError(error.message));
    }
    staffEvent("stage", a.id);
    toast.success(`${name(a)} → ${to}`);
    router.refresh();
  }

  async function remove(a: App) {
    if (!confirm(`Remove ${name(a)} from this job's pipeline?`)) return;
    const { error } = await createClient().from("applications").delete().eq("id", a.id);
    if (error) return toast.error(friendlyError(error.message));
    setApps((l) => l.filter((x) => x.id !== a.id));
    toast.success("Removed from pipeline");
    router.refresh();
  }

  async function unshare(list: App[]) {
    const res = await fetch("/api/applications/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: list.map((a) => a.id), unshare: true }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(friendlyError(out.error ?? "Could not unshare"));
    toast.success(list.length === 1 ? "Hidden from the client again" : `${out.count} profiles hidden from the client`);
    router.refresh();
  }

  async function addOne(id: string) {
    const { data, error } = await createClient().rpc("add_to_job", { p_job: jobId, p_candidates: [id], p_stage: "Sourced" });
    if (error) return toast.error(friendlyError(error.message));
    if (!data) return toast.message("This candidate is already in the pipeline");
    toast.success("Added to pipeline");
    router.refresh();
  }

  const closed = filtered.filter((a) => a.stage === "Rejected" || a.stage === "Dropped");

  const cardMenu = (a: App) => (
    <Menu
      width="w-56"
      trigger={({ toggle }) => (
        <button
          onClick={(e) => {
            e.preventDefault();
            toggle();
          }}
          className="rounded-md p-1 text-ink-400 opacity-0 transition-opacity hover:bg-surface-3 hover:text-ink-800 focus:opacity-100 group-hover:opacity-100"
          aria-label="Options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem icon={<ExternalLink className="h-4 w-4" />} onClick={() => (close(), router.push(`/candidates/${a.candidate.id}`))}>
            Open profile
          </MenuItem>
          <MenuItem
            icon={<CalendarPlus className="h-4 w-4" />}
            onClick={() => (close(), dialogs.openInterview({ applicationId: a.id, job: { id: jobId, label: jobTitle }, candidate: { id: a.candidate.id, label: name(a) } }))}
          >
            Schedule interview
          </MenuItem>
          <MenuItem
            icon={<MessageCircle className="h-4 w-4" />}
            onClick={() => (close(), dialogs.openMessage({ candidates: [a.candidate], vars: { job_title: jobTitle } }))}
          >
            Send message
          </MenuItem>
          <MenuItem
            icon={<CheckSquare className="h-4 w-4" />}
            onClick={() => (close(), dialogs.openTask({ candidate: { id: a.candidate.id, label: name(a) }, job: { id: jobId, label: jobTitle } }))}
          >
            Follow-up task
          </MenuItem>
          {clientId && (
            <>
              <MenuDivider />
              <MenuItem icon={<Share2 className="h-4 w-4" />} onClick={() => (close(), setShareApps([a]))}>
                {a.shared_with_client ? "Update shared CV / note" : "Share with client…"}
              </MenuItem>
              {a.shared_with_client && (
                <>
                  <MenuItem icon={<MessagesSquare className="h-4 w-4" />} onClick={() => (close(), setThread(a))}>
                    Client conversation
                  </MenuItem>
                  <MenuItem icon={<Undo2 className="h-4 w-4" />} onClick={() => (close(), unshare([a]))}>
                    Unshare
                  </MenuItem>
                </>
              )}
            </>
          )}
          <MenuDivider />
          <MenuLabel>Change stage</MenuLabel>
          <div className="grid grid-cols-2 gap-0.5 px-1 pb-1">
            {STAGES.filter((s) => s !== a.stage).map((s) => (
              <button
                key={s}
                onClick={() => (close(), move(a, s))}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-ink-700 hover:bg-surface-3"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", STAGE_STYLE[s].dot)} />
                {s}
              </button>
            ))}
          </div>
          <MenuDivider />
          <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => (close(), remove(a))}>
            Remove from pipeline
          </MenuItem>
        </>
      )}
    </Menu>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "board", label: <><KanbanSquare className="h-3.5 w-3.5" /> Board</> },
            { value: "list", label: <><List className="h-3.5 w-3.5" /> List</> },
          ]}
        />
        <div className="relative w-full max-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pipeline" className="field-input h-8 pl-8 text-[13px]" />
        </div>
        <div className="ml-auto w-full sm:w-72">
          <AsyncPicker value={null} onChange={(v) => v && addOne(v.id)} search={searchCandidates} placeholder="+ Add candidate" />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-jade/30 bg-surface px-3 py-2 shadow-pop">
          <span className="text-sm font-medium text-ink-800">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {clientId && (
              <button
                onClick={() => setShareApps(apps.filter((a) => selected.has(a.id)))}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-jade px-3 text-[13px] font-medium text-white hover:brightness-110"
              >
                <Share2 className="h-3.5 w-3.5" /> Share with client
              </button>
            )}
            {clientId && apps.some((a) => selected.has(a.id) && a.shared_with_client) && (
              <button
                onClick={() => unshare(apps.filter((a) => selected.has(a.id) && a.shared_with_client))}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2"
              >
                <Undo2 className="h-3.5 w-3.5" /> Unshare
              </button>
            )}
            <button
              onClick={() => dialogs.openMessage({ candidates: apps.filter((a) => selected.has(a.id)).map((a) => a.candidate), vars: { job_title: jobTitle } })}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-medium text-ink-700 hover:bg-surface-2"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Message
            </button>
            <button onClick={() => setSelected(new Set())} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-500 hover:bg-surface-2" aria-label="Clear selection">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
          <UserPlus className="mx-auto mb-3 h-6 w-6 text-ink-300" />
          <p className="font-semibold text-ink-900">Pipeline is empty</p>
          <p className="mt-1 text-sm text-ink-400">See the best fits in the &quot;Matching candidates&quot; tab, or add a candidate above.</p>
        </div>
      ) : view === "board" ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex min-w-max gap-3">
            {ACTIVE_STAGES.map((st) => {
              const col = filtered.filter((a) => a.stage === st);
              return (
                <div
                  key={st}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(st);
                  }}
                  onDragLeave={() => setOver((o) => (o === st ? null : o))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(null);
                    const a = apps.find((x) => x.id === e.dataTransfer.getData("text/plain"));
                    if (a) move(a, st);
                    setDragId(null);
                  }}
                  className={cn(
                    "flex w-[272px] shrink-0 flex-col rounded-2xl border bg-surface-2 transition-colors",
                    over === st ? "border-jade bg-jade-50/60 ring-2 ring-jade/20" : "border-line"
                  )}
                >
                  <div className="flex items-center gap-2 px-3.5 pb-2 pt-3">
                    <span className={cn("h-2 w-2 rounded-full", STAGE_STYLE[st].dot)} />
                    <span className="text-[13px] font-semibold text-ink-800">{st}</span>
                    <span className="rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular text-ink-500">{col.length}</span>
                  </div>
                  <p className="px-3.5 pb-2 text-[11px] text-ink-400">{STAGE_STYLE[st].hint}</p>
                  <div className="flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-2">
                    {col.map((a) => (
                      <AppCard
                        key={a.id}
                        a={a}
                        dragging={dragId === a.id}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", a.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragId(a.id);
                        }}
                        onDragEnd={() => setDragId(null)}
                        menu={cardMenu(a)}
                        selected={selected.has(a.id)}
                        selecting={selected.size > 0}
                        onSelect={() => toggleSel(a.id)}
                        onThread={() => setThread(a)}
                      />
                    ))}
                    {col.length === 0 && (
                      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line-strong/70 py-6 text-center text-xs text-ink-300">
                        Drag here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* closed column */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setOver("closed");
              }}
              onDragLeave={() => setOver((o) => (o === "closed" ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const a = apps.find((x) => x.id === e.dataTransfer.getData("text/plain"));
                if (a) move(a, "Rejected");
              }}
              className={cn(
                "flex shrink-0 flex-col rounded-2xl border border-dashed transition-all",
                showClosed ? "w-[272px] bg-surface-2" : "w-[120px]",
                over === "closed" ? "border-red-400 bg-red-50 dark:bg-red-500/10" : "border-line-strong"
              )}
            >
              <button onClick={() => setShowClosed(!showClosed)} className="px-3.5 pb-2 pt-3 text-left">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-600">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Closed
                  <span className="rounded-full bg-surface-3 px-1.5 text-[11px] tabular text-ink-500">{closed.length}</span>
                </p>
                <p className="mt-1 text-[11px] text-ink-400">{showClosed ? "Hide" : "Rejected / dropped — click to view"}</p>
              </button>
              {showClosed && (
                <div className="flex flex-col gap-2 px-2 pb-2">
                  {closed.map((a) => (
                    <AppCard
                      key={a.id}
                      a={a}
                      dragging={false}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                      onDragEnd={() => {}}
                      menu={cardMenu(a)}
                        selected={selected.has(a.id)}
                        selecting={selected.size > 0}
                        onSelect={() => toggleSel(a.id)}
                        onThread={() => setThread(a)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-400">
                <th className="w-10 py-3 pl-4">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    className="accent-[#0F766E]"
                    checked={filtered.length > 0 && filtered.every((a) => selected.has(a.id))}
                    onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((a) => a.id)) : new Set())}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-3 py-3 font-medium">Match</th>
                <th className="px-3 py-3 font-medium">Exp</th>
                <th className="px-3 py-3 font-medium">Expected</th>
                <th className="px-3 py-3 font-medium">Notice</th>
                <th className="px-3 py-3 font-medium">Stage</th>
                <th className="px-3 py-3 font-medium">Client</th>
                <th className="px-3 py-3 font-medium">In stage</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((a) => (
                <tr key={a.id} className={cn("group hover:bg-surface-2", selected.has(a.id) && "bg-jade-50/40")}>
                  <td className="py-2.5 pl-4">
                    <input type="checkbox" aria-label={`Select ${name(a)}`} className="accent-[#0F766E]" checked={selected.has(a.id)} onChange={() => toggleSel(a.id)} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/candidates/${a.candidate.id}`} className="flex items-center gap-2.5">
                      <Avatar name={name(a)} size="sm" />
                      <span>
                        <span className="flex items-center gap-1.5 font-medium text-ink-900 hover:text-jade-700">
                          {name(a)}
                          {a.origin === "Candidate applied" && <PortalBadge />}
                        </span>
                        <span className="block text-xs text-ink-400">{[a.candidate.current_designation, a.candidate.current_company].filter(Boolean).join(" @ ")}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{a.match_score != null ? <ScoreRing value={a.match_score} size={32} /> : "—"}</td>
                  <td className="px-3 py-2.5 tabular text-ink-700">{years(a.candidate.total_experience)}</td>
                  <td className="px-3 py-2.5 tabular text-ink-700">{lpa(a.candidate.expected_ctc)}</td>
                  <td className="px-3 py-2.5 text-ink-700">{noticeLabel(a.candidate.notice_period_days)}</td>
                  <td className="px-3 py-2.5">
                    <select
                      value={a.stage}
                      onChange={(e) => move(a, e.target.value)}
                      className="field-input h-8 w-36 text-[13px]"
                      aria-label="Stage"
                    >
                      {STAGES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <ClientChip a={a} onThread={() => setThread(a)} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ink-400">{timeAgo(a.stage_changed_at)}</td>
                  <td className="px-3 py-2.5 text-right">{cardMenu(a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
        <ArrowRightLeft className="h-3.5 w-3.5" /> Drag cards to change stage. You'll be asked for details on Offer, Joined and Reject.
      </p>
      <ShareDialog
        open={!!shareApps}
        onClose={() => setShareApps(null)}
        apps={shareApps ?? []}
        clientName={clientName}
        onDone={() => {
          setSelected(new Set());
          router.refresh();
        }}
      />
      <CommentsDialog open={!!thread} onClose={() => setThread(null)} app={thread} onPosted={() => router.refresh()} />
    </div>
  );
}

function AppCard({
  a,
  dragging,
  onDragStart,
  onDragEnd,
  menu,
  selected,
  selecting,
  onSelect,
  onThread,
}: {
  a: App;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  menu: React.ReactNode;
  selected: boolean;
  selecting: boolean;
  onSelect: () => void;
  onThread: () => void;
}) {
  const c = a.candidate;
  const name = `${c.first_name} ${c.last_name ?? ""}`.trim();
  const next = (a.interviews ?? [])
    .filter((i: any) => i.status === "Scheduled" && new Date(i.scheduled_at).getTime() > Date.now() - 3600e3)
    .sort((x: any, y: any) => x.scheduled_at.localeCompare(y.scheduled_at))[0];
  const lastResult = (a.interviews ?? []).filter((i: any) => i.result !== "Pending").sort((x: any, y: any) => y.scheduled_at.localeCompare(x.scheduled_at))[0];
  const stale = Date.now() - new Date(a.stage_changed_at).getTime() > 7 * 86400e3 && !["Joined", "Rejected", "Dropped"].includes(a.stage);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group cursor-grab rounded-xl border border-line bg-surface p-3 shadow-card transition-all hover:border-line-strong hover:shadow-pop active:cursor-grabbing",
        dragging && "rotate-[1.5deg] opacity-50",
        selected && "border-jade ring-1 ring-jade/30"
      )}
    >
      <div className="flex items-start gap-2.5">
        <GripVertical className="-ml-1 mt-1 h-3.5 w-3.5 shrink-0 text-ink-300 opacity-0 group-hover:opacity-100" />
        <span className="relative shrink-0">
          <Avatar name={name} size="sm" />
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            aria-label={`Select ${name}`}
            className={cn(
              "absolute inset-0 m-auto h-4 w-4 cursor-pointer accent-[#0F766E] transition-opacity",
              selected || selecting ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          />
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/candidates/${c.id}`} className="block truncate text-[13.5px] font-semibold text-ink-900 hover:text-jade-700" draggable={false}>
            {name}
          </Link>
          <p className="truncate text-xs text-ink-400">{[c.current_designation, c.current_company].filter(Boolean).join(" @ ") || "—"}</p>
          {a.origin === "Candidate applied" && <PortalBadge className="mt-1" />}
        </div>
        {a.match_score != null && <ScoreRing value={a.match_score} size={30} />}
        {menu}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-[42px] text-[11.5px] text-ink-500">
        <span className="tabular">{years(c.total_experience)}</span>
        <span className="tabular">{lpa(c.expected_ctc)}</span>
        <span className={cn(c.notice_period_days != null && c.notice_period_days <= 15 && "font-medium text-jade-700")}>{noticeLabel(c.notice_period_days)}</span>
      </div>
      {(next || a.offered_ctc || lastResult || a.rejection_reason) && (
        <div className="mt-2 space-y-1 pl-[42px]">
          {next && (
            <p className="flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-800 dark:bg-violet-400/10 dark:text-violet-300">
              <CalendarClock className="h-3 w-3" />
              {next.round_name} · {dayLabel(next.scheduled_at)} {formatTime(next.scheduled_at)}
            </p>
          )}
          {!next && lastResult && a.stage === "Interview" && (
            <p className="text-[11px] text-ink-500">
              {lastResult.round_name}: <StageResult r={lastResult.result} />
            </p>
          )}
          {a.offered_ctc && <p className="text-[11px] font-medium text-saffron-800">Offer {lpa(a.offered_ctc)}</p>}
          {a.rejection_reason && <p className="truncate text-[11px] text-red-600 dark:text-red-400">{a.rejection_reason}</p>}
        </div>
      )}
      {a.shared_with_client && (
        <div className="mt-2 space-y-1 pl-[42px]">
          <ClientChip a={a} onThread={onThread} />
          {(a.client_feedback || a.client_reject_reason) && (
            <p className="line-clamp-2 text-[11px] italic text-ink-500" title={a.client_feedback || a.client_reject_reason}>
              “{a.client_feedback || a.client_reject_reason}”
            </p>
          )}
          {clientInterviewNote(a) && <p className="line-clamp-2 text-[11px] text-ink-500">Interview: “{clientInterviewNote(a)}”</p>}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between pl-[42px] text-[11px] text-ink-400">
        <span className={cn(stale && "font-medium text-saffron-600")} title="Time in this stage">
          {stale ? "⚠ " : ""}
          {timeAgo(a.stage_changed_at)}
        </span>
        {(a.stage === "Rejected" || a.stage === "Dropped") && <StageBadge stage={a.stage} className="!px-1.5 !py-0 !text-[10px]" />}
      </div>
    </div>
  );
}

function StageResult({ r }: { r: string }) {
  return <span className={cn("font-medium", r === "Selected" ? "text-emerald-600" : r === "Rejected" ? "text-red-600" : "text-amber-600")}>{r}</span>;
}

function PortalBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full bg-cyan-50 px-1.5 py-px text-[10px] font-medium text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300", className)}
      title="Applied through the candidate portal"
    >
      <Globe className="h-2.5 w-2.5" /> via portal
    </span>
  );
}

const clientInterviewNote = (a: App) =>
  (a.interviews ?? []).filter((i: any) => i.client_feedback).sort((x: any, y: any) => y.scheduled_at.localeCompare(x.scheduled_at))[0]?.client_feedback as string | undefined;

function ClientChip({ a, onThread }: { a: App; onThread: () => void }) {
  if (!a.shared_with_client) return <span className="text-xs text-ink-300">—</span>;
  const d = a.client_decision ?? "Pending";
  const style =
    d === "Approved"
      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300"
      : d === "Rejected"
        ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
        : "bg-sky-50 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300";
  const label = d === "Approved" ? "Client approved" : d === "Rejected" ? "Client rejected" : "Shared · awaiting client";
  const comments = (a.application_comments ?? []).length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={cn("inline-flex items-center rounded-full px-1.5 py-px text-[10.5px] font-medium", style)} title={a.shared_at ? `Shared ${timeAgo(a.shared_at)}` : undefined}>
        {label}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault();
          onThread();
        }}
        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10.5px] text-ink-500 hover:bg-surface-3 hover:text-ink-800"
        aria-label="Client conversation"
        draggable={false}
      >
        <MessagesSquare className="h-3 w-3" /> {comments || ""}
      </button>
    </span>
  );
}
