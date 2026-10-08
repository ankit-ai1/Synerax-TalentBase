/** Looping, CSS-only service illustrations built from the node motif (decorative, aria-hidden) */
import { cn } from "@/lib/utils";

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-full w-full overflow-hidden rounded-2xl border border-jade/15 bg-gradient-to-br from-[rgb(var(--band-light))] to-surface", className)}>
      {children}
    </div>
  );
}

/** Contract staffing — a calendar whose days fill as resources are deployed */
export function CalendarFill() {
  return (
    <Frame className="flex flex-col p-5">
      <div className="flex items-center justify-between text-[12px] font-semibold text-ink-700">
        <span>Deployment calendar</span>
        <span className="rounded-full bg-jade-50 px-2 py-0.5 text-[11px] text-jade-700">12 resources</span>
      </div>
      <div className="mt-3 grid flex-1 grid-cols-7 gap-1.5">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="cal-cell rounded-md bg-gradient-to-br from-[rgb(var(--accent-a))] to-[rgb(var(--accent-b))]"
            style={{ ["--d" as string]: `${(i % 7) * 0.12 + Math.floor(i / 7) * 0.35}s`, opacity: 0.15 }}
          />
        ))}
      </div>
    </Frame>
  );
}

/** RPO — candidate nodes flowing through the hiring funnel */
export function PipelineFlow() {
  const stages = ["Sourced", "Screened", "Interview", "Hired"];
  return (
    <Frame className="flex flex-col justify-center gap-3 p-5">
      {stages.map((s, r) => (
        <div key={s} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-[11px] font-semibold text-ink-500">{s}</span>
          <div className="relative h-7 flex-1 overflow-hidden rounded-full bg-jade/10">
            {Array.from({ length: 4 - r }).map((_, k) => (
              <span key={k} className="flow-x absolute inset-0" style={{ ["--d" as string]: `${k * 0.8 + r * 0.3}s` }}>
                <span className={cn("absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full", r === 3 ? "bg-[rgb(var(--success))] shadow-[0_0_10px_rgb(var(--success))]" : "bg-[rgb(var(--accent-b))]")} />
              </span>
            ))}
          </div>
        </div>
      ))}
    </Frame>
  );
}

/** Executive search — a spotlight roams over many nodes and finds the one */
export function SpotlightFind() {
  const dots = Array.from({ length: 48 }, (_, i) => ({ x: 8 + (i % 8) * 12, y: 12 + Math.floor(i / 8) * 15 }));
  return (
    <Frame className="bg-[rgb(var(--band-dark))]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="1.4" fill="rgb(var(--accent-b))" opacity={0.35} />
        ))}
        <circle className="found" cx="56" cy="57" r="7" fill="none" stroke="rgb(var(--success))" strokeWidth="0.8" />
        <circle className="found" cx="56" cy="57" r="2.4" fill="rgb(var(--success))" />
      </svg>
      <div className="spot-roam absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(var(--fg)/0.22),transparent_65%)] mix-blend-screen" />
      <span className="found absolute bottom-3 left-3 rounded-full bg-[rgb(var(--success))] px-2.5 py-1 text-[11px] font-bold text-[rgb(var(--on-accent))]">VP Engineering — found</span>
    </Frame>
  );
}

/** Bulk hiring — a grid of nodes lighting up in waves */
export function WaveGrid() {
  const cols = 14,
    rows = 7;
  return (
    <Frame className="bg-[rgb(var(--band-dark))]">
      <svg viewBox={`0 0 ${cols * 10} ${rows * 10}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {Array.from({ length: cols * rows }).map((_, i) => {
          const x = (i % cols) * 10 + 5,
            y = Math.floor(i / cols) * 10 + 5;
          const d = Math.hypot(x - 5, y - rows * 5) / 60;
          return <circle key={i} className="wave-dot" cx={x} cy={y} r="2.1" fill={i % 9 === 0 ? "rgb(var(--success))" : "rgb(var(--accent-b))"} style={{ ["--d" as string]: `${d.toFixed(2)}s` }} />;
        })}
      </svg>
      <span className="absolute bottom-3 left-3 rounded-full bg-fg/10 px-2.5 py-1 text-[11px] font-semibold text-ink-900">240 hires · 1 drive</span>
    </Frame>
  );
}
