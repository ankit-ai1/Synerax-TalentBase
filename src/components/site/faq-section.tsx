import Link from "next/link";
import { ArrowRight, Mail, MessageCircle, Phone } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "./reveal";
import { Faq, FaqTabs } from "./faq";
import { Eyebrow, Section } from "./ui";

type Item = { q: string; a: string };

/** FAQ: heading + contact card on the left, accordion on the right */
export function FaqSection({
  title = "Questions, answered",
  description = "Can't find what you're looking for? Our team is happy to help.",
  items,
  employers,
  candidates,
  tone = "pattern",
}: {
  title?: string;
  description?: string;
  items?: readonly Item[];
  employers?: readonly Item[];
  candidates?: readonly Item[];
  tone?: "pattern" | "mint" | "canvas";
}) {
  const wa = site.contact.whatsapp.replace(/\D/g, "");
  return (
    <Section tone={tone}>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink-900 sm:text-[44px] lg:text-[54px]">{title}</h2>
          <p className="mt-4 max-w-md text-[16.5px] leading-relaxed text-ink-500">{description}</p>
          <div className="section-dark relative mt-8 overflow-hidden rounded-[24px] p-6 sm:p-7">
            <div aria-hidden className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[rgb(var(--p-600)/0.5)] blur-3xl" />
            <p className="relative text-[18px] font-semibold text-ink-900">Talk to a real person</p>
            <p className="relative mt-1 text-[14px] text-ink-500">{site.contact.responseTime}.</p>
            <ul className="relative mt-5 space-y-2.5 text-[14.5px]">
              <li>
                <a href={`mailto:${site.contact.email}`} className="flex items-center gap-3 text-ink-700 hover:text-ink-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fg/[0.06] text-jade-700">
                    <Mail className="h-4 w-4" aria-hidden />
                  </span>
                  {site.contact.email}
                </a>
              </li>
              <li>
                <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 text-ink-700 hover:text-ink-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fg/[0.06] text-jade-700">
                    <Phone className="h-4 w-4" aria-hidden />
                  </span>
                  {site.contact.phone}
                </a>
              </li>
              {wa && (
                <li>
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-ink-700 hover:text-ink-900">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fg/[0.06] text-emerald-400">
                      <MessageCircle className="h-4 w-4" aria-hidden />
                    </span>
                    WhatsApp us
                  </a>
                </li>
              )}
            </ul>
            <Link href="/contact" className="relative mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-jade-700 hover:underline">
              Contact page <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={100} className="lg:col-span-7">
          {employers && candidates ? <FaqTabs employers={employers} candidates={candidates} /> : <Faq items={items ?? []} />}
        </Reveal>
      </div>
    </Section>
  );
}
