/**
 * Small decorative, CSS-animated illustrations (no images). All are aria-hidden;
 * animations stop with prefers-reduced-motion (see globals.css).
 */
import { BadgeCheck, CalendarDays, CheckCircle2, Crown, FileSignature, Search, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const AV = ["AK", "SR", "MV", "NP", "DT", "RG", "PI", "KM", "VB", "AS", "HJ", "LT"];

function Avatar({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-jade to-[rgb(var(--p-800))] text-[10px] font-bold text-white ring-2 ring-surface", className)}>
      {text}
    </span>
  );
}

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-full w-full overflow-hidden rounded-2xl border border-line bg-surface-2/80", className)}>
      {children}
    </div>
  );
}

/* ---------------- Services ---------------- */

export function PermanentVisual() {
  return (
    <Frame className="flex items-center justify-center p-5">
      <div className="w-full max-w-[280px] rounded-xl border border-line bg-surface p-3 shadow-card">
        <div className="flex items-center gap-2.5">
          <Avatar text="AS" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-ink-900">Senior Java Developer</p>
            <p className="text-[10.5px] text-ink-400">Joining in 15 days</p>
          </div>
          <span className="stack-in inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <BadgeCheck className="h-3 w-3" /> Offer signed
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1">
          {["Brief", "Screen", "Interview", "Offer"].map((s, i) => (
            <div key={s} className="flex-1">
              <div className="h-1 overflow-hidden rounded-full bg-ink-300/25">
                <div className="bar-grow h-full origin-left rounded-full bg-jade" style={{ ["--d" as string]: `${i * 0.25}s`, transformOrigin: "left" }} />
              </div>
              <p className="mt-1 text-center text-[9px] text-ink-400">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function ContractVisual() {
  return (
    <Frame className="flex items-center justify-center p-5 [perspective:600px]">
      <div className="relative w-[150px]">
        <div className="rounded-t-xl bg-jade px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-white">Contract</div>
        <div className="relative h-[108px] rounded-b-xl border border-t-0 border-line bg-surface">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <CalendarDays className="h-5 w-5 text-jade" />
            <p className="mt-1 text-[26px] font-semibold leading-none text-ink-900">6</p>
            <p className="text-[10px] text-ink-400">months</p>
          </div>
          {/* a page that flips over the top, revealing the date beneath */}
          <div className="flip-page absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-none border-b border-line bg-surface-2">
            <p className="pt-3 text-center text-[26px] font-semibold leading-none text-ink-300">5</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-1">
          {["Payroll", "PF/ESI", "Extensions"].map((t) => (
            <span key={t} className="rounded-full border border-line bg-surface px-2 py-0.5 text-[9.5px] text-ink-500">
              {t}
            </span>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function ContractToHireVisual() {
  return (
    <Frame className="flex flex-col items-center justify-center gap-3 p-5">
      <div className="relative flex w-[200px] rounded-full border border-line bg-surface p-1 text-[11px] font-semibold">
        <span className="slide-loop absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-jade/15 ring-1 ring-jade/50" style={{ ["--slide" as string]: "100%" }} />
        <span className="relative z-10 flex-1 py-1.5 text-center text-ink-700">Contract</span>
        <span className="relative z-10 flex-1 py-1.5 text-center text-ink-700">Permanent</span>
      </div>
      <p className="text-[10.5px] text-ink-400">Convert when you&apos;re confident</p>
    </Frame>
  );
}

export function RpoVisual() {
  const bars = [38, 54, 46, 70, 62, 84, 92];
  return (
    <Frame className="flex flex-col p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-ink-700">Hires / month</p>
        <span className="rounded-full bg-jade-50 px-2 py-0.5 text-[9.5px] font-semibold text-jade-700">SLA on track</span>
      </div>
      <div className="mt-3 flex flex-1 items-end gap-1.5">
        {bars.map((h, i) => (
          <div key={i} className="bar-grow flex-1 rounded-t-md bg-gradient-to-t from-jade/60 to-jade" style={{ height: `${h}%`, ["--d" as string]: `${i * 0.12}s` }} />
        ))}
      </div>
    </Frame>
  );
}

export function ExecutiveVisual() {
  return (
    <Frame className="flex items-center justify-center p-5">
      <div className="relative flex items-center gap-2">
        {["SR", "MV", "AK", "NP", "DT"].map((a, i) => (
          <div key={a} className={cn("relative", i === 2 ? "z-10" : "opacity-45")}>
            {i === 2 && <Crown className="absolute -top-5 left-1/2 h-4 w-4 -translate-x-1/2 text-saffron" />}
            <Avatar text={a} className={i === 2 ? "h-12 w-12 text-[12px] ring-4 ring-saffron/40" : ""} />
          </div>
        ))}
        <div className="spot-sweep pointer-events-none absolute inset-y-[-20px] left-1/2 w-16 -translate-x-1/2 rounded-full bg-fg/30 blur-xl dark:bg-fg/10" />
      </div>
    </Frame>
  );
}

export function BulkVisual() {
  return (
    <Frame className="flex items-center justify-center p-4">
      <div className="grid grid-cols-6 gap-1.5">
        {AV.map((a, i) => (
          <span key={a} className="stack-in" style={{ ["--d" as string]: `${i * 0.18}s` }}>
            <Avatar text={a} className="h-7 w-7 text-[8.5px]" />
          </span>
        ))}
      </div>
      <span className="absolute bottom-3 right-3 rounded-full bg-jade px-2 py-0.5 text-[10px] font-semibold text-white">+120 hires</span>
    </Frame>
  );
}

export const SERVICE_VISUALS: Record<string, () => React.ReactElement> = {
  permanent: PermanentVisual,
  contract: ContractVisual,
  "contract-to-hire": ContractToHireVisual,
  rpo: RpoVisual,
  executive: ExecutiveVisual,
  bulk: BulkVisual,
};

/* ---------------- How it works ---------------- */

function StepFrame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div aria-hidden className="card-premium relative h-full overflow-hidden p-5 sm:p-6">
      <div className="bg-dots absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" />
      <div className="relative flex items-center gap-1.5 border-b border-line pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 text-[12px] font-medium text-ink-400">{title}</span>
      </div>
      <div className="relative pt-5">{children}</div>
    </div>
  );
}

export function BriefVisual() {
  return (
    <StepFrame title="New requirement">
      <div className="space-y-3">
        {[
          ["Role", "Senior React Developer"],
          ["Experience", "5–8 years"],
          ["Location", "Pune · Hybrid"],
          ["Budget", "₹24–30 LPA"],
        ].map(([k, v], i) => (
          <div key={k}>
            <p className="text-[11px] font-medium text-ink-400">{k}</p>
            <div className="mt-1 flex h-10 items-center rounded-lg border border-line bg-surface px-3 text-[13px] text-ink-800">
              <span className="typing inline-block" style={{ animationDelay: `${0.3 + i * 0.5}s` }}>
                {v}
              </span>
              {i === 3 && <span className="caret ml-0.5 h-4 w-px bg-jade" />}
            </div>
          </div>
        ))}
      </div>
    </StepFrame>
  );
}

export function SearchVisual() {
  return (
    <StepFrame title="Talent search">
      <div className="flex h-11 items-center gap-2 rounded-xl border border-jade/40 bg-surface px-3 shadow-glow">
        <Search className="h-4 w-4 text-jade" />
        <span className="text-[13px] text-ink-700">react, typescript, pune, 5+ yrs</span>
      </div>
      <ul className="mt-4 space-y-2">
        {[
          ["AS", "React · 6 yrs · Pune", 94],
          ["NP", "React, Node · 5 yrs", 89],
          ["KM", "Frontend · 7 yrs · Remote", 84],
          ["RG", "React Native · 5 yrs", 78],
        ].map(([a, t, s], i) => (
          <li key={a as string} className="rise-in flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5" style={{ ["--d" as string]: `${i * 0.25}s` }}>
            <Avatar text={a as string} />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-700">{t}</span>
            <span className="text-[12px] font-semibold tabular text-jade-700">{s}%</span>
          </li>
        ))}
      </ul>
    </StepFrame>
  );
}

export function ShortlistVisual() {
  return (
    <StepFrame title="Shortlist · 3 candidates">
      <div className="space-y-3">
        {[
          ["AS", "Aditi S.", "Strong React & system design", 94],
          ["NP", "Nikhil P.", "Great communication, 30-day notice", 89],
          ["KM", "Kavya M.", "Product mindset, immediate joiner", 86],
        ].map(([a, n, note, s], i) => (
          <div key={a as string} className={cn("rounded-xl border bg-surface p-3", i === 0 ? "border-jade/40 shadow-glow" : "border-line")}>
            <div className="flex items-center gap-3">
              <Avatar text={a as string} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink-900">{n}</p>
                <p className="truncate text-[11.5px] text-ink-400">{note}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-jade-50 px-2 py-0.5 text-[11px] font-semibold text-jade-700">
                <Star className="h-3 w-3" /> {s}
              </span>
            </div>
          </div>
        ))}
        <p className="flex items-center gap-1.5 text-[12px] text-ink-500">
          <Sparkles className="h-3.5 w-3.5 text-saffron" /> Screening notes attached to every profile
        </p>
      </div>
    </StepFrame>
  );
}

export function OfferVisual() {
  return (
    <StepFrame title="Offer letter">
      <div className="relative rounded-xl border border-line bg-surface p-5">
        <FileSignature className="h-6 w-6 text-jade" />
        <p className="mt-3 text-[15px] font-semibold text-ink-900">Offer of employment</p>
        <div className="mt-3 space-y-2">
          <span className="block h-2 w-full rounded-full bg-ink-300/30" />
          <span className="block h-2 w-11/12 rounded-full bg-ink-300/30" />
          <span className="block h-2 w-4/5 rounded-full bg-ink-300/30" />
        </div>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <svg viewBox="0 0 120 30" className="h-8 w-28 text-ink-700">
              <path className="draw-line" d="M2 22 C 18 4, 26 30, 40 14 S 62 8, 70 20 S 96 6, 118 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="block h-px w-28 bg-line-strong" />
            <p className="mt-1 text-[10px] text-ink-400">Candidate signature</p>
          </div>
          <span className="stack-in inline-flex -rotate-6 items-center gap-1 rounded-lg border-2 border-emerald-500/60 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Accepted
          </span>
        </div>
      </div>
    </StepFrame>
  );
}

/* ---------------- Employers hero ---------------- */

export function EmployerDashboardVisual() {
  const r = 34;
  const len = 2 * Math.PI * r;
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[520px]">
      <div className="card-premium relative overflow-hidden rounded-[28px] p-5 shadow-pop">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-ink-400">Requirement</p>
            <p className="text-[15px] font-semibold text-ink-900">Backend Engineer × 3</p>
          </div>
          <div className="relative h-20 w-20">
            <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
              <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" className="stroke-ink-300/25" />
              <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" strokeLinecap="round" className="ring-fill stroke-saffron" strokeDasharray={len} strokeDashoffset={len * 0.3} style={{ ["--ring-len" as string]: len }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[15px] font-semibold leading-none tabular text-ink-900">34h</span>
              <span className="text-[9px] text-ink-400">of 48h SLA</span>
            </div>
          </div>
        </div>
        <ul className="mt-4 space-y-2.5">
          {[
            ["AS", "Go, Kubernetes · 6 yrs", "Shortlisted", 93],
            ["NP", "Java, Spring · 5 yrs", "Shortlisted", 88],
            ["KM", "Node.js, AWS · 4 yrs", "Screening", 82],
          ].map(([a, t, st, s], i) => (
            <li key={a as string} className="rise-in flex items-center gap-3 rounded-xl border border-line bg-surface p-3" style={{ ["--d" as string]: `${i * 0.3}s` }}>
              <Avatar text={a as string} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-ink-800">{t}</p>
                <p className="text-[11px] text-ink-400">{st}</p>
              </div>
              <span className="text-[12px] font-semibold tabular text-jade-700">{s}%</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-jade-50 px-3 py-2.5 text-[12.5px] text-jade-700">
          <span className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="h-4 w-4" /> Shortlist shared with your team
          </span>
          <span className="text-[11px]">Illustrative</span>
        </div>
      </div>
    </div>
  );
}
