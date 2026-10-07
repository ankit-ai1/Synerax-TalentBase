"use client";

import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
function Tip({ active, payload, label, labelFormatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-[12px] shadow-pop">
      {label !== undefined && <p className="mb-1 font-semibold text-ink-900">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-ink-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.payload?.color }} />
          {p.name}: <b className="font-semibold text-ink-900">{p.value}</b>
        </p>
      ))}
    </div>
  );
}

export const CHART = {
  jade: "rgb(var(--jade))",
  saffron: "rgb(var(--saffron))",
  violet: "#8b5cf6",
  sky: "#38bdf8",
  emerald: "#10b981",
  ink: "rgb(var(--ink-400))",
};

/** Donut with a centred label */
export function Donut({ data, center, sub, className, size = 150 }: { data: { name: string; value: number; color: string }[]; center: React.ReactNode; sub?: string; className?: string; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = total ? data : [{ name: "None", value: 1, color: "rgb(var(--surface-3))" }];
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={shown} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" paddingAngle={total ? 2 : 0} stroke="none" startAngle={90} endAngle={-270} isAnimationActive>
            {shown.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          {total > 0 && <Tooltip content={<Tip />} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[24px] font-semibold leading-none tabular text-ink-900">{center}</span>
        {sub && <span className="mt-1 text-[10.5px] uppercase tracking-wider text-ink-400">{sub}</span>}
      </div>
    </div>
  );
}

/** Soft area chart for weekly activity */
export function WeeklyArea({ data, keys, className }: { data: Record<string, any>[]; keys: { key: string; name: string; color: string }[]; className?: string }) {
  return (
    <div className={cn("h-40 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
          <defs>
            {keys.map((k) => (
              <linearGradient key={k.key} id={`g-${k.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={k.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={k.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: "rgb(var(--ink-400))" }} interval="preserveStartEnd" minTickGap={18} />
          <Tooltip content={<Tip />} cursor={{ stroke: "rgb(var(--line-strong))", strokeDasharray: 3 }} />
          {keys.map((k) => (
            <Area key={k.key} type="monotone" dataKey={k.key} name={k.name} stroke={k.color} strokeWidth={2} fill={`url(#g-${k.key})`} dot={false} activeDot={{ r: 3.5 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
