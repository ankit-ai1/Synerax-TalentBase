import { site } from "@/content/site";
import { cn } from "@/lib/utils";

/**
 * Infinite marquee (CSS only). Children are rendered twice for a seamless loop;
 * the copy is hidden from assistive tech. Pauses on hover/focus, edge-fade masks.
 */
export function Marquee({
  children,
  reverse,
  speed = 40,
  className,
  gap = "gap-4",
}: {
  children: React.ReactNode;
  reverse?: boolean;
  speed?: number;
  className?: string;
  gap?: string;
}) {
  return (
    <div className={cn("marquee relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]", className)}>
      <div className={cn("marquee-track flex w-max", gap)} data-reverse={reverse ? "true" : undefined} style={{ ["--marquee-speed" as string]: `${speed}s` }}>
        <div className={cn("flex shrink-0 items-stretch", gap)}>{children}</div>
        <div className={cn("flex shrink-0 items-stretch", gap)} aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

const SHAPES = [
  <circle key="c" cx="10" cy="10" r="8" />,
  <rect key="r" x="2" y="2" width="16" height="16" rx="4" />,
  <path key="t" d="M10 2 18 17H2Z" />,
  <path key="d" d="M10 1 19 10 10 19 1 10Z" />,
];

/** Client logo strip. Logos are neutral placeholder marks — never real brand logos. */
export function LogoMarquee({ reverse }: { reverse?: boolean }) {
  return (
    <Marquee speed={36} reverse={reverse}>
      {site.clientLogos.map((name, i) => (
        <div key={name} className="flex h-14 shrink-0 items-center gap-2.5 rounded-xl border border-line bg-surface/70 px-5 text-ink-400">
          <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current opacity-70" aria-hidden>
            {SHAPES[i % SHAPES.length]}
          </svg>
          <span className="text-[15px] font-semibold tracking-tight">{name}</span>
        </div>
      ))}
    </Marquee>
  );
}
