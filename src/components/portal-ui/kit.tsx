/**
 * Shared building blocks for the client & candidate portals.
 * Pure components (no hooks) — usable from server and client components.
 */
import Link from "next/link";
import { ChevronRight, MapPin, Phone, Video, type LucideIcon } from "lucide-react";
import { cn, initials } from "@/lib/utils";

// ---------------------------------------------------------------- time (always IST)
const IST = "Asia/Kolkata";
export const istDate = (d: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(typeof d === "string" && d.length === 10 ? `${d}T00:00:00+05:30` : d).toLocaleDateString("en-IN", { timeZone: IST, ...opts });
export const istDateTime = (d: string | Date) =>
  new Date(d).toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) + " IST";
export const istTime = (d: string | Date) => new Date(d).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });
export const istDayKey = (d: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));

export function relTime(d: string | Date) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  const fut = diff < 0;
  const s = Math.abs(diff);
  const v = s < 60 ? null : s < 3600 ? `${Math.floor(s / 60)} min` : s < 86400 ? `${Math.floor(s / 3600)} hr` : s < 86400 * 30 ? `${Math.floor(s / 86400)} day${Math.floor(s / 86400) === 1 ? "" : "s"}` : null;
  if (!v) return s < 60 ? "just now" : istDate(d);
  return fut ? `in ${v}` : `${v} ago`;
}

/** "3 hr ago" with the exact IST date as a tooltip */
export function TimeAgo({ date, className, prefix }: { date: string | null | undefined; className?: string; prefix?: string }) {
  if (!date) return null;
  return (
    <time dateTime={new Date(date).toISOString()} title={istDateTime(date)} className={className} suppressHydrationWarning>
      {prefix}
      {relTime(date)}
    </time>
  );
}

export function greeting() {
  const h = Number(new Date().toLocaleString("en-IN", { timeZone: IST, hour: "numeric", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// ---------------------------------------------------------------- surfaces
export function Section({
  title,
  icon: Icon,
  count,
  href,
  linkLabel = "View all",
  action,
  children,
  className,
  bodyClassName,
  id,
  description,
}: {
  title: React.ReactNode;
  icon?: LucideIcon;
  count?: number;
  href?: string;
  linkLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
  description?: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("portal-card flex min-w-0 flex-col", className)}>
      <header className="flex items-center gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-jade-50 text-jade-700 ring-1 ring-inset ring-jade/15">
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-[15.5px] font-semibold tracking-[-0.01em] text-ink-900">
            <span className="truncate">{title}</span>
            {count !== undefined && count > 0 && (
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold tabular text-ink-600 ring-1 ring-inset ring-line">{count}</span>
            )}
          </h2>
          {description && <p className="mt-0.5 truncate text-[12.5px] text-ink-500">{description}</p>}
        </div>
        {action}
        {href && (
          <Link href={href} className="group inline-flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-[13px] font-medium text-jade-700 hover:bg-jade-50">
            {linkLabel}
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        )}
      </header>
      <div className={cn("flex-1 p-5 sm:p-6", bodyClassName)}>{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------- chips
export type Tone = "jade" | "saffron" | "violet" | "sky" | "emerald" | "red" | "ink";
const TONE: Record<Tone, { chip: string; dot: string }> = {
  jade: { chip: "bg-jade-50 text-jade-700 ring-jade/20", dot: "bg-jade" },
  saffron: { chip: "bg-saffron-50 text-saffron-800 ring-saffron/30", dot: "bg-saffron" },
  violet: { chip: "bg-violet-50 text-violet-700 ring-violet-500/20 dark:bg-violet-400/10 dark:text-violet-300", dot: "bg-violet-500" },
  sky: { chip: "bg-sky-50 text-sky-700 ring-sky-500/20 dark:bg-sky-400/10 dark:text-sky-300", dot: "bg-sky-500" },
  emerald: { chip: "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300", dot: "bg-emerald-500" },
  red: { chip: "bg-red-50 text-red-700 ring-red-500/20 dark:bg-red-500/10 dark:text-red-300", dot: "bg-red-500" },
  ink: { chip: "bg-surface-3 text-ink-600 ring-line", dot: "bg-ink-400" },
};
export const toneDot = (t: Tone) => TONE[t].dot;

export function Chip({ tone = "ink", children, className, pulse, dot = true }: { tone?: Tone; children: React.ReactNode; className?: string; pulse?: boolean; dot?: boolean }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset", TONE[tone].chip, className)}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", TONE[tone].dot)} />}
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", TONE[tone].dot)} />
        </span>
      )}
      {children}
    </span>
  );
}

export const JOB_STATUS_TONE: Record<string, Tone> = {
  "Pending review": "violet",
  Open: "jade",
  "On Hold": "saffron",
  Draft: "ink",
  Filled: "emerald",
  Closed: "ink",
};

export function SkillChip({ name, years, tone = "ink", className }: { name: string; years?: number | null; tone?: "ink" | "jade" | "missing"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium",
        tone === "jade" ? "bg-jade-50 text-jade-700" : tone === "missing" ? "border border-dashed border-line-strong text-ink-400" : "bg-surface-3 text-ink-700",
        className
      )}
    >
      {name}
      {years ? <span className="font-normal opacity-60">· {Number(years)}y</span> : null}
    </span>
  );
}

// ---------------------------------------------------------------- avatar
const GRADIENTS = [
  "from-[rgb(var(--p-400))] to-[rgb(var(--p-700))]",
  "from-amber-400 to-orange-600",
  "from-sky-400 to-indigo-600",
  "from-fuchsia-400 to-purple-600",
  "from-rose-400 to-red-600",
  "from-lime-400 to-green-600",
  "from-cyan-400 to-blue-600",
];
export function Avatar({ name, src, size = 40, className, ring }: { name: string; src?: string | null; size?: number; className?: string; ring?: boolean }) {
  const sum = [...(name || "?")].reduce((a, c) => a + c.charCodeAt(0), 0);
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={style} className={cn("shrink-0 rounded-full object-cover", ring && "ring-2 ring-surface", className)} />
  ) : (
    <span
      style={style}
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm", GRADIENTS[sum % GRADIENTS.length], ring && "ring-2 ring-surface", className)}
      aria-hidden
    >
      {initials(name || "?")}
    </span>
  );
}

// ---------------------------------------------------------------- match ring / progress
export function MatchRing({ value, size = 52, stroke = 5, label = "match", className }: { value: number | null | undefined; size?: number; stroke?: number; label?: string | null; className?: string }) {
  if (value === null || value === undefined) return null;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 75 ? "stroke-jade" : value >= 50 ? "stroke-saffron" : "stroke-ink-400";
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }} role="img" aria-label={`${value}% ${label ?? ""}`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className={cn(color, "transition-[stroke-dashoffset] duration-1000")} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-semibold tabular text-ink-900" style={{ fontSize: Math.max(10, size * 0.27) }}>
          {value}
          <span className="text-[0.6em] opacity-70">%</span>
        </span>
        {label && size >= 56 && <span className="mt-0.5 text-[9px] uppercase tracking-wider text-ink-400">{label}</span>}
      </span>
    </span>
  );
}

export function Bar({ value, max = 100, tone = "jade", className }: { value: number; max?: number; tone?: "jade" | "saffron" | "violet" | "ink"; className?: string }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  const color = { jade: "bg-jade", saffron: "bg-saffron", violet: "bg-violet-500", ink: "bg-ink-400" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width] duration-700", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Tiny inline trend line */
export function Sparkline({ data, className, tone = "jade" }: { data: number[]; className?: string; tone?: "jade" | "saffron" | "violet" }) {
  if (!data.length) return null;
  const w = 100;
  const h = 28;
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => [i * step, h - 3 - (v / max) * (h - 6)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const color = { jade: "rgb(var(--jade))", saffron: "rgb(var(--saffron))", violet: "#713600" }[tone];
  const id = `spark-${tone}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-7 w-full overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

// ---------------------------------------------------------------- hero, empty states, misc
export function Hero({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("relative isolate overflow-hidden rounded-[28px] border border-line bg-surface px-5 py-6 shadow-card sm:px-8 sm:py-8", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-a absolute -left-24 -top-32 h-80 w-80 rounded-full bg-jade/20 blur-3xl dark:bg-jade/25" />
        <div className="mesh-b absolute -right-20 -top-24 h-72 w-72 rounded-full bg-saffron/15 blur-3xl dark:bg-saffron/15" />
        <div className="mesh-c absolute -bottom-40 left-1/3 h-72 w-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="bg-dots mask-radial absolute inset-0 opacity-40" />
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  compact,
  className,
}: {
  icon: LucideIcon;
  title: string;
  text?: React.ReactNode;
  action?: { href: string; label: string } | React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const act =
    action && typeof action === "object" && "href" in (action as object) ? (
      <Link href={(action as { href: string }).href} className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-jade px-4 text-[13.5px] font-semibold text-white shadow-glow hover:brightness-110">
        {(action as { label: string }).label}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    ) : (
      (action as React.ReactNode)
    );
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong/80 bg-surface-2/40 text-center", compact ? "px-4 py-7" : "px-6 py-10", className)}>
      <span className="relative mb-3 flex h-14 w-14 items-center justify-center">
        <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-jade/20 to-saffron/10 blur-md" aria-hidden />
        <span className="absolute inset-0 rotate-6 rounded-2xl border border-line bg-surface" aria-hidden />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface shadow-card">
          <Icon className="h-6 w-6 text-jade-700" aria-hidden />
        </span>
      </span>
      <p className="text-[15px] font-semibold text-ink-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[13.5px] leading-relaxed text-ink-500">{text}</p>}
      {act}
    </div>
  );
}

/** Calendar-style date block for interview lists */
export function DateBlock({ date, tone = "violet" }: { date: string; tone?: "violet" | "jade" }) {
  const d = new Date(date);
  const month = d.toLocaleDateString("en-IN", { timeZone: IST, month: "short" });
  const day = d.toLocaleDateString("en-IN", { timeZone: IST, day: "numeric" });
  const wd = d.toLocaleDateString("en-IN", { timeZone: IST, weekday: "short" });
  return (
    <span className={cn("flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-xl border text-center", tone === "violet" ? "border-violet-500/25" : "border-jade/25")}>
      <span className={cn("w-full py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white", tone === "violet" ? "bg-violet-500" : "bg-jade")}>{month}</span>
      <span className="pt-1 text-[20px] font-semibold leading-none tabular text-ink-900">{day}</span>
      <span className="pb-1.5 text-[10.5px] text-ink-500">{wd}</span>
    </span>
  );
}

export const MODE_ICON: Record<string, LucideIcon> = { Video, Phone, "In-person": MapPin };

/** Small labelled stat used inside cards */
export function Fact({ icon: Icon, label, value, className }: { icon?: LucideIcon; label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-start gap-2.5", className)}>
      {Icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-ink-500">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <dt className="text-[11.5px] text-ink-400">{label}</dt>
        <dd className="truncate text-[14px] font-semibold text-ink-800">{value}</dd>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle, actions, eyebrow }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-jade-700">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink-900 sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14.5px] text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PrimaryLink({ href, children, className, variant = "primary" }: { href: string; children: React.ReactNode; className?: string; variant?: "primary" | "secondary" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-[14px] font-semibold transition-all",
        variant === "primary" ? "bg-jade text-white shadow-glow hover:brightness-110" : "border border-line bg-surface/80 text-ink-800 backdrop-blur hover:border-line-strong hover:bg-surface",
        className
      )}
    >
      {children}
    </Link>
  );
}

/** WhatsApp deep link for an Indian number */
export const waLink = (phone: string | null | undefined, text?: string) => {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const n = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};
