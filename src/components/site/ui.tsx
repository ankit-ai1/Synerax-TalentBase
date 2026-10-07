import {
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarCheck,
  Compass,
  Cpu,
  Crown,
  Factory,
  FileCheck2,
  Gauge,
  Globe,
  Handshake,
  Heart,
  HeartPulse,
  Landmark,
  Layers,
  LineChart,
  ListChecks,
  MessageSquare,
  RadioTower,
  Repeat,
  ShieldCheck,
  ShoppingBag,
  Target,
  Timer,
  TrendingUp,
  Truck,
  Users,
  UsersRound,
  Zap,
} from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { MagneticButton } from "./magnetic-button";

const ICONS = {
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarCheck,
  Compass,
  Cpu,
  Crown,
  Factory,
  FileCheck2,
  Gauge,
  Globe,
  Handshake,
  Heart,
  HeartPulse,
  Landmark,
  Layers,
  LineChart,
  ListChecks,
  MessageSquare,
  RadioTower,
  Repeat,
  ShieldCheck,
  ShoppingBag,
  Target,
  Timer,
  TrendingUp,
  Truck,
  Users,
  UsersRound,
  Zap,
};

/** Renders a lucide icon by the name used in src/content/site.ts */
export function SiteIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? BadgeCheck;
  return <Icon className={className} aria-hidden />;
}

/** Icon in a soft tinted tile */
export function IconTile({ name, className, tone = "jade" }: { name: string; className?: string; tone?: "jade" | "saffron" }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset",
        tone === "jade" ? "bg-jade-50 text-jade-700 ring-jade/15" : "bg-saffron-50 text-saffron-800 ring-saffron/20",
        className
      )}
    >
      <SiteIcon name={name} className="h-5 w-5" />
    </span>
  );
}

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

/** Dark-section decoration: glowing jade/saffron radial gradients + grid + noise */
export function DarkGlow({ variant = "a" }: { variant?: "a" | "b" }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_70%_at_50%_50%,black,transparent)]" />
      {variant === "a" ? (
        <>
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#159487]/30 blur-[110px]" />
          <div className="absolute -bottom-48 -right-32 h-[480px] w-[480px] rounded-full bg-[#F0B252]/15 blur-[110px]" />
        </>
      ) : (
        <>
          <div className="absolute left-1/2 top-[-260px] h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-[#159487]/30 blur-[120px]" />
          <div className="absolute -bottom-40 left-[-120px] h-[380px] w-[380px] rounded-full bg-[#F0B252]/10 blur-[100px]" />
        </>
      )}
      <div className="bg-noise absolute inset-0" />
    </div>
  );
}

type Tone = "canvas" | "surface" | "dark" | "muted";

export function Section({
  children,
  className,
  id,
  tone = "canvas",
  glow = "a",
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: Tone;
  glow?: "a" | "b";
  containerClassName?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative py-14 sm:py-20 lg:py-24",
        tone === "surface" && "border-y border-line bg-surface",
        tone === "muted" && "bg-surface-2",
        tone === "dark" && "section-dark overflow-hidden",
        className
      )}
    >
      {tone === "dark" && <DarkGlow variant={glow} />}
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-jade-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] backdrop-blur",
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-saffron opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-saffron" />
      </span>
      {children}
    </span>
  );
}

/** Renders `text`, wrapping `highlight` (if found) in gradient text */
export function Highlight({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight || !text.includes(highlight)) return <>{text}</>;
  const [a, b] = text.split(highlight);
  return (
    <>
      {a}
      <span className="text-gradient">{highlight}</span>
      {b}
    </>
  );
}

/** Words that stagger in when the heading scrolls into view */
function Words({ text, highlight, startDelay = 0 }: { text: string; highlight?: string; startDelay?: number }) {
  const words = text.split(" ");
  const hl = highlight?.split(" ") ?? [];
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className={cn("reveal-word", hl.includes(w) && "text-gradient")} style={{ ["--wd" as string]: `${startDelay + i * 45}ms` }}>
            {w}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  highlight,
  description,
  align = "center",
  badge,
  className,
}: {
  eyebrow?: string;
  title: string;
  highlight?: string;
  description?: string;
  align?: "center" | "left";
  badge?: boolean;
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-10 max-w-2xl sm:mb-14", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[42px] lg:text-[48px]">
        <Words text={title} highlight={highlight} />
        {badge && (
          <>
            {" "}
            <SampleBadge className="relative -top-1 align-middle" />
          </>
        )}
      </h2>
      {description && <p className="mt-4 text-pretty text-[15.5px] leading-relaxed text-ink-500 sm:text-[17px]">{description}</p>}
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

/** Animated hero background: gradient mesh + grid + noise */
export function HeroBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(75%_65%_at_50%_0%,black,transparent)]" />
      <div className="mesh-a absolute -top-48 left-[6%] h-[460px] w-[460px] rounded-full bg-jade/25 blur-[100px] will-change-transform" />
      <div className="mesh-b absolute -right-24 top-10 h-[420px] w-[420px] rounded-full bg-saffron/20 blur-[100px] will-change-transform" />
      <div className="mesh-c absolute bottom-[-180px] left-1/3 h-[360px] w-[360px] rounded-full bg-sky-400/10 blur-[100px] will-change-transform" />
      <div className="bg-noise absolute inset-0" />
    </div>
  );
}

/** Large heading with a CSS word-by-word entrance (used above the fold; no JS needed) */
export function HeroTitle({ text, highlight, className, as: Comp = "h1" }: { text: string; highlight?: string; className?: string; as?: "h1" | "h2" }) {
  const words = text.split(" ");
  const hl = highlight?.split(" ") ?? [];
  return (
    <Comp className={cn("text-balance font-semibold tracking-[-0.035em] text-ink-900", className)}>
      {words.map((w, i) => (
        <span key={i}>
          <span className={cn("word-in", hl.includes(w) && "text-gradient")} style={{ ["--d" as string]: `${80 + i * 70}ms` }}>
            {w}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Comp>
  );
}

/** Top-of-page header used on inner pages */
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
    <section className="relative isolate overflow-hidden border-b border-line">
      <HeroBackdrop />
      <Container className={cn("relative py-14 sm:py-20 lg:py-24", aside ? "grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]" : "text-center")}>
        <div>
          <div className="rise-in">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
          <HeroTitle
            text={title}
            highlight={highlight}
            className={cn("mt-5 text-[38px] leading-[1.04] sm:text-[54px] lg:text-[64px]", !aside && "mx-auto max-w-4xl")}
          />
          <p className={cn("rise-in mt-6 text-pretty text-[16.5px] leading-relaxed text-ink-500 sm:text-lg", aside ? "max-w-xl" : "mx-auto max-w-2xl")} style={{ ["--d" as string]: "350ms" }}>
            {description}
          </p>
          {children && (
            <div className={cn("rise-in mt-8 flex flex-wrap gap-3", !aside && "justify-center")} style={{ ["--d" as string]: "480ms" }}>
              {children}
            </div>
          )}
        </div>
        {aside && (
          <div className="rise-in" style={{ ["--d" as string]: "300ms" }}>
            {aside}
          </div>
        )}
      </Container>
    </section>
  );
}

/** Closing call-to-action: dark card with a border beam, glow and magnetic buttons */
export function CtaBand({
  title = "Ready to build your team?",
  text = "Tell us what you're hiring for and get a curated shortlist within days.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="py-14 sm:py-20 lg:py-24">
      <Container>
        <Reveal variant="scale" className="section-dark border-beam relative overflow-hidden rounded-[28px] px-6 py-14 text-center sm:px-12 sm:py-20">
          <DarkGlow variant="b" />
          <h2 className="mx-auto max-w-2xl text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[46px]">{title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-ink-500 sm:text-lg">{text}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <MagneticButton href="/employers" variant="light">
              Hire talent
            </MagneticButton>
            <MagneticButton href="/careers" variant="ghost-light">
              Find a job
            </MagneticButton>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
