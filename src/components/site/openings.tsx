"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowRight, Briefcase, Clock, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type Opening = { id: string; title: string; cities: string[]; mode: string | null; experience: string; type: string | null; href?: string; featured?: boolean; posted?: string | null; expMin?: number | null; expMax?: number | null };

const PAGE = 12;
const NEW_MS = 7 * 86400e3;
const BANDS = [
  { key: "0-2", label: "0–2 yrs", lo: 0, hi: 2 },
  { key: "2-5", label: "2–5 yrs", lo: 2, hi: 5 },
  { key: "5-10", label: "5–10 yrs", lo: 5, hi: 10 },
  { key: "10+", label: "10+ yrs", lo: 10, hi: 99 },
];
/** a job fits a band when its experience range overlaps it (no range = fits every band) */
const inBand = (o: Opening, b: (typeof BANDS)[number]) => (o.expMin == null && o.expMax == null) || ((o.expMin ?? 0) < b.hi && (o.expMax ?? 99) >= b.lo);

/** Live openings (published jobs) with filter chips by city and type; cards re-flow with a layout animation */
export function OpeningsBoard({ openings: all }: { openings: Opening[] }) {
  const cities = useMemo(() => Array.from(new Set(all.flatMap((o) => o.cities))), [all]);
  const types = useMemo(() => Array.from(new Set(all.map((o) => o.type).filter((t): t is string => !!t))), [all]);
  const modes = useMemo(() => ["Remote", "Hybrid", "Onsite"].filter((m) => all.some((o) => o.mode === m)), [all]);
  const bands = useMemo(() => BANDS.filter((b) => all.some((o) => (o.expMin != null || o.expMax != null) && inBand(o, b))), [all]);
  const [city, setCity] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [band, setBand] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const ql = q.trim().toLowerCase();
  const list = all.filter(
    (o) =>
      (!city || o.cities.includes(city)) &&
      (!type || o.type === type) &&
      (!mode || o.mode === mode) &&
      (!band || inBand(o, BANDS.find((b) => b.key === band)!)) &&
      (!ql || `${o.title} ${o.cities.join(" ")} ${o.mode ?? ""} ${o.type ?? ""}`.toLowerCase().includes(ql))
  );
  const visible = list.slice(0, shown);
  const isNew = (o: Opening) => !!o.posted && Date.now() - new Date(o.posted).getTime() < NEW_MS;

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
            <Chip key={c} label={c} active={city === c} onClick={() => (setCity(city === c ? null : c), setShown(PAGE))} />
          ))}
        </div>
        {modes.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400">Mode</span>
            <Chip label="All" active={!mode} onClick={() => setMode(null)} />
            {modes.map((m) => (
              <Chip key={m} label={m} active={mode === m} onClick={() => setMode(mode === m ? null : m)} />
            ))}
          </div>
        )}
        {bands.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400">Experience</span>
            <Chip label="Any" active={!band} onClick={() => setBand(null)} />
            {bands.map((b) => (
              <Chip key={b.key} label={b.label} active={band === b.key} onClick={() => setBand(band === b.key ? null : b.key)} />
            ))}
          </div>
        )}
        {types.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400">Type</span>
            <Chip label="All" active={!type} onClick={() => setType(null)} />
            {types.map((t) => (
              <Chip key={t} label={t} active={type === t} onClick={() => setType(type === t ? null : t)} />
            ))}
          </div>
        )}
      </div>

      {all.length > 6 && (
        <div className="relative mb-6 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input value={q} onChange={(e) => (setQ(e.target.value), setShown(PAGE))} placeholder="Search roles, skills or cities" aria-label="Search openings" className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-[14px] text-ink-900 outline-none focus:border-jade" data-testid="openings-search" />
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {list.length} openings shown
      </p>
      <m.ul layout className="grid gap-4 md:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((o) => (
            <m.li
              key={o.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="card-premium spotlight lift flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[17px] font-semibold text-ink-900">
                    {o.title}
                    {o.featured && <span className="ml-2 inline-block rounded-full bg-saffron-50 px-2 py-0.5 align-middle text-[11px] font-semibold text-saffron-800">Featured</span>}
                    {isNew(o) && <span className="ml-2 inline-block rounded-full bg-jade px-2 py-0.5 align-middle text-[11px] font-semibold text-white">New</span>}
                  </h3>
                  {o.type && (
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium", o.type === "Contract" ? "bg-saffron-50 text-saffron-800" : "bg-jade-50 text-jade-700")}>
                      {o.type}
                    </span>
                  )}
                </div>
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-500">
                  {(o.cities.length > 0 || o.mode) && (
                    <li className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" aria-hidden /> {[o.cities.join(" / "), o.mode].filter(Boolean).join(" · ")}
                    </li>
                  )}
                  {o.experience && (
                    <li className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" aria-hidden /> {o.experience}
                    </li>
                  )}
                </ul>
                <a href={o.href ?? "#submit"} className="group mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-jade-700">
                  <Briefcase className="h-4 w-4" aria-hidden /> {o.href ? "View & apply" : "Apply with your profile"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </a>
              </div>
            </m.li>
          ))}
        </AnimatePresence>
      </m.ul>
      {list.length > shown && (
        <div className="mt-8 text-center">
          <button onClick={() => setShown((n) => n + PAGE)} className="rounded-full border border-line px-5 py-2.5 text-[14px] font-semibold text-ink-700 hover:border-line-strong hover:text-ink-900" data-testid="openings-more">
            Load more ({list.length - shown} more)
          </button>
        </div>
      )}
      {list.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-ink-500">{all.length === 0 ? "No open roles right now" : "No openings match these filters right now"} — submit your profile and we&apos;ll reach out.</p>
      )}
    </div>
  );
}
