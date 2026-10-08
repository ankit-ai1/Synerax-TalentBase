"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Layers, MapPin, Users } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Band, SectionHead, Wrap } from "../connection/motif";
import { IconTile, SampleBadge } from "../ui";
import { Marquee } from "../marquee";
import { Reveal } from "../reveal";
import { TiltCard } from "../tilt-card";
import { CITIES, DOTS, HUB, LABELS, MAP_H, MAP_W, SECTOR_MAP, type City } from "./map-data";

const ROUTE_SLOTS = Math.max(...Object.values(SECTOR_MAP).map((v) => v.cities.length));

/** The India dot map with routes from the hub to the selected sector cities */
function MapSvg({ sel }: { sel: number }) {
  const ind = site.industries[sel];
  const data = SECTOR_MAP[ind.title] ?? { cities: [] as City[], fill: 0, open: 0 };
  const lit = new Set<string>(data.cities);
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="mx-auto w-full max-w-[620px]" role="img" aria-label={`Map of India highlighting ${ind.title} hiring hotspots: ${data.cities.join(", ")}`}>
      <defs>
        <linearGradient id="route-g" x1="0" x2="1">
          <stop offset="0" stopColor="rgb(var(--accent-a))" />
          <stop offset="1" stopColor="rgb(var(--accent-b))" />
        </linearGradient>
        <radialGradient id="hub-g">
          <stop offset="0" stopColor="rgb(var(--accent-b))" stopOpacity="0.6" />
          <stop offset="1" stopColor="rgb(var(--accent-b))" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* the outline draws in top → bottom as the section is revealed */}
      <g fill="rgb(var(--accent-a))" opacity="0.32">
        {DOTS.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="2.1" className="map-dot" style={{ ["--d" as string]: `${((d.y / MAP_H) * 1.1 + (d.x / MAP_W) * 0.25).toFixed(2)}s` }} />
        ))}
      </g>
      {/* fixed route slots: changing sector morphs each curve to its new city (CSS d-transition) */}
      {Array.from({ length: ROUTE_SLOTS }).map((_, i) => {
        const c = data.cities[i];
        const p = c ? CITIES[c] : HUB;
        const mx = (HUB.x + p.x) / 2 + (p.y - HUB.y) * 0.25;
        const my = (HUB.y + p.y) / 2 - (p.x - HUB.x) * 0.25;
        const d = `M${HUB.x} ${HUB.y} Q ${mx} ${my} ${p.x} ${p.y}`;
        return (
          <g key={i} style={{ opacity: c ? 1 : 0, transition: "opacity 0.4s" }}>
            <path d={d} style={{ d: `path("${d}")` } as React.CSSProperties} fill="none" stroke="url(#route-g)" strokeWidth="2" className="route-path" />
            <path d={d} style={{ d: `path("${d}")` } as React.CSSProperties} fill="none" stroke="rgb(var(--accent-b))" strokeWidth="2.5" className="route-path route-flow" opacity="0.85" />
          </g>
        );
      })}
      <circle cx={HUB.x} cy={HUB.y} r="26" fill="url(#hub-g)" />
      <g transform={`translate(${HUB.x - 9} ${HUB.y - 9})`}>
        <path d="M2 2 L16 16 M16 2 L2 16" stroke="rgb(var(--success))" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      {(Object.keys(CITIES) as City[]).map((c, i) => {
        const p = CITIES[c];
        const on = lit.has(c);
        return (
          <g key={c} opacity={on ? 1 : 0.45}>
            <line x1={p.x} y1={p.y} x2={LABELS[c].x + (LABELS[c].anchor === "end" ? 3 : -3)} y2={LABELS[c].y - 4} stroke="rgb(var(--ink-400))" strokeWidth="1" strokeDasharray="2 2" />
            {on && <circle className="hot-pulse" cx={p.x} cy={p.y} r="8" fill="rgb(var(--accent-b))" style={{ ["--d" as string]: `${i * 0.25}s` }} />}
            <circle key={on ? `${c}-${sel}` : c} cx={p.x} cy={p.y} r={on ? 5.5 : 3.5} fill={on ? "rgb(var(--success))" : "rgb(var(--accent-a))"} stroke="rgb(var(--surface))" strokeWidth="2" className={on ? "pin-drop" : undefined} style={{ ["--d" as string]: `${0.15 + data.cities.indexOf(c) * 0.09}s`, transformBox: "fill-box", transformOrigin: "center bottom" }} />
            <text x={LABELS[c].x} y={LABELS[c].y} textAnchor={LABELS[c].anchor} style={{ fill: on ? "rgb(var(--ink-900))" : "rgb(var(--ink-500))" }} className="text-[12px] font-semibold">
              {c}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Interactive India hiring map: line-art reveal, routes that morph between sectors, pins that drop, gentle 3D tilt */
export function IndiaMap() {
  const [sel, setSel] = useState(0);
  const ind = site.industries[sel];
  const data = SECTOR_MAP[ind.title] ?? { cities: [] as City[], fill: 0, open: 0 };

  return (
    <Band tone="light" index="05" label="Industries" className="py-24 sm:py-32">
      <Wrap>
        <SectionHead index="05" label="Industries" title="Hiring across India, sector by sector" highlight="sector by sector" description="Pick a sector to see where we hire for it most — the lines reroute from our axis to that sector's hotspots." />
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <Reveal className="relative [perspective:1400px] lg:col-span-7">
            <TiltCard max={7} edge={false}>
            <MapSvg sel={sel} />
            </TiltCard>
          </Reveal>

          <div className="lg:col-span-5">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sectors">
              {site.industries.map((s, i) => (
                <button
                  key={s.title}
                  role="tab"
                  aria-selected={i === sel}
                  onClick={() => setSel(i)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-[13.5px] font-semibold transition-all",
                    i === sel ? "border-transparent bg-jade text-white shadow-glow" : "border-line bg-surface text-ink-700 hover:border-jade/50"
                  )}
                >
                  {s.title}
                </button>
              ))}
            </div>
            <div className="card-premium mt-6 p-6">
              <div className="flex items-start gap-4">
                <IconTile name={ind.icon} className="h-12 w-12 shrink-0" />
                <div>
                  <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-900">{ind.title}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-ink-500">{ind.description}</p>
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { icon: Users, label: "Role families", value: ind.roles.length },
                  { icon: Clock, label: "Avg. days to fill", value: data.fill },
                  { icon: Layers, label: "Open roles", value: data.open },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-[rgb(var(--band-light))] p-3">
                    <s.icon className="h-4 w-4 text-jade-700" aria-hidden />
                    <dd className="mt-2 text-[24px] font-semibold leading-none tabular text-ink-900">{s.value}</dd>
                    <dt className="mt-1 text-[11.5px] text-ink-500">{s.label}</dt>
                  </div>
                ))}
              </dl>
              <p className="mt-5 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-600">
                <MapPin className="h-4 w-4 text-success" aria-hidden /> {data.cities.join(" · ")}
              </p>
              <p className="mt-2 text-[13px] text-ink-500">
                <b className="font-semibold text-ink-800">Typical roles:</b> {ind.roles.join(", ")}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <SampleBadge />
                <Link href="/industries" className="inline-flex items-center gap-1 text-[14px] font-semibold text-jade-700 hover:underline">
                  All industries <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Wrap>
      <div className="mt-14 border-y border-jade/10 bg-surface/50 py-3">
        <Marquee speed={70} gap="gap-8">
          {site.roleMarquee.map((r) => (
            <span key={r} className="flex items-center gap-8 whitespace-nowrap text-[14px] font-medium text-ink-600">
              {r}
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-a))]" aria-hidden />
            </span>
          ))}
        </Marquee>
      </div>
    </Band>
  );
}
