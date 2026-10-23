import { ChevronDown } from "lucide-react";
import type { Faq } from "@/lib/seo/landing";

/** FAQ accordion (native <details>, works without JS) — used by blog posts and job landing pages */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="mt-6 divide-y divide-line rounded-2xl border border-line" data-testid="faq-list">
      {faqs.map((f) => (
        <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[16px] font-semibold text-ink-900">
            {f.q}
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-600">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
