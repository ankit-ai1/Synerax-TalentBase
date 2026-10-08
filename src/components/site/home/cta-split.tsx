"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Band, Wrap } from "../connection/motif";
import { Reveal } from "../reveal";
import { Silk } from "../silk";

const SIDES = [
  {
    key: "hire",
    eyebrow: "I'm hiring",
    title: "Build your team with pre-screened talent",
    text: "Share the role and get a curated shortlist within days.",
    cta: { href: "/employers", label: "Hire talent" },
    icon: Building2,
    focus: [0.85, 0.85] as [number, number],
  },
  {
    key: "job",
    eyebrow: "I'm looking for a job",
    title: "Get matched to roles that fit you",
    text: "One profile, a real recruiter, and no fees — ever.",
    cta: { href: "/register", label: "Find a job" },
    icon: UserRound,
    focus: [0.15, 0.85] as [number, number],
  },
];

/** text that reveals word by word once its <Reveal> is in view */
function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i}>
          <span className="word-up" style={{ ["--i" as string]: i }}>
            {w}
          </span>{" "}
        </span>
      ))}
    </>
  );
}

/** Final split CTA (graphite band): the hovered side widens with a spring; a slow graphite→ember silk shader moves behind each side */
export function CtaSplit({ title = "Which side of the hire are you on?" }: { title?: string }) {
  const [hot, setHot] = useState<string | null>(null);
  return (
    <Band tone="dark" seamBottom={false} className="py-24 sm:py-28">
      <Wrap>
        <p className="mb-8 flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.18em] text-jade-700">
          {title}
        </p>
        <Reveal className="cta-row flex flex-col gap-4 lg:h-[440px] lg:flex-row" onMouseLeave={() => setHot(null)}>
          {SIDES.map((s) => (
            <Link
              key={s.key}
              href={s.cta.href}
              onMouseEnter={() => setHot(s.key)}
              onFocus={() => setHot(s.key)}
              className="cta-side group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-[32px] border border-line bg-surface p-8 sm:p-10 lg:min-h-0"
            >
              <Silk focus={s.focus} heat={0.9} amount={0.7} className={cn("transition-opacity duration-700", hot === s.key ? "opacity-100" : "opacity-60")} />
              <div aria-hidden className="absolute inset-0 -z-0 bg-gradient-to-t from-[rgb(var(--surface))] via-[rgb(var(--surface)/0.55)] to-transparent" />
              <div className="relative">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fg/[0.08] text-ink-900 ring-1 ring-fg/10">
                  <s.icon className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.18em] text-jade-700">{s.eyebrow}</p>
                <h2 className="mt-2 max-w-md text-balance text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[38px]">
                  <Words text={s.title} />
                </h2>
                <p className="mt-3 max-w-sm text-[16px] text-ink-600">{s.text}</p>
                <span className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-jade px-5 text-[15px] font-semibold text-white transition-[gap] group-hover:gap-3">
                  {s.cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </Reveal>
      </Wrap>
    </Band>
  );
}
