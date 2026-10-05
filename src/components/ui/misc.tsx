import { cn, initials } from "@/lib/utils";
import {
  CLIENT_STATUS_STYLE,
  JOB_STATUS_STYLE,
  PRIORITY_STYLE,
  RESULT_STYLE,
  STAGE_STYLE,
  STATUS_STYLE,
} from "@/lib/constants";

export function Card({ className, children, id }: { className?: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className={cn("rounded-xl border border-line bg-surface shadow-card", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-3.5", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 text-ink-400">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-ink-800">{title}</h3>
          {description && <p className="mt-0.5 text-[12.5px] text-ink-400">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Pill({ className, dot, children }: { className?: string; dot?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.New;
  return (
    <Pill className={cn(s.bg, s.text, className)} dot={s.dot}>
      {status}
    </Pill>
  );
}

export function StageBadge({ stage, className }: { stage: string; className?: string }) {
  const s = STAGE_STYLE[stage] ?? STAGE_STYLE.Sourced;
  return (
    <Pill className={cn(s.soft, s.text, className)} dot={s.dot}>
      {stage}
    </Pill>
  );
}

export function JobStatusBadge({ status, className }: { status: string; className?: string }) {
  return <Pill className={cn(JOB_STATUS_STYLE[status] ?? JOB_STATUS_STYLE.Draft, className)}>{status}</Pill>;
}

export function ClientStatusBadge({ status, className }: { status: string; className?: string }) {
  return <Pill className={cn(CLIENT_STATUS_STYLE[status] ?? CLIENT_STATUS_STYLE.Inactive, className)}>{status}</Pill>;
}

export function ResultBadge({ result, className }: { result: string; className?: string }) {
  return <Pill className={cn(RESULT_STYLE[result] ?? RESULT_STYLE.Pending, className)}>{result}</Pill>;
}

/** Signal-bars style priority — quick to read at a glance */
export function Priority({ value, showLabel = true, className }: { value: string; showLabel?: boolean; className?: string }) {
  const p = PRIORITY_STYLE[value] ?? PRIORITY_STYLE.Medium;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", p.text, className)} title={`Priority: ${value}`}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3, 4].map((b) => (
          <span key={b} className={cn("w-[3px] rounded-sm", b <= p.bars ? "bg-current" : "bg-ink-300/50")} style={{ height: 3 + b * 2.5 }} />
        ))}
      </span>
      {showLabel && value}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "jade" | "saffron" | "red" | "ink" | "outline";
  className?: string;
}) {
  const tones = {
    neutral: "bg-ink-800/[0.06] text-ink-700",
    jade: "bg-jade-50 text-jade-700",
    saffron: "bg-saffron-50 text-saffron-800 ring-1 ring-inset ring-saffron/40",
    red: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300",
    ink: "bg-ink-900 text-surface",
    outline: "ring-1 ring-inset ring-line-strong text-ink-600",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

const AVATAR_TONES = [
  "bg-[#DCE7F7] text-[#1E3A6B] dark:bg-[#1E3A6B]/50 dark:text-[#B9CEF0]",
  "bg-[#D2EEEA] text-[#0B5E58] dark:bg-[#0B5E58]/45 dark:text-[#9FE0D5]",
  "bg-[#FAE6C4] text-[#7A4B07] dark:bg-[#7A4B07]/45 dark:text-[#F5CF8E]",
  "bg-[#EADFF5] text-[#4B2A7A] dark:bg-[#4B2A7A]/50 dark:text-[#D3BFF0]",
  "bg-[#F6DCDC] text-[#7A2424] dark:bg-[#7A2424]/45 dark:text-[#F0B4B4]",
  "bg-[#E1ECD9] text-[#2F5A1E] dark:bg-[#2F5A1E]/50 dark:text-[#BEDDAA]",
];

export function Avatar({
  name,
  size = "md",
  className,
  square,
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  square?: boolean;
}) {
  const sum = [...(name || "?")].reduce((a, c) => a + c.charCodeAt(0), 0);
  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-xl",
    "2xl": "h-20 w-20 text-2xl",
  };
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold",
        square ? "rounded-lg" : "rounded-full",
        AVATAR_TONES[sum % AVATAR_TONES.length],
        sizes[size],
        className
      )}
      aria-hidden
    >
      {initials(name || "?")}
    </div>
  );
}

export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <div className="flex -space-x-2">
      {shown.map((n) => (
        <Avatar key={n} name={n} size="xs" className="ring-2 ring-surface" />
      ))}
      {names.length > max && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-[10px] font-medium text-ink-600 ring-2 ring-surface">
          +{names.length - max}
        </span>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 text-center", compact ? "py-8" : "py-14")}>
      {icon && (
        <div className="relative mb-4">
          <div className="absolute inset-0 -m-3 rounded-full bg-jade/5" />
          <div className="relative rounded-2xl border border-line bg-surface-2 p-3 text-ink-400 shadow-card">{icon}</div>
        </div>
      )}
      <p className="text-[15px] font-semibold text-ink-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
        {meta && <div className="mt-2.5">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating ${value ?? 0} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" className={(value ?? 0) >= n ? "fill-saffron" : "fill-ink-300/50"}>
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" />
        </svg>
      ))}
    </div>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1 font-sans text-[11px] font-medium text-ink-500",
        className
      )}
    >
      {children}
    </kbd>
  );
}

export function Progress({ value, max = 100, tone = "jade", className }: { value: number; max?: number; tone?: "jade" | "saffron" | "ink"; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const tones = { jade: "bg-jade", saffron: "bg-saffron", ink: "bg-ink-600" };
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-surface-3", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-surface-3", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-surface/60 to-transparent" />
    </div>
  );
}

/** Score ring — job match / skill match */
export function ScoreRing({ value, size = 44, label }: { value: number; size?: number; label?: string }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const tone = value >= 80 ? "stroke-jade" : value >= 55 ? "stroke-saffron" : "stroke-ink-300";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={label ?? `${value}% match`}>
      <svg viewBox="0 0 40 40" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3.5" className="stroke-surface-3" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - Math.max(0, Math.min(100, value)) / 100)}
          className={cn(tone, "transition-[stroke-dashoffset] duration-700")}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-semibold tabular tracking-tight text-ink-800" style={{ fontSize: Math.max(8.5, Math.min(13, size * 0.25)) }}>
        {value}
      </span>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-ink-500">{label}</p>
        {icon && <span className="text-ink-300">{icon}</span>}
      </div>
      <p className={cn("mt-1 text-[26px] font-semibold leading-none tracking-tight tabular", accent ? "text-jade-700" : "text-ink-900")}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[13px] font-semibold text-ink-600">{children}</h2>
      {action}
    </div>
  );
}
