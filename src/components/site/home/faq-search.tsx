"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, Mail, Search, X } from "lucide-react";
import { site } from "@/content/site";
import { team } from "@/data/team";
import { cn } from "@/lib/utils";
import { Band, SectionHead, Wrap } from "../connection/motif";

type Item = { q: string; a: string; who?: string };

// the people candidates and clients actually reach
const PEOPLE = team.filter((t) => /HR/.test(t.role)).slice(0, 3).map((t) => t.name.split(" ").map((w) => w[0]).join("").slice(0, 2));

/** FAQ: live search + audience tabs, numbered question cards, and a sticky "talk to a real person" panel */
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
  const [who, setWho] = useState<string | null>(null);
  const audiences = useMemo(() => Array.from(new Set(all.map((x) => x.who).filter((x): x is string => !!x))), [all]);
  const [open, setOpen] = useState<string | null>(all[0]?.q ?? null);
  const base = useId();
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = all.filter((it) => (!who || it.who === who) && terms.every((t) => `${it.q} ${it.a} ${it.who ?? ""}`.toLowerCase().includes(t)));
  const mark = (text: string) => {
    if (!terms.length) return text;
    const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const one = new RegExp(`^${re.source}$`, "i");
    return text.split(re).map((p, i) => (one.test(p) ? <mark key={i} className="rounded bg-[rgb(var(--success)/0.3)] px-0.5 text-inherit">{p}</mark> : p));
  };

  return (
    <Band tone={tone} index={index} label="FAQ" className="py-24 sm:py-32">
      <Wrap>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <SectionHead stack index={index} label="FAQ" title={title} highlight="answered" description="Type to search, or ask a real person." />
              <label className="relative block">
                <span className="sr-only">Search questions</span>
                <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search: fees, replacement, data…"
                  className="h-14 w-full rounded-full border border-line bg-surface pl-12 pr-11 text-[15.5px] text-ink-900 shadow-[0_14px_34px_-26px_rgb(20_12_4/0.5)] placeholder:text-ink-400 focus:border-[rgb(var(--accent-b))] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--accent-b)/0.15)]"
                />
                {q && (
                  <button onClick={() => setQ("")} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-400 hover:text-ink-800" aria-label="Clear search">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {audiences.length > 1 &&
                  [null, ...audiences].map((a) => (
                    <button
                      key={a ?? "all"}
                      onClick={() => setWho(a)}
                      aria-pressed={who === a}
                      className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors", who === a ? "bg-ink-900 text-[rgb(var(--cream))] dark:text-surface" : "border border-line text-ink-600 hover:text-ink-900")}
                    >
                      {a ?? "All"}
                    </button>
                  ))}
                <span className="ml-auto text-[12.5px] text-ink-500" aria-live="polite">
                  {list.length} of {all.length} questions
                </span>
              </div>

              <div className="section-dark relative mt-7 overflow-hidden rounded-[28px] p-6 sm:p-7">
                <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-[rgb(var(--p-500)/0.45)] blur-3xl" />
                <div className="relative flex items-center gap-4">
                  <div className="flex -space-x-3" aria-hidden>
                    {PEOPLE.map((p) => (
                      <span key={p} className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(var(--ember-a))] to-[rgb(var(--ember-b))] text-[13px] font-semibold text-white ring-[3px] ring-[rgb(var(--deep))]">
                        {p}
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold tracking-[-0.01em] text-ink-900">Talk to a real person</p>
                    <p className="text-[13px] text-ink-500">{site.contact.responseTime}</p>
                  </div>
                </div>
                <div className="relative mt-5 grid grid-cols-2 gap-2">
                  <a href={`mailto:${site.contact.email}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-fg/[0.08] text-[13.5px] font-semibold text-ink-900 transition-colors hover:bg-fg/[0.14]">
                    <Mail className="h-4 w-4" aria-hidden /> Email us
                  </a>
                  <Link href="/contact" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-jade text-[13.5px] font-semibold text-white hover:brightness-110">
                    Contact <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="space-y-3">
              {list.length === 0 && <p className="rounded-[24px] border border-dashed border-line-strong px-6 py-12 text-center text-[15px] text-ink-500">No questions match “{q}”. Try another word, or ask us directly.</p>}
              {list.map((it, i) => {
                const isOpen = open === it.q;
                return (
                  <div
                    key={it.q}
                    className={cn(
                      "overflow-hidden rounded-[22px] border bg-surface transition-[border-color,box-shadow] duration-300",
                      isOpen ? "border-[rgb(var(--accent-b)/0.45)] shadow-[0_24px_50px_-30px_rgb(var(--p-500)/0.55)]" : "border-line hover:border-line-strong"
                    )}
                  >
                    <h3>
                      <button
                        id={`${base}-q${i}`}
                        aria-expanded={isOpen}
                        aria-controls={`${base}-a${i}`}
                        onClick={() => setOpen(isOpen ? null : it.q)}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                      >
                        <span className={cn("shrink-0 text-[13px] font-semibold tabular transition-colors duration-300", isOpen ? "text-jade-700" : "text-ink-300")} aria-hidden>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          {it.who && <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-jade-700">{it.who}</span>}
                          <span className="block text-[15.5px] font-semibold leading-snug text-ink-900 sm:text-[16.5px]">{mark(it.q)}</span>
                        </span>
                        {/* plus morphs into a minus */}
                        <span className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300", isOpen ? "border-transparent bg-jade text-white" : "border-line text-ink-600")} aria-hidden>
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
                          <p className="px-5 pb-5 pl-[52px] text-[15px] leading-relaxed text-ink-600 sm:px-6 sm:pb-6 sm:pl-[60px]">
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
