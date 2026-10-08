"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, Mail, MessageCircle, Search, X } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Band, SectionHead, Wrap } from "../connection/motif";

type Item = { q: string; a: string; who?: string };

const RECRUITERS = [
  { i: "NA", g: "from-[rgb(var(--p-400))] to-[rgb(var(--p-700))]" },
  { i: "RM", g: "from-sky-400 to-indigo-600" },
  { i: "SI", g: "from-amber-400 to-orange-600" },
];

/** FAQ with live search + a "talk to a real person" card */
export function FaqSearch({
  items,
  index = "08",
  title = "Questions, answered",
  tone = "light",
}: {
  items?: readonly Item[];
  index?: string;
  title?: string;
  tone?: "light" | "alt";
}) {
  const all: Item[] = useMemo(
    () => items?.map((x) => ({ ...x })) ?? [...site.faq.employers.map((x) => ({ ...x, who: "Employers" })), ...site.faq.candidates.map((x) => ({ ...x, who: "Candidates" }))],
    [items]
  );
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(all[0]?.q ?? null);
  const base = useId();
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = all.filter((it) => terms.every((t) => `${it.q} ${it.a} ${it.who ?? ""}`.toLowerCase().includes(t)));
  const mark = (text: string) => {
    if (!terms.length) return text;
    const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const one = new RegExp(`^${re.source}$`, "i");
    return text.split(re).map((p, i) => (one.test(p) ? <mark key={i} className="rounded bg-[rgb(var(--success)/0.3)] px-0.5 text-inherit">{p}</mark> : p));
  };
  const wa = site.contact.whatsapp.replace(/\D/g, "");

  return (
    <Band tone={tone} index={index} label="FAQ" className="py-24 sm:py-32">
      <Wrap>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHead stack index={index} label="FAQ" title={title} highlight="answered" description="Type to search — or ask a real person." />
            <label className="relative block">
              <span className="sr-only">Search questions</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search: fees, replacement, data…"
                className="h-14 w-full rounded-2xl border border-line bg-surface pl-12 pr-11 text-[15.5px] text-ink-900 placeholder:text-ink-400 focus:border-[rgb(var(--accent-b))] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--accent-b)/0.15)]"
              />
              {q && (
                <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:text-ink-800" aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <p className="mt-2 text-[12.5px] text-ink-500" aria-live="polite">
              {list.length} of {all.length} questions
            </p>

            <div className="mt-8 rounded-[24px] border border-line bg-surface p-6">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {RECRUITERS.map((r) => (
                    <span key={r.i} className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-semibold text-white ring-4 ring-surface", r.g)} aria-hidden>
                      {r.i}
                    </span>
                  ))}
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-ink-900">Talk to a real person</p>
                  <p className="flex items-center gap-2 text-[13px] text-ink-600">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                    Typically replies in 2 hrs
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href={`mailto:${site.contact.email}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3.5 text-[13.5px] font-semibold text-ink-800 hover:border-[rgb(var(--accent-b))]">
                  <Mail className="h-4 w-4" aria-hidden /> Email us
                </a>
                {wa && (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3.5 text-[13.5px] font-semibold text-ink-800 hover:border-emerald-500">
                    <MessageCircle className="h-4 w-4 text-emerald-500" aria-hidden /> WhatsApp
                  </a>
                )}
                <Link href="/contact" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-jade px-3.5 text-[13.5px] font-semibold text-white hover:brightness-110">
                  Contact <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="divide-y divide-line overflow-hidden rounded-[24px] border border-line bg-surface">
              {list.length === 0 && <p className="px-6 py-10 text-center text-[15px] text-ink-500">No questions match “{q}”. Try another word — or ask us directly.</p>}
              {list.map((it, i) => {
                const isOpen = open === it.q;
                return (
                  <div key={it.q}>
                    <h3>
                      <button
                        id={`${base}-q${i}`}
                        aria-expanded={isOpen}
                        aria-controls={`${base}-a${i}`}
                        onClick={() => setOpen(isOpen ? null : it.q)}
                        className="flex w-full items-center gap-4 px-6 py-5 text-left"
                      >
                        <span className="min-w-0 flex-1">
                          {it.who && <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-jade-700">{it.who}</span>}
                          <span className="block text-[16px] font-semibold text-ink-900">{mark(it.q)}</span>
                        </span>
                        {/* plus morphs into a minus */}
                        <span className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-300", isOpen ? "border-transparent bg-jade text-white" : "border-line text-ink-600")} aria-hidden>
                          <span className="absolute h-[1.5px] w-3.5 rounded-full bg-current" />
                          <span className={cn("absolute h-3.5 w-[1.5px] rounded-full bg-current transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]", isOpen ? "rotate-90 scale-y-0" : "rotate-0 scale-y-100")} />
                        </span>
                      </button>
                    </h3>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <m.div
                          id={`${base}-a${i}`}
                          role="region"
                          aria-labelledby={`${base}-q${i}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ height: { type: "spring", stiffness: 210, damping: 26 }, opacity: { duration: 0.25 } }}
                          className="overflow-hidden"
                        >
                          <p className="px-6 pb-6 text-[15px] leading-relaxed text-ink-600">
                            {/* answer reveals line by line (sentence by sentence) */}
                            {(it.a.match(/[^.!?]+[.!?]*s*/g) ?? [it.a]).map((line, k) => (
                              <span key={k} className="line-in" style={{ ["--d" as string]: `${0.08 + k * 0.12}s` }}>
                                {mark(line)}
                              </span>
                            ))}
                          </p>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Wrap>
    </Band>
  );
}
