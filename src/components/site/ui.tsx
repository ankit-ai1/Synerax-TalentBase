import { SiteIcon } from "./site-icon";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { MagneticButton } from "./magnetic-button";
import { Silk } from "./silk";
import { MaskTitle } from "./connection/motif";
import { MetricBoard } from "./home/metric-board";
import { CtaSplit } from "./home/cta-split";

export { SiteIcon };

/** Icon in a soft tinted tile */
export function IconTile({ name, className, tone = "jade" }: { name: string; className?: string; tone?: "jade" | "saffron" }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset",
        tone === "jade" ? "bg-gradient-to-br from-jade-50 to-jade-100/60 text-jade-700 ring-jade/20" : "bg-saffron-50 text-saffron-800 ring-saffron/25",
        className
      )}
    >
      <SiteIcon name={name} className="h-5 w-5" />
    </span>
  );
}

/** Full-width container: up to 1440px (1600px with `wide`), fluid side padding */
export function Container({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("site-container", wide && "wide", className)}>{children}</div>;
}

/** Dark-section decoration: glowing jade/amber gradients + grid + noise */
export function DarkGlow({ variant = "a" }: { variant?: "a" | "b" }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_70%_at_50%_50%,black,transparent)]" />
      {variant === "a" ? (
        <>
          <div className="aurora-a absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-[rgb(var(--p-600)/0.35)] blur-[120px]" />
          <div className="aurora-b absolute -bottom-48 -right-32 h-[520px] w-[520px] rounded-full bg-[rgb(var(--a-500)/0.15)] blur-[120px]" />
        </>
      ) : (
        <>
          <div className="aurora-a absolute left-1/2 top-[-260px] h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-[rgb(var(--p-600)/0.35)] blur-[130px]" />
          <div className="aurora-b absolute -bottom-40 left-[-120px] h-[420px] w-[420px] rounded-full bg-[rgb(var(--a-500)/0.12)] blur-[110px]" />
        </>
      )}
      <div className="bg-noise absolute inset-0" />
    </div>
  );
}

type Tone = "canvas" | "surface" | "dark" | "muted" | "mint" | "pattern" | "light";

/** Page section. tone "dark" renders the alternate light band (theme-following); always-dark bands are only the metrics, final CTA and footer. */
export function Section({
  children,
  className,
  id,
  tone = "light",
  containerClassName,
  wide,
  index,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: Tone;
  glow?: "a" | "b";
  containerClassName?: string;
  wide?: boolean;
  index?: string;
  label?: string;
}) {
  const alt = tone === "dark" || tone === "surface" || tone === "muted";
  return (
    <section id={id} data-section={index} data-label={label} className={cn("band relative py-20 sm:py-24 lg:py-32", alt ? "band-alt" : "band-light", className)}>
      <Container wide={wide} className={containerClassName}>
        {children}
      </Container>
    </section>
  );
}

/** "● label" eyebrow with the pulsing node */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.18em] text-jade-700", className)}>
      {children}
    </span>
  );
}

/** Renders `text`, setting `highlight` (if found) in the ember gradient (same font as the heading) */
export function Highlight({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight || !text.includes(highlight)) return <>{text}</>;
  const [a, b] = text.split(highlight);
  return (
    <>
      {a}
      <span className="hl ember-text pr-[0.06em]">{highlight}</span>
      {b}
    </>
  );
}

/**
 * Section header. Default "split": label + title on the left, description / action on the right.
 */
export function SectionHeading({
  eyebrow,
  title,
  highlight,
  description,
  align = "split",
  badge,
  action,
  className,
  index,
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  description?: string;
  align?: "split" | "center" | "left";
  badge?: boolean;
  action?: React.ReactNode;
  className?: string;
  index?: string;
}) {
  const head = (
    <>
      {eyebrow && (
        <span className="flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.18em] text-jade-700">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-ink-900 sm:text-[48px] lg:text-[58px]">
        <MaskTitle title={title} highlight={highlight && title.includes(highlight) ? highlight : undefined} />
        {badge && (
          <>
            {" "}
            <SampleBadge className="relative -top-1 align-middle" />
          </>
        )}
      </h2>
    </>
  );
  if (align === "split") {
    return (
      <Reveal className={cn("mb-12 grid gap-6 sm:mb-16 lg:grid-cols-12 lg:items-end lg:gap-10", className)}>
        <div className="lg:col-span-7">{head}</div>
        {(description || action) && (
          <div className="lg:col-span-5 lg:pb-2">
            {description && <p className="text-pretty text-[17px] leading-relaxed text-ink-500">{description}</p>}
            {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
          </div>
        )}
      </Reveal>
    );
  }
  return (
    <Reveal className={cn("mb-12 max-w-3xl sm:mb-16", align === "center" && "mx-auto text-center [&>span]:justify-center", className)}>
      {head}
      {description && <p className="mt-5 text-pretty text-[17px] leading-relaxed text-ink-500">{description}</p>}
      {action && <div className={cn("mt-7 flex flex-wrap gap-3", align === "center" && "justify-center")}>{action}</div>}
    </Reveal>
  );
}

/** Visible marker for placeholder content — controlled by site.showSampleBadges */
export function SampleBadge({ className }: { className?: string }) {
  if (!site.showSampleBadges) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-dashed border-saffron/60 bg-saffron-50 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-saffron-800",
        className
      )}
      title="Placeholder content — replace in src/content/site.ts"
    >
      Sample data
    </span>
  );
}

/** Soft silk glow background (no shapes) */
export function HeroBackdrop({ className }: { className?: string }) {
  return <Silk className={className} focus={[0.72, 0.5]} />;
}

/** Large page title rising from a mask (CSS only, ends visible without JS): metal text, serif ember highlight with a light sweep */
export function HeroTitle({ text, highlight, className, as: Comp = "h1" }: { text: string; highlight?: string; className?: string; as?: "h1" | "h2" }) {
  const has = !!highlight && text.includes(highlight);
  const [a, b] = has ? text.split(highlight!) : [text, ""];
  return (
    <Comp className={cn("text-balance font-semibold tracking-[-0.045em] text-ink-900", className)}>
      <span className="rise-line">
        <span style={{ ["--d" as string]: "100ms" }}>
          <span className="metal box-decoration-clone">{a}</span>
          {has && <span className="hl ember-sweep box-decoration-clone pr-[0.08em]">{highlight}</span>}
          {b && <span className="metal box-decoration-clone">{b}</span>}
        </span>
      </span>
    </Comp>
  );
}

/** Inner-page hero: follows the theme (light in light mode), silk glow behind, text left and an animated visual right */
export function PageHero({
  eyebrow,
  title,
  highlight,
  description,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description: string;
  children?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="relative isolate -mt-16 overflow-clip bg-canvas pt-16">
      <Silk focus={aside ? [0.74, 0.5] : [0.8, 0.6]} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
      <Container wide className={cn("relative py-16 sm:py-24 lg:py-28", aside ? "grid items-center gap-12 lg:grid-cols-12 lg:gap-10" : "")}>
        <div className={cn(aside ? "lg:col-span-6" : "max-w-4xl")}>
          <div className="rise-in">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
          <HeroTitle text={title} highlight={highlight} className="mt-6 text-[42px] leading-[1.0] sm:text-[60px] lg:text-[70px] xl:text-[80px]" />
          <p className="rise-in mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-ink-600 sm:text-[19px]" style={{ ["--d" as string]: "380ms" }}>
            {description}
          </p>
          {children && (
            <div className="rise-in mt-9 flex flex-wrap gap-3" style={{ ["--d" as string]: "500ms" }}>
              {children}
            </div>
          )}
        </div>
        {aside && (
          <div className="rise-in lg:col-span-6" style={{ ["--d" as string]: "300ms" }}>
            {aside}
          </div>
        )}
      </Container>
    </section>
  );
}

export type Stat = { value: number; suffix?: string; prefix?: string; label: string; context?: string; icon?: string };

/** Stats on the graphite metrics band: odometer numbers, ember bars, cursor spotlight */
export function StatsStrip({ stats, sample, title, className, index }: { stats: readonly Stat[]; sample?: boolean; title?: string; className?: string; index?: string }) {
  return (
    <section data-section={index} data-label={title} className={cn("band band-dark relative py-20 sm:py-24", className)}>
      <Container>
        {(title || sample) && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            {title && <Eyebrow>{title}</Eyebrow>}
            {sample && <SampleBadge />}
          </div>
        )}
        <MetricBoard stats={stats} />
      </Container>
    </section>
  );
}

/** Closing call-to-action: the split "I'm hiring | I'm looking for a job" panel */
export function CtaBand({ title }: { title?: string; text?: string; primary?: { href: string; label: string }; secondary?: { href: string; label: string } }) {
  return <CtaSplit title={title} />;
}
