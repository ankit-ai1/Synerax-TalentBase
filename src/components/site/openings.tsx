"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, Briefcase, Clock, MapPin } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

/** Openings with filter chips by city and type; cards re-flow with a layout animation */
export function OpeningsBoard() {
  const all = site.careers.openings;
  const cities = useMemo(() => Array.from(new Set(all.map((o) => o.city))), [all]);
  const types = useMemo(() => Array.from(new Set(all.map((o) => o.type))), [all]);
  const [city, setCity] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const list = all.filter((o) => (!city || o.city === city) && (!type || o.type === type));

  const Chip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
        active ? "border-jade bg-jade text-white shadow-glow" : "border-line bg-surface text-ink-600 hover:border-line-strong hover:text-ink-900"
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6" role="group" aria-label="Filter openings">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400">City</span>
          <Chip label="All" active={!city} onClick={() => setCity(null)} />
          {cities.map((c) => (
            <Chip key={c} label={c} active={city === c} onClick={() => setCity(city === c ? null : c)} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400">Type</span>
          <Chip label="All" active={!type} onClick={() => setType(null)} />
          {types.map((t) => (
            <Chip key={t} label={t} active={type === t} onClick={() => setType(type === t ? null : t)} />
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {list.length} openings shown
      </p>
      <m.ul layout className="grid gap-4 md:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((o) => (
            <m.li
              key={o.title}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="card-premium spotlight lift flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[17px] font-semibold text-ink-900">{o.title}</h3>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium", o.type === "Contract" ? "bg-saffron-50 text-saffron-800" : "bg-jade-50 text-jade-700")}>
                    {o.type}
                  </span>
                </div>
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-500">
                  <li className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" aria-hidden /> {o.city} · {o.mode}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" aria-hidden /> {o.experience}
                  </li>
                </ul>
                <a href="#submit" className="group mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-jade-700">
                  <Briefcase className="h-4 w-4" aria-hidden /> Apply with your profile
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </a>
              </div>
            </m.li>
          ))}
        </AnimatePresence>
      </m.ul>
      {list.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-ink-500">No openings match these filters right now — submit your profile and we&apos;ll reach out.</p>
      )}
    </div>
  );
}
