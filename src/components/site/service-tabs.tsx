"use client";

import { useEffect, useState } from "react";
import { Check, IndianRupee, Users } from "lucide-react";
import { site } from "@/content/site";
import { AnimatedTabs } from "./animated-tabs";
import { MagneticButton } from "./magnetic-button";
import { SiteIcon } from "./ui";
import { SERVICE_VISUALS } from "./visuals";

const SHORT: Record<string, string> = {
  permanent: "Permanent",
  contract: "Contract",
  "contract-to-hire": "Contract-to-hire",
  rpo: "RPO",
  executive: "Executive search",
  bulk: "Bulk hiring",
};

/** Services switcher — syncs with the URL hash (/services#contract) so menu links open the right tab */
export function ServiceTabs() {
  const slugs = site.services.map((s) => s.slug as string);
  const [active, setActive] = useState<string>(slugs[0]);

  useEffect(() => {
    const read = () => {
      const h = decodeURIComponent(location.hash.slice(1));
      if (slugs.includes(h)) {
        setActive(h);
        document.getElementById("service-tabs")?.scrollIntoView({ block: "start" });
      }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = (id: string) => {
    setActive(id);
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div id="service-tabs" className="scroll-mt-24">
      <AnimatedTabs
        ariaLabel="Staffing services"
        value={active}
        onChange={change}
        listClassName="mx-auto mb-8 w-fit"
        items={site.services.map((s) => {
          const Visual = SERVICE_VISUALS[s.slug];
          return {
            id: s.slug,
            label: (
              <>
                <SiteIcon name={s.icon} className="h-4 w-4" />
                <span className="whitespace-nowrap">{SHORT[s.slug] ?? s.title}</span>
              </>
            ),
            content: (
              <div className="card-premium grid gap-8 overflow-hidden p-6 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:p-10">
                <div>
                  <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[36px]">{s.title}</h2>
                  <p className="mt-4 text-[16px] leading-relaxed text-ink-500">{s.description}</p>

                  <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-4">
                    <Users className="mt-0.5 h-5 w-5 shrink-0 text-jade" aria-hidden />
                    <p className="text-[14.5px] text-ink-700">
                      <span className="font-semibold text-ink-900">Who it&apos;s for: </span>
                      {s.whoFor}
                    </p>
                  </div>

                  <h3 className="mt-7 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">What you get</h3>
                  <ul className="mt-3 space-y-2.5">
                    {s.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-[15px] text-ink-700">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-jade text-white">
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex items-start gap-3 text-[14px] text-ink-500">
                    <IndianRupee className="mt-0.5 h-4 w-4 shrink-0 text-saffron" aria-hidden />
                    <p>
                      <span className="font-semibold text-ink-800">Pricing: </span>
                      {s.pricing}
                    </p>
                  </div>

                  <div className="mt-8">
                    <MagneticButton href="/employers#request">Discuss {s.title.toLowerCase()}</MagneticButton>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="h-56">
                    <Visual />
                  </div>
                  <div className="rounded-2xl border border-line bg-surface-2/70 p-5">
                    <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">Timeline</h3>
                    <ol className="relative mt-5 grid grid-cols-4 gap-2">
                      <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-4 h-px bg-gradient-to-r from-jade via-jade/60 to-saffron" />
                      {s.process.map((p, n) => (
                        <li key={p} className="relative flex flex-col items-center text-center">
                          <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-[12px] font-semibold text-jade-700 shadow-card">
                            {n + 1}
                          </span>
                          <span className="mt-2 text-[11.5px] leading-snug text-ink-600 sm:text-[12.5px]">{p}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            ),
          };
        })}
      />
    </div>
  );
}
