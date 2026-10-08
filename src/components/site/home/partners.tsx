import fs from "node:fs";
import path from "node:path";
import { partners, partnerSlug, type Partner } from "@/data/partners";
import { cn } from "@/lib/utils";
import { Band, MaskTitle, SectionLabel, Wrap } from "../connection/motif";
import { TiltCard } from "../tilt-card";
import { Reveal } from "../reveal";

/** Distinct wordmark treatments so text-only logos don't all look the same */
const STYLES = [
  "font-semibold tracking-[-0.03em]",
  "font-bold uppercase tracking-[0.12em] text-[13px]",
  "font-extrabold tracking-[-0.04em]",
  "font-semibold tracking-[0.04em]",
  "font-black tracking-[-0.03em]",
  "font-bold uppercase tracking-[0.08em]",
];

const LOGO_EXT = ["svg", "png", "webp", "jpg", "jpeg"];

/** explicit `logo`, else a file in /public/partners/<slug>.<ext> (checked at build time) */
function logoFor(p: Partner) {
  if (p.logo) return p.logo;
  const slug = partnerSlug(p.name);
  for (const ext of LOGO_EXT) {
    if (fs.existsSync(path.join(process.cwd(), "public", "partners", `${slug}.${ext}`))) return `/partners/${slug}.${ext}`;
  }
  return undefined;
}

function initials(name: string) {
  const words = name.split(/\s+/);
  return (words.length > 1 ? words.slice(0, 2).map((w) => w[0]).join("") : name.slice(0, 2)).toUpperCase();
}

function PartnerLogo({ p, i, logo }: { p: Partner; i: number; logo?: string }) {
  const Tag = p.url ? "a" : "div";
  const detail = [p.industry, p.since ? `since ${p.since}` : ""].filter(Boolean).join(" · ");
  return (
    <Tag
      {...(p.url ? { href: p.url, target: "_blank", rel: "noopener noreferrer" } : detail ? { tabIndex: 0 } : {})}
      className="partner-logo group/logo relative flex h-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-line bg-surface px-2 py-5 text-center text-ink-400 shadow-card outline-none transition-[box-shadow,border-color] duration-300 hover:shadow-pop sm:gap-3 sm:px-4 lg:py-7"
      aria-label={detail ? `${p.name} — ${detail}` : p.name}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-8 w-auto max-w-[140px] object-contain opacity-70 grayscale transition duration-300 group-hover/logo:opacity-100 group-hover/logo:grayscale-0 dark:invert-[.85] dark:group-hover/logo:invert-0" loading="lazy" />
      ) : (
        <>
          <span className="partner-ink partner-mono flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11.5px] font-bold tracking-tight transition-colors duration-300" aria-hidden>
            {initials(p.name)}
          </span>
          <span className={cn("partner-ink flex min-h-10 items-center justify-center text-balance text-[13px] leading-tight transition-colors duration-300 sm:text-[16px]", STYLES[i % STYLES.length])} aria-hidden>
            {p.name}
          </span>
        </>
      )}
      <span aria-hidden className="scan" style={{ ["--i" as string]: i }} />
      {/* industry tooltip — only when there is something to say */}
      {detail && (
        <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full bg-ink-900 px-2.5 py-0.5 text-[11px] font-semibold text-canvas opacity-0 shadow-pop transition duration-200 group-hover/logo:translate-y-0 group-hover/logo:opacity-100 group-focus-visible/logo:translate-y-0 group-focus-visible/logo:opacity-100" aria-hidden>
          {detail}
        </span>
      )}
    </Tag>
  );
}

/** "Trusted by" — our partners: wave entrance, scanner sweep, 3D tilt with an ember edge light */
export function Partners() {
  const logos = partners.map(logoFor);
  return (
    <Band tone="light" index="01" label="Partners" className="py-20 sm:py-24">
      <Wrap>
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel label="Our partners" className="justify-center" />
          <h2 className="mt-4 text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-ink-900 sm:text-[46px] lg:text-[54px]">
            <MaskTitle title="Trusted by growing companies" highlight="growing companies" />
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-ink-500">Teams we work with to find the right people, role after role.</p>
        </Reveal>

        {/* 6 in one row on desktop, 3×2 on mobile; cards rise in a staggered wave */}
        <Reveal className="mt-12 grid grid-cols-3 gap-3 [perspective:1200px] sm:gap-4 lg:mt-14 lg:grid-cols-6">
          {partners.map((p, i) => (
            <div key={p.name} className="wave-item" style={{ ["--i" as string]: i }}>
              <TiltCard className="h-full rounded-2xl">
                <PartnerLogo p={p} i={i} logo={logos[i]} />
              </TiltCard>
            </div>
          ))}
        </Reveal>
      </Wrap>
    </Band>
  );
}
