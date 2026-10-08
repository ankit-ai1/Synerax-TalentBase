import { cn } from "@/lib/utils";

/**
 * Synerax TalentBase mark: a rounded-square tile with a geometric "S" built from two offset strokes
 * and a small ember notch. Graphite tile in light mode; light tile in dark mode and on always-dark
 * surfaces (.dark / .band-dark / .on-dark / [data-brand-invert]). Hover (on a .brand parent): the two
 * strokes slide apart slightly and the notch glows.
 */
export function BrandMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cn("brand-mark shrink-0", className)} aria-hidden>
      <rect className="brand-tile" x="2" y="2" width="60" height="60" rx="16" />
      <g fill="none" strokeWidth="5.4" strokeLinecap="round" strokeLinejoin="round">
        <path className="brand-s brand-s1" d="M43 19 H28.5 A7.5 7.5 0 0 0 28.5 34 H33" />
        <path className="brand-s brand-s2" d="M31 30 H35.5 A7.5 7.5 0 0 1 35.5 45 H21" />
      </g>
      <circle className="brand-notch" cx="50" cy="14" r="3.6" />
    </svg>
  );
}

/** Full wordmark: mark + "Synerax TalentBase" ("Base" in ember). `variant="mark"` renders the mark only. */
export function BrandLogo({ variant = "full", size = 34, className, textClassName, sub }: { variant?: "full" | "mark"; size?: number; className?: string; textClassName?: string; sub?: React.ReactNode }) {
  return (
    <span className={cn("brand inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      {variant === "full" && (
        <span className="flex flex-col justify-center leading-none">
          <span className={cn("whitespace-nowrap text-[19px] tracking-[-0.03em]", textClassName)}>
            <span className="font-semibold text-ink-900">Synerax</span>{" "}
            <span className="font-medium text-ink-500">
              Talent<span className="ember-text font-semibold">Base</span>
            </span>
          </span>
          {sub && <span className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">{sub}</span>}
        </span>
      )}
    </span>
  );
}

/** The mark as standalone SVG markup (favicon / apple-touch icon), always on the graphite tile */
export const BRAND_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="16" fill="#38240D"/><g fill="none" stroke="#FDFBD4" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"><path d="M43 19 H28.5 A7.5 7.5 0 0 0 28.5 34 H33"/><path d="M31 30 H35.5 A7.5 7.5 0 0 1 35.5 45 H21"/></g><circle cx="50" cy="14" r="3.6" fill="#C05800"/></svg>`;
