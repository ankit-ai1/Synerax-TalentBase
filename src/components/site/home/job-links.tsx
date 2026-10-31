import Link from "next/link";
import { ArrowRight, ArrowUpRight, Globe2, Laptop, MapPin, Shuffle } from "lucide-react";
import { FEATURED_LANDINGS } from "@/lib/seo/landing";
import { Band, SectionCta, SectionHead, Wrap } from "../connection/motif";

const CITIES = FEATURED_LANDINGS.filter((l) => l.label.startsWith("Jobs in ") && l.label !== "Jobs in India").map((l) => ({ href: l.href, name: l.label.replace("Jobs in ", "") }));
const WAYS = [
  { href: "/jobs/remote", title: "Remote jobs", text: "Work from anywhere", icon: Laptop },
  { href: "/jobs/hybrid", title: "Hybrid jobs", text: "Home and office days", icon: Shuffle },
  { href: "/jobs/india", title: "Jobs in India", text: "Every city, every mode", icon: Globe2 },
];

/** "Browse jobs" on the home page: city tiles plus a dark work-mode panel, linking to the main job landing pages */
export function JobLinks() {
  return (
    <Band tone="alt" label="Browse jobs" className="py-20 sm:py-28">
      <Wrap>
        <SectionHead
          label="Browse jobs"
          title="Find your next role, your way"
          highlight="your way"
          description="Live openings from employers hiring through Synerax. Pick a city or a way of working. It's always free for candidates."
          action={<SectionCta href="/careers">See all openings</SectionCta>}
        />
        <div className="grid gap-4 lg:grid-cols-12">
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-8 lg:grid-cols-4">
            {CITIES.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="card-premium lift group flex h-full min-h-[132px] flex-col justify-between p-4 sm:p-5">
                  <span className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-jade-50 text-jade-700 ring-1 ring-inset ring-jade/15 transition-colors duration-300 group-hover:bg-jade group-hover:text-white">
                      <MapPin className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-ink-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-jade-700" aria-hidden />
                  </span>
                  <span className="mt-5">
                    <span className="block text-[12px] font-medium text-ink-400">Jobs in</span>
                    <span className="block text-[17px] font-semibold tracking-[-0.02em] text-ink-900 sm:text-[18px]">{c.name}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="section-dark relative flex flex-col overflow-hidden rounded-[28px] p-5 sm:p-6 lg:col-span-4">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[rgb(var(--p-500)/0.4)] blur-3xl" />
            <p className="relative text-[12px] font-semibold uppercase tracking-[0.14em] text-jade-700">Work your way</p>
            <ul className="relative mt-4 flex flex-1 flex-col gap-2">
              {WAYS.map((w) => (
                <li key={w.href} className="flex-1">
                  <Link href={w.href} className="group flex h-full items-center gap-3 rounded-2xl bg-fg/[0.06] p-3.5 transition-colors hover:bg-fg/10">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fg/[0.08] text-jade-700">
                      <w.icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-ink-900">{w.title}</span>
                      <span className="block truncate text-[12.5px] text-ink-500">{w.text}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-500 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Wrap>
    </Band>
  );
}
