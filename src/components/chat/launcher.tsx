"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { ArrowUpRight, Bot, Check, ChevronRight, Loader2, MessageCircle, SendHorizontal, ShieldCheck, UploadCloud, X } from "lucide-react";
import { MotionProvider } from "@/components/site/motion";
import type { BotCard, BotChip, BotMode, BotReply, BotRequest, BotTurn } from "@/lib/bot/types";
import { cn } from "@/lib/utils";

type Entry = { id: string; from: "user" | "bot"; text?: string; turn?: BotTurn };
const uid = () => Math.random().toString(36).slice(2, 10);

const PLACE = {
  // portals: above the phone tab bar
  portal: { button: "bottom-[84px] md:bottom-6", panel: "bottom-[152px] md:bottom-[92px] h-[min(640px,calc(100dvh-170px))]" },
  // public site: above the back-to-top button
  site: { button: "bottom-[76px]", panel: "bottom-[144px] h-[min(640px,calc(100dvh-160px))]" },
  // staff app
  staff: { button: "bottom-5", panel: "bottom-[84px] h-[min(640px,calc(100dvh-110px))]" },
};

/**
 * Floating assistant (bottom-right). The server decides the mode from the session
 * (visitor / candidate / client / HR / admin) — this component never tells it who the user is.
 */
export function ChatLauncher({ placement = "portal" }: { placement?: keyof typeof PLACE }) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mode, setMode] = useState<BotMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState<Record<string, "confirmed" | "cancelled">>({});
  const recent = useRef<string[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const call = useCallback(async (url: string, body: unknown): Promise<BotReply & { missed?: boolean }> => {
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.turns) return { mode: mode ?? "visitor", turns: [{ text: json?.error ?? "Something went wrong. Please try again.", tone: "error" }] };
      return json;
    } catch {
      return { mode: mode ?? "visitor", turns: [{ text: "I can't reach the server right now. Please check your connection.", tone: "error" }] };
    }
  }, [mode]);

  const show = useCallback(
    (reply: BotReply & { missed?: boolean }) => {
      setMode(reply.mode);
      if (reply.turns.length) setEntries((p) => [...p, ...reply.turns.map((t) => ({ id: uid(), from: "bot" as const, turn: t }))]);
      setMisses((n) => (reply.missed ? n + 1 : 0));
      if (reply.navigate) router.push(reply.navigate);
    },
    [router]
  );

  // greeting from the server (mode comes from the session)
  useEffect(() => {
    if (!open || entries.length) return;
    setBusy(true);
    call("/api/bot", { kind: "start" } satisfies BotRequest).then((r) => {
      show(r);
      setBusy(false);
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // after each reply, show it from the top: the user's last message sits at the top of the view
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const mine = el.querySelectorAll<HTMLElement>("[data-from=\"user\"]");
    const last = mine[mine.length - 1];
    el.scrollTo({ top: last ? Math.max(0, last.offsetTop - 12) : 0, behavior: last ? "smooth" : "auto" });
  }, [entries, busy]);

  const ask = useCallback(
    async (req: BotRequest, userText?: string) => {
      if (busy) return;
      if (userText) setEntries((p) => [...p, { id: uid(), from: "user", text: userText }]);
      setBusy(true);
      const payload = req.kind === "text" ? { ...req, recent: recent.current.slice(-3), misses } : req;
      if (req.kind === "text") recent.current = [...recent.current, req.text].slice(-3);
      show(await call("/api/bot", payload));
      setBusy(false);
    },
    [busy, misses, call, show]
  );

  const chip = (c: BotChip) => {
    if (c.href) return router.push(c.href);
    if (c.send) return ask({ kind: "text", text: c.send }, c.label);
    if (c.tool) return ask({ kind: "tool", tool: c.tool, params: c.params }, c.label);
  };

  const confirm = async (token: string, cancel: boolean) => {
    if (busy || done[token]) return;
    setDone((d) => ({ ...d, [token]: cancel ? "cancelled" : "confirmed" }));
    setBusy(true);
    show(await call("/api/bot/confirm", { token, cancel }));
    setBusy(false);
  };

  const uploadCv = async (file: File) => {
    setEntries((p) => [...p, { id: uid(), from: "user", text: `📎 ${file.name}` }]);
    setBusy(true);
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error("File is larger than 4 MB");
      const fd = new FormData();
      fd.set("file", file);
      fd.set("doc_type", "Resume");
      const res = await fetch("/api/portal/documents", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "CV upload failed");
      show({ mode: "candidate", turns: [{ text: "Your new CV is uploaded and will be used for new applications.", tone: "success", chips: [{ label: "Jobs for me", tool: "recommended_jobs" }] }] });
    } catch (e) {
      show({ mode: "candidate", turns: [{ text: e instanceof Error ? e.message : "CV upload failed", tone: "error" }] });
    } finally {
      setBusy(false);
    }
  };

  // staff: not on the Messages page (the inbox needs the space)
  if (placement === "staff" && (path === "/messages" || path.startsWith("/messages/"))) return null;
  const lastBot = [...entries].reverse().find((e) => e.from === "bot")?.id;

  return (
    <MotionProvider>
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn("fixed right-3 z-[60] flex w-[min(400px,calc(100vw-24px))] flex-col overflow-hidden rounded-3xl border border-line bg-canvas shadow-[0_24px_64px_-16px_rgb(0_0_0/0.35)] sm:right-5", PLACE[placement].panel)}
            role="dialog"
            aria-label="Synerax assistant"
            data-testid="chatbot"
            data-lenis-prevent
            data-mode={mode ?? ""}
          >
            <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-jade text-white">
                <Bot className="h-[18px] w-[18px]" aria-hidden />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-surface" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold text-ink-900">Synerax assistant</p>
                <p className="text-[11.5px] text-ink-500">{mode === "hr" || mode === "admin" ? "Your team's data, at a glance" : "Instant answers · a person is one tap away"}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-ink-500 hover:bg-surface-3 hover:text-ink-900" aria-label="Close chat">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div ref={scroller} className="relative min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4" aria-live="polite" data-lenis-prevent>
              {entries.map((e) =>
                e.from === "user" ? (
                  <div key={e.id} className="flex justify-end" data-from="user">
                    <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-jade px-3.5 py-2 text-[13.5px] text-white">{e.text}</p>
                  </div>
                ) : (
                  <BotBubble
                    key={e.id}
                    turn={e.turn!}
                    active={e.id === lastBot && !busy}
                    done={e.turn?.confirm ? done[e.turn.confirm.token] : undefined}
                    onChip={chip}
                    onForm={(tool, values) => ask({ kind: "tool", tool, params: values }, "Submitted the form")}
                    onConfirm={confirm}
                    onUpload={() => fileRef.current?.click()}
                  />
                )
              )}
              {busy && (
                <div className="flex items-center gap-1.5 pl-1 text-ink-400" aria-label="Assistant is typing">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300" />
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) uploadCv(f);
              }}
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = text.trim();
                if (!v) return;
                setText("");
                ask({ kind: "text", text: v }, v);
              }}
              className="border-t border-line bg-surface px-3 pb-2 pt-2.5"
            >
              <div className="flex items-center gap-2">
                <label htmlFor="bot-input" className="sr-only">
                  Ask a question
                </label>
                <input
                  id="bot-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={1000}
                  placeholder="Ask anything…"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 text-[13.5px] text-ink-900 outline-none focus:border-jade/60 focus:bg-surface focus:ring-2 focus:ring-jade/15"
                  autoComplete="off"
                />
                <button type="submit" disabled={!text.trim() || busy} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-jade text-white disabled:opacity-40" aria-label="Send">
                  <SendHorizontal className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 flex items-center gap-1 px-0.5 text-[10.5px] leading-tight text-ink-400">
                <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden /> AI assistant — answers may be imperfect. Please don&apos;t share passwords or bank details.
              </p>
            </form>
          </m.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
    </MotionProvider>
  );
}

function Steps({ s }: { s: NonNullable<BotCard["steps"]> }) {
  return (
    <div className="mt-2 flex items-center gap-1" aria-label={`Stage: ${s.labels[s.current] ?? ""}`}>
      {s.labels.map((l, i) => (
        <span key={l} className="flex flex-1 flex-col gap-0.5">
          <span className={cn("h-1 rounded-full", s.closed ? "bg-ink-200" : i <= s.current ? "bg-jade" : "bg-surface-3")} />
          {i === s.current && <span className={cn("text-[10px] font-medium", s.closed ? "text-ink-400" : "text-jade-700")}>{s.closed ? "Closed" : l}</span>}
        </span>
      ))}
    </div>
  );
}

function BotBubble({
  turn,
  active,
  done,
  onChip,
  onForm,
  onConfirm,
  onUpload,
}: {
  turn: BotTurn;
  active: boolean;
  done?: "confirmed" | "cancelled";
  onChip: (c: BotChip) => void;
  onForm: (tool: string, values: Record<string, string>) => void;
  onConfirm: (token: string, cancel: boolean) => void;
  onUpload: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      {turn.text && (
        <p
          className={cn(
            "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-md border px-3.5 py-2 text-[13.5px] leading-relaxed",
            turn.tone === "success" ? "border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-100" : turn.tone === "error" ? "border-red-300/70 bg-red-50 text-red-900 dark:bg-red-400/10 dark:text-red-100" : "border-line bg-surface text-ink-900"
          )}
        >
          {turn.text}
        </p>
      )}
      {turn.cards && (
        <div className="w-full space-y-2" data-testid="bot-cards">
          {turn.cards.map((c, i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {c.href ? (
                    <Link href={c.href} className="text-[13.5px] font-semibold text-ink-900 hover:text-jade-700">
                      {c.title}
                    </Link>
                  ) : (
                    <p className="text-[13.5px] font-semibold text-ink-900">{c.title}</p>
                  )}
                  {c.subtitle && <p className="truncate text-[12px] text-ink-500">{c.subtitle}</p>}
                  {c.meta && <p className="text-[11.5px] text-ink-400">{c.meta}</p>}
                </div>
                {c.badge && <span className="shrink-0 rounded-full bg-jade-50 px-2 py-0.5 text-[11px] font-semibold text-jade-700">{c.badge}</span>}
              </div>
              {c.lines && (
                <ul className="mt-1.5 space-y-0.5 text-[12px] text-ink-600">
                  {c.lines.map((l, j) => (
                    <li key={j} className="whitespace-pre-wrap">
                      {l}
                    </li>
                  ))}
                </ul>
              )}
              {c.steps && <Steps s={c.steps} />}
              {c.chips && active && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.chips.map((ch) => (
                    <ChipButton key={ch.label} chip={ch} onClick={() => onChip(ch)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {turn.confirm && (
        <div className="w-full rounded-2xl border border-jade/40 bg-jade-50/50 p-3" data-testid="bot-confirm">
          <p className="text-[13.5px] font-semibold text-ink-900">{turn.confirm.title}</p>
          <ul className="mt-1 space-y-0.5 text-[12.5px] text-ink-600">
            {turn.confirm.details.map((d, i) => (
              <li key={i}>• {d}</li>
            ))}
          </ul>
          {done ? (
            <p className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-500">
              <Check className="h-3.5 w-3.5" /> {done === "confirmed" ? "Confirmed" : "Cancelled"}
            </p>
          ) : (
            <div className="mt-2.5 flex gap-2">
              <button type="button" onClick={() => onConfirm(turn.confirm!.token, false)} className="inline-flex h-9 items-center rounded-lg bg-jade px-3.5 text-[13px] font-semibold text-white hover:bg-[rgb(var(--jade-hover))]">
                {turn.confirm.confirmLabel}
              </button>
              <button type="button" onClick={() => onConfirm(turn.confirm!.token, true)} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-700 hover:bg-surface-2">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
      {turn.form && active && <BotFormView form={turn.form} onSubmit={(v) => onForm(turn.form!.tool, v)} />}
      {turn.upload && active && (
        <button type="button" onClick={onUpload} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-jade/50 bg-jade-50/60 px-3.5 py-2.5 text-[13px] font-semibold text-jade-700 hover:bg-jade-50">
          <UploadCloud className="h-4 w-4" aria-hidden /> Choose CV file
        </button>
      )}
      {turn.link && (
        <Link href={turn.link.href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-jade-700 hover:underline">
          {turn.link.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
      {turn.chips && turn.chips.length > 0 && active && (
        <div className="flex flex-wrap gap-1.5">
          {turn.chips.map((c) => (
            <ChipButton key={c.label + (c.tool ?? c.send ?? c.href)} chip={c} onClick={() => onChip(c)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChipButton({ chip, onClick }: { chip: BotChip; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-left text-[12.5px] font-medium transition",
        chip.tone === "primary" ? "border-jade bg-jade text-white hover:bg-[rgb(var(--jade-hover))]" : "border-line bg-surface text-ink-700 hover:border-jade/50 hover:text-jade-700"
      )}
    >
      {chip.label}
      {chip.tone !== "primary" && <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />}
    </button>
  );
}

function BotFormView({ form, onSubmit }: { form: NonNullable<BotTurn["form"]>; onSubmit: (v: Record<string, string>) => void }) {
  const [v, setV] = useState<Record<string, string>>(form.initial ?? {});
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const missing = form.fields.find((f) => f.required && !String(v[f.name] ?? "").trim());
        if (missing) return setErr(`${missing.label} is required`);
        const email = form.fields.find((f) => f.type === "email");
        if (email && v[email.name] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v[email.name])) return setErr("Enter a valid email");
        setErr(null);
        setSent(true);
        onSubmit(Object.fromEntries(Object.entries(v).filter(([, x]) => String(x).trim() !== "")));
      }}
      className="w-full space-y-2 rounded-2xl border border-line bg-surface p-3"
      data-testid="bot-form"
    >
      {form.fields.map((f) => (
        <label key={f.name} className="block">
          <span className="mb-0.5 block text-[11.5px] font-medium text-ink-600">
            {f.label}
            {f.required && <span className="text-red-500"> *</span>}
          </span>
          {f.type === "textarea" ? (
            <textarea rows={3} value={v[f.name] ?? ""} placeholder={f.placeholder} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[13px] outline-none focus:border-jade/60" />
          ) : f.type === "select" ? (
            <select value={v[f.name] ?? ""} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-surface-2 px-2 text-[13px] outline-none focus:border-jade/60">
              <option value="">Select</option>
              {f.options?.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              type={f.type ?? "text"}
              inputMode={f.type === "number" ? "decimal" : undefined}
              value={v[f.name] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => setV({ ...v, [f.name]: e.target.value })}
              className="h-9 w-full rounded-lg border border-line bg-surface-2 px-2.5 text-[13px] outline-none focus:border-jade/60"
            />
          )}
        </label>
      ))}
      {err && <p className="text-[12px] text-red-600">{err}</p>}
      <button type="submit" disabled={sent} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-jade px-3.5 text-[13px] font-semibold text-white hover:bg-[rgb(var(--jade-hover))] disabled:opacity-50">
        {sent && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {form.submitLabel}
      </button>
    </form>
  );
}
