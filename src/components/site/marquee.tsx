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

const MARKS: Record<string, React.ReactNode> = {
  circle: <circle cx="12" cy="12" r="9" />,
  ring: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" fillRule="evenodd" />,
  kite: <path d="M12 2 20 10 12 22 4 10Z" />,
  spark: <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4Z" />,
  stack: <path d="M12 3 22 8l-10 5L2 8Zm-7.6 8.4L12 15l7.6-3.6L22 13l-10 5-10-5Z" />,
  wave: <path d="M2 14c3-4 5-4 8 0s5 4 8 0 3-3 4-3v6c-1 0-2 1-4 3s-5 0-8-3-5-1-8 3Z" />,
  star: <path d="m12 2 2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7Z" />,
  drop: <path d="M12 2s7 7.6 7 12.5A7 7 0 0 1 5 14.5C5 9.6 12 2 12 2Z" />,
};
const FONT = ["font-semibold tracking-tight", "font-bold tracking-[-0.04em]", "font-medium lowercase tracking-tight", "font-bold tracking-[0.18em]", "font-semibold tracking-tight", "font-bold tracking-tight", "font-extrabold tracking-[0.12em]", "font-medium tracking-[-0.02em]"];

/** Client strip: monochrome text-logos of fictional companies; each reveals its colour on hover */
export function LogoMarquee({ reverse }: { reverse?: boolean }) {
  return (
    <Marquee speed={40} reverse={reverse} gap="gap-3 sm:gap-4">
      {site.clientLogos.map((l, i) => (
        <div
          key={l.name}
          style={{ ["--brand" as string]: l.color }}
          className="group flex h-16 shrink-0 cursor-default items-center gap-2.5 rounded-2xl border border-line/70 bg-surface/60 px-6 text-ink-400 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-[color:var(--brand)] hover:text-[color:var(--brand)] hover:shadow-[0_12px_30px_-16px_var(--brand)]"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current opacity-80 transition-transform duration-500 group-hover:rotate-12" aria-hidden>
            {MARKS[l.mark]}
          </svg>
          <span className={`text-[18px] ${FONT[i % FONT.length]}`}>{l.name}</span>
        </div>
      ))}
    </Marquee>
  );
}
