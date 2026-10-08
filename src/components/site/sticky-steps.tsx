"use client";

import { useRef, useState } from "react";
import { AnimatePresence, m, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

export type StickyStep = { title: string; text: string; visual: React.ReactNode; caption?: string };

/**
 * Desktop: the section pins while you scroll — a big step number, title and text on the left change
 * per step, a progress line fills, and the large visual on the right morphs between steps.
 * Mobile / tablet: simple stacked cards with their visual.
 */
export function StickyScrollSteps({ steps }: { steps: StickyStep[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(steps.length - 1, Math.max(0, Math.floor(v * steps.length * 0.999)))));
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const s = steps[active];

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const per = (el.offsetHeight - window.innerHeight) / steps.length;
    window.scrollTo({ top: top + per * i + 4, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <>
      <div ref={ref} className="relative hidden lg:block" style={{ height: `${steps.length * 75 + 25}vh` }}>
        <div className="sticky top-16 flex h-[calc(100vh-4rem)] items-center py-8">
          <div className="grid w-full grid-cols-12 items-center gap-12">
            <div className="col-span-5">
              <div className="relative h-[clamp(96px,11vw,150px)] overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <m.p
                    key={active}
                    initial={{ y: "70%", opacity: 0, filter: "blur(8px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: "-70%", opacity: 0, filter: "blur(8px)" }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="text-gradient text-[clamp(96px,11vw,150px)] font-semibold leading-none tracking-[-0.06em] tabular"
                    aria-hidden
                  >
                    {String(active + 1).padStart(2, "0")}
                  </m.p>
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <m.div key={active} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                  <h3 className="mt-4 text-[34px] font-semibold tracking-[-0.03em] text-ink-900 xl:text-[42px]">{s.title}</h3>
                  <p className="mt-3 max-w-md text-[17px] leading-relaxed text-ink-500">{s.text}</p>
                </m.div>
              </AnimatePresence>

              <ol className="relative mt-10 space-y-1 pl-6" aria-label="Steps">
                <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-0.5 rounded-full bg-jade/15" />
                <m.span aria-hidden className="absolute left-[7px] top-2 w-0.5 rounded-full bg-gradient-to-b from-jade to-saffron" style={{ height: fill }} />
                {steps.map((st, i) => (
                  <li key={st.title}>
                    <button onClick={() => jump(i)} aria-current={active === i ? "step" : undefined} className="group relative flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left">
                      <span
                        className={cn(
                          "absolute -left-[22px] h-3.5 w-3.5 rounded-full border-2 transition-all duration-300",
                          i <= active ? "border-jade bg-jade shadow-[0_0_0_4px_rgb(var(--jade)/0.15)]" : "border-jade/30 bg-surface"
                        )}
                      />
                      <span className={cn("text-[12px] font-semibold tabular transition-colors", i === active ? "text-jade-700" : "text-jade-700/55")}>0{i + 1}</span>
                      <span className={cn("text-[16px] font-semibold transition-colors", i === active ? "text-ink-900" : "text-jade-700/60 group-hover:text-jade-700")}>{st.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <div className="col-span-7">
              <div className="card-premium relative h-[min(560px,66vh)] overflow-hidden rounded-[30px] p-3 shadow-pop">
                <div className="flex items-center gap-1.5 px-2 pb-3 pt-1" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-3 rounded-md bg-surface-3 px-3 py-0.5 text-[11px] text-ink-400">synerax · {s.caption ?? s.title.toLowerCase()}</span>
                </div>
                <div className="relative h-[calc(100%-2.25rem)]">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <m.div
                      key={active}
                      initial={{ opacity: 0, scale: 0.94, filter: "blur(10px)", rotateX: 8 }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)", rotateX: 0 }}
                      exit={{ opacity: 0, scale: 1.04, filter: "blur(10px)" }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 [perspective:1000px] [&>*]:h-full"
                    >
                      {s.visual}
                    </m.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ol className="grid gap-4 sm:grid-cols-2 lg:hidden">
        {steps.map((st, i) => (
          <li key={st.title} className="card-premium overflow-hidden p-5">
            <div className="flex items-center gap-3">
              <span className="text-gradient text-[44px] font-semibold leading-none tracking-[-0.05em]">0{i + 1}</span>
              <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-900">{st.title}</h3>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{st.text}</p>
            <div className="mt-4 h-52">{st.visual}</div>
          </li>
        ))}
      </ol>
    </>
  );
}
