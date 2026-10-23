import Link from "next/link";
import { FEATURED_LANDINGS } from "@/lib/seo/landing";
import { Container } from "../ui";

/** compact "Browse jobs" strip on the home page — links to the main job landing pages */
export function JobLinks() {
  return (
    <section className="band band-light py-14 sm:py-16" aria-labelledby="browse-jobs-h">
      <Container wide>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-10">
          <div className="lg:w-64 lg:shrink-0">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-jade-700">Browse jobs</p>
            <h2 id="browse-jobs-h" className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-ink-900">
              By city & work mode
            </h2>
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {FEATURED_LANDINGS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex rounded-full border border-line bg-surface px-4 py-2 text-[14px] font-medium text-ink-700 transition-colors hover:border-jade hover:text-jade-700">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
