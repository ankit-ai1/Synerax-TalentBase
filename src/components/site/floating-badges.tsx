import { CalendarCheck, CheckCircle2, Sparkles, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { check: CheckCircle2, calendar: CalendarCheck, sparkles: Sparkles, user: UserCheck };
const TONES = { jade: "text-jade", saffron: "text-saffron", violet: "text-violet-500", sky: "text-sky-500" };

export type FloatingBadge = {
  title: string;
  sub?: string;
  icon: keyof typeof ICONS;
  tone?: keyof typeof TONES;
  className: string; // absolute position classes
  delay?: number; // seconds into the 9s cycle
};

/** Glass "notification" chips that appear and disappear around a hero visual (decorative) */
export function FloatingBadges({ badges }: { badges: FloatingBadge[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {badges.map((b) => {
        const Icon = ICONS[b.icon];
        return (
          <div
            key={b.title}
            className={cn("badge-cycle glass absolute z-20 hidden rounded-2xl px-3 py-2.5 shadow-pop sm:block", b.className)}
            style={{ ["--d" as string]: `${b.delay ?? 0}s` }}
          >
            <p className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold text-ink-900">
              <Icon className={cn("h-3.5 w-3.5", TONES[b.tone ?? "jade"])} /> {b.title}
            </p>
            {b.sub && <p className="whitespace-nowrap text-[11px] text-ink-400">{b.sub}</p>}
          </div>
        );
      })}
    </div>
  );
}
