import { Minus, Sparkles, X } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

/** Engagement models comparison — sticky header, highlighted recommended column, horizontal scroll on mobile */
export function ModelsTable() {
  const m = site.employers.models;
  return (
    <Reveal>
      <div className="card-premium max-h-[560px] overflow-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-[14.5px]">
          <caption className="sr-only">Comparison of engagement models</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 top-0 z-20 border-b border-line bg-surface px-5 py-4">
                <span className="sr-only">Feature</span>
              </th>
              {m.columns.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className={cn(
                    "sticky top-0 z-10 border-b border-line px-5 py-4 text-[15px] font-semibold text-ink-900",
                    i === m.recommended ? "bg-jade-50" : "bg-surface"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {c}
                    {i === m.recommended && (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-jade px-2 py-0.5 text-[10.5px] font-semibold text-white">
                        <Sparkles className="h-3 w-3" aria-hidden /> Most popular
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.rows.map((r, ri) => (
              <tr key={r.label} className="group">
                <th scope="row" className={cn("sticky left-0 z-10 bg-surface px-5 py-4 font-medium text-ink-500", ri < m.rows.length - 1 && "border-b border-line")}>
                  {r.label}
                </th>
                {r.values.map((v, i) => (
                  <td
                    key={i}
                    className={cn(
                      "px-5 py-4 text-ink-800 transition-colors group-hover:bg-surface-2/60",
                      ri < m.rows.length - 1 && "border-b border-line",
                      i === m.recommended && "bg-jade-50/60 font-medium"
                    )}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-center text-xs text-ink-400 md:hidden">Swipe the table sideways to compare.</p>
    </Reveal>
  );
}

function DrawCheck({ delay }: { delay: number }) {
  return (
    <svg viewBox="0 0 24 24" className="check-draw h-4 w-4" aria-hidden style={{ ["--d" as string]: `${delay}ms` }}>
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "Why Synerax" — rows reveal one by one, checks draw in, the Synerax column glows (designed for a dark section) */
export function ComparisonTable() {
  const c = site.comparison;
  const cols = "grid-cols-[1fr_84px_84px] sm:grid-cols-[1fr_150px_150px]";
  return (
    <div className="card-premium relative overflow-hidden">
      {/* glowing Synerax column */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-[84px] w-[84px] sm:right-[150px] sm:w-[150px]">
        <div className="absolute inset-0 bg-gradient-to-b from-jade/25 via-jade/10 to-jade/5" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-jade/0 via-jade/70 to-jade/0" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-jade/0 via-jade/70 to-jade/0" />
        <div className="absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-jade/40 blur-2xl" />
      </div>
      <div className={cn("relative grid items-center border-b border-line px-4 py-5 text-[13px] font-semibold sm:px-6", cols)}>
        <span className="text-ink-400">What you get</span>
        <span className="text-center text-[14px] text-jade-700">{c.columns[0]}</span>
        <span className="text-center text-ink-400">{c.columns[1]}</span>
      </div>
      <ul className="relative">
        {c.rows.map((r, i) => (
          <Reveal as="li" key={r.label} delay={i * 110} className={cn("grid items-center border-b border-line px-4 py-4 last:border-0 sm:px-6", cols)}>
            <span className="pr-3 text-[15px] text-ink-700">{r.label}</span>
            {r.values.map((v, vi) => (
              <span key={vi} className="flex justify-center">
                {v ? (
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", vi === 0 ? "bg-jade text-white shadow-[0_0_24px_-2px_rgb(var(--jade)/0.8)]" : "bg-fg/10 text-ink-500")}>
                    <DrawCheck delay={i * 110 + 250} />
                    <span className="sr-only">Yes</span>
                  </span>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fg/[0.04] text-ink-400">
                    {vi === 0 ? <Minus className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
                    <span className="sr-only">No</span>
                  </span>
                )}
              </span>
            ))}
          </Reveal>
        ))}
      </ul>
      <p className="relative px-6 py-3 text-[12px] text-ink-400">“Typical agency” reflects common industry practice, not any specific company.</p>
    </div>
  );
}
