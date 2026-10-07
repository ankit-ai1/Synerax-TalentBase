import { Quote } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";
import { Marquee } from "./marquee";

type T = (typeof site.testimonials)[number];

const initials = (s: string) =>
  s
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

function TestimonialCard({ t, className }: { t: T; className?: string }) {
  return (
    <figure className={cn("card-premium relative flex w-[320px] shrink-0 flex-col justify-between overflow-hidden p-6 sm:w-[380px]", className)}>
      <Quote className="absolute left-5 top-4 h-7 w-7 text-jade/15" aria-hidden />
      <blockquote className="relative mt-7 text-[15px] leading-relaxed text-ink-700">“{t.quote}”</blockquote>
      <figcaption className="relative mt-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-jade-50 text-[12px] font-semibold text-jade-700" aria-hidden>
          {initials(t.role)}
        </span>
        <span>
          <span className="block text-[14px] font-semibold text-ink-900">{t.role}</span>
          <span className="block text-[12.5px] text-ink-400">{t.company}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/** Two rows of testimonial cards moving in opposite directions (placeholder content) */
export function TestimonialMarquee() {
  const half = Math.ceil(site.testimonials.length / 2);
  const a = site.testimonials.slice(0, half);
  const b = site.testimonials.slice(half);
  return (
    <div className="space-y-4">
      <Marquee speed={55}>
        {a.map((t) => (
          <TestimonialCard key={t.quote} t={t} />
        ))}
      </Marquee>
      <Marquee speed={60} reverse>
        {b.map((t) => (
          <TestimonialCard key={t.quote} t={t} />
        ))}
      </Marquee>
    </div>
  );
}

/** One large featured quote with an animated border beam */
export function FeaturedQuote() {
  const t = site.testimonials[0];
  return (
    <figure className="card-premium border-beam relative mx-auto max-w-4xl overflow-hidden p-8 sm:p-12">
      <Quote className="absolute left-8 top-7 h-10 w-10 text-jade/15 sm:left-12 sm:top-9" aria-hidden />
      <blockquote className="relative mt-10 text-balance text-[20px] font-medium leading-relaxed tracking-[-0.01em] text-ink-900 sm:text-[26px]">“{t.quote}”</blockquote>
      <figcaption className="relative mt-7 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-jade to-[#0B5E58] text-sm font-semibold text-white" aria-hidden>
          {initials(t.role)}
        </span>
        <span>
          <span className="block text-[15px] font-semibold text-ink-900">{t.role}</span>
          <span className="block text-[13px] text-ink-400">{t.company}</span>
        </span>
      </figcaption>
    </figure>
  );
}
