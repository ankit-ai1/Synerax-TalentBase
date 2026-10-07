import Image from "next/image";
import { site } from "@/content/site";
import { SiteIcon } from "./ui";

/** Industry icons orbiting the logo (pure CSS rotation; static with reduced motion) */
export function IndustryOrbit() {
  const items = site.industries;
  return (
    <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[420px]">
      <div className="absolute inset-[14%] rounded-full border border-dashed border-line-strong" />
      <div className="absolute inset-[30%] rounded-full border border-line" />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(var(--jade)/0.18),transparent_60%)]" />

      <div className="absolute inset-[36%] flex items-center justify-center rounded-full border border-line bg-surface shadow-pop">
        <Image src="/logo.png" alt="" width={72} height={72} className="h-[46%] w-[46%] object-contain" />
      </div>

      <div className="orbit absolute inset-[14%]" style={{ ["--orbit-speed" as string]: "48s" }}>
        {items.map((it, i) => {
          const angle = (i / items.length) * 2 * Math.PI;
          const x = 50 + 50 * Math.cos(angle);
          const y = 50 + 50 * Math.sin(angle);
          return (
            <div key={it.title} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
              <div className="orbit-counter" style={{ ["--orbit-speed" as string]: "48s" }}>
                <span className="glass flex h-12 w-12 items-center justify-center rounded-2xl text-jade-700 shadow-pop sm:h-14 sm:w-14">
                  <SiteIcon name={it.icon} className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
