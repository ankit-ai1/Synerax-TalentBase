/**
 * The Synerax Connection motif — shared, server-safe pieces.
 */
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";

/** Two thin lines that cross into an "X" and glow as the section enters the viewport */
export function AxisDivider({ className, label }: { className?: string; label?: string }) {
  return (
    <Reveal variant="fade" className={cn("relative mx-auto flex w-full max-w-[1440px] items-center px-[clamp(20px,5vw,80px)]", className)}>
      <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="h-12 w-full overflow-visible sm:h-14" aria-hidden>
        <defs>
          <linearGradient id="axis-l" x1="0" x2="1">
            <stop offset="0" stopColor="rgb(var(--accent-a))" stopOpacity="0" />
            <stop offset="1" stopColor="rgb(var(--accent-b))" />
          </linearGradient>
          <linearGradient id="axis-r" x1="1" x2="0">
            <stop offset="0" stopColor="rgb(var(--accent-a))" stopOpacity="0" />
            <stop offset="1" stopColor="rgb(var(--accent-b))" />
          </linearGradient>
          <radialGradient id="axis-g">
            <stop offset="0" stopColor="rgb(var(--accent-b))" stopOpacity="0.9" />
            <stop offset="1" stopColor="rgb(var(--accent-b))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path className="axis-line" pathLength={1} d="M0 52 C 420 52, 520 52, 600 30 S 780 8, 1200 8" fill="none" stroke="url(#axis-l)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path className="axis-line" style={{ ["--dd" as string]: "0.15s" }} pathLength={1} d="M1200 52 C 780 52, 680 52, 600 30 S 420 8, 0 8" fill="none" stroke="url(#axis-r)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <circle className="axis-glow" cx="600" cy="30" r="22" fill="url(#axis-g)" />
        <circle className="axis-glow" cx="600" cy="30" r="3.5" fill="rgb(var(--accent-b))" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </Reveal>
  );
}

/** The Synerax mark: an X drawn from connected nodes (people ↔ companies meeting at an axis) */
export function LogoMark({ className, animated }: { className?: string; animated?: boolean }) {
  const nodes = [
    [8, 8, 0],
    [32, 8, 1],
    [14, 14, 0],
    [26, 14, 1],
    [20, 20, 2],
    [14, 26, 1],
    [26, 26, 0],
    [8, 32, 1],
    [32, 32, 0],
  ] as const;
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="mark-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--accent-a, 13 148 136))" />
          <stop offset="1" stopColor="rgb(var(--accent-b, 45 230 180))" />
        </linearGradient>
      </defs>
      <path d="M8 8 L32 32 M32 8 L8 32" stroke="url(#mark-g)" strokeWidth="2.2" strokeLinecap="round" className={animated ? "intro-link" : undefined} pathLength={animated ? 1 : undefined} style={animated ? ({ ["--nd" as string]: "0.42s" } as React.CSSProperties) : undefined} />
      {nodes.map(([x, y, k], i) =>
        k === 1 ? (
          <rect key={i} x={x - 2.4} y={y - 2.4} width="4.8" height="4.8" rx="1.2" fill="url(#mark-g)" className={animated ? "intro-node" : undefined} style={animated ? ({ ["--nd" as string]: `${i * 0.035}s`, ["--fx" as string]: `${(i % 3) * 40 - 40}px`, ["--fy" as string]: `${(i % 2) * 60 - 30}px` } as React.CSSProperties) : undefined} />
        ) : (
          <circle key={i} cx={x} cy={y} r={k === 2 ? 3.6 : 2.6} fill={k === 2 ? "rgb(var(--success, 245 176 65))" : "url(#mark-g)"} className={animated ? "intro-node" : undefined} style={animated ? ({ ["--nd" as string]: `${i * 0.035}s`, ["--fx" as string]: `${(i % 3) * -40 + 40}px`, ["--fy" as string]: `${(i % 2) * -60 + 30}px` } as React.CSSProperties) : undefined} />
        )
      )}
    </svg>
  );
}

/** "● How it works" — small eyebrow label (index is kept for anchors/analytics but not shown) */
export function SectionLabel({ index, label, className }: { index?: string; label: string; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.18em] text-jade-700", className)}>
      <span>{label}</span>
    </p>
  );
}

/**
 * Heading words rise from a mask with a slight skew settle (metal gradient); the highlight phrase uses the same
 * sans font in the ember gradient, arrives last, and gets a thin straight ember bar that grows left → right. Must sit inside a <Reveal>.
 */
export function MaskTitle({ title, highlight }: { title: string; highlight?: string }) {
  const at = highlight ? title.indexOf(highlight) : -1;
  const before = (at >= 0 ? title.slice(0, at) : title).split(" ").filter(Boolean);
  const hl = at >= 0 && highlight ? highlight.split(" ") : [];
  const after = at >= 0 && highlight ? title.slice(at + highlight.length).split(" ").filter(Boolean) : [];
  const plain = [...before, ...after];
  let i = 0;
  const word = (w: string, k: string, cls: string, idx: number) => (
    <span key={k}>
      <span className="mw">
        <span className={cls} style={{ ["--i" as string]: idx }}>
          {w}
        </span>
      </span>{" "}
    </span>
  );
  return (
    <>
      <span className="sr-only">{title}</span>
      <span aria-hidden>
        {before.map((w, k) => word(w, "b" + k, "metal", i++))}
        {hl.length > 0 && (
          <span className="pen hl" style={{ ["--n" as string]: plain.length + hl.length }}>
            {hl.map((w, k) => word(w, "h" + k, "ember-text", plain.length + k))}
            <span className="hl-bar" aria-hidden />
          </span>
        )}
        {hl.length > 0 && after.length > 0 && " "}
        {after.map((w, k) => word(w, "a" + k, "metal", before.length + k))}
      </span>
    </>
  );
}

/** Section heading with label, big title (highlight = ember gradient words) and optional right-side text / action */
export function SectionHead({
  index,
  label,
  title,
  highlight,
  description,
  action,
  className,
  center,
  stack,
}: {
  index?: string;
  label: string;
  title: string;
  highlight?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  center?: boolean;
  /** plain stacked block (for narrow columns) */
  stack?: boolean;
}) {
  const parts = highlight && title.includes(highlight) ? title.split(highlight) : null;
  const h = (
    <h2 className={cn("mt-4 text-balance pt-[0.04em] text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-ink-900 sm:text-[48px]", stack ? "lg:text-[52px]" : "lg:text-[60px]", center && "mx-auto max-w-4xl")}>
      <MaskTitle title={title} highlight={parts ? highlight : undefined} />
    </h2>
  );
  if (stack)
    return (
      <Reveal className={cn("mb-8", className)}>
        <SectionLabel index={index} label={label} />
        {h}
        {description && <p className="mt-5 max-w-xl text-pretty text-[17px] leading-relaxed text-ink-500">{description}</p>}
        {action && <div className="mt-7 flex flex-wrap gap-3">{action}</div>}
      </Reveal>
    );
  if (center)
    return (
      <Reveal className={cn("mb-12 text-center sm:mb-16", className)}>
        <SectionLabel index={index} label={label} className="justify-center" />
        {h}
        {description && <p className="mx-auto mt-5 max-w-2xl text-pretty text-[17px] leading-relaxed text-ink-500">{description}</p>}
        {action && <div className="mt-7 flex flex-wrap justify-center gap-3">{action}</div>}
      </Reveal>
    );
  return (
    <Reveal className={cn("mb-12 grid gap-6 sm:mb-16 lg:grid-cols-12 lg:items-end lg:gap-10", className)}>
      <div className="lg:col-span-7">
        <SectionLabel index={index} label={label} />
        {h}
      </div>
      {(description || action) && (
        <div className="lg:col-span-5 lg:pb-2">
          {description && <p className="text-pretty text-[17px] leading-relaxed text-ink-500">{description}</p>}
          {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
        </div>
      )}
    </Reveal>
  );
}

/** A full-bleed band. Dark bands meet their light neighbours with a short, clean gradient seam. */
export function Band({
  tone,
  children,
  className,
  id,
  index,
  label,
  seamTop = true,
  seamBottom = true,
  as: Comp = "section",
}: {
  /** light = page bg, alt = alternate light band, dark = always-dark (metrics, final CTA, footer only) */
  tone: "dark" | "light" | "alt";
  children: React.ReactNode;
  className?: string;
  id?: string;
  index?: string;
  label?: string;
  seamTop?: boolean;
  seamBottom?: boolean;
  as?: "section" | "div" | "footer";
}) {
  return (
    <Comp
      id={id}
      data-section={index}
      data-label={label}
      className={cn("band", tone === "dark" ? "band-dark" : tone === "alt" ? "band-alt" : "band-light", tone === "dark" && !seamTop && "no-seam-top", tone === "dark" && !seamBottom && "no-seam-bottom", className)}
    >
      {children}
    </Comp>
  );
}

export function Wrap({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("site-container", wide && "wide", className)}>{children}</div>;
}
