import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { site } from "@/content/site";
import { Container, DarkGlow } from "./ui";
import { MagneticButton } from "./magnetic-button";
import { BackToTop, NewsletterForm } from "./footer-client";
import { Logo } from "./navbar";

export const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  linkedin: (
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.83v1.54h.06c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.67 4.8 6.13V21h-4v-5.02c0-1.2-.02-2.74-1.67-2.74-1.67 0-1.93 1.3-1.93 2.65V21h-4V9.75Z" />
  ),
  x: <path d="M17.75 3h3.07l-6.71 7.67L22 21h-6.18l-4.84-6.33L5.44 21H2.37l7.18-8.2L2 3h6.33l4.38 5.79L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z" />,
  instagram: (
    <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 2c-2.7 0-3.05.01-4.1.06-1.06.05-1.79.22-2.43.47a4.9 4.9 0 0 0-1.77 1.15A4.9 4.9 0 0 0 2.53 5.47c-.25.64-.42 1.37-.47 2.43C2.01 8.95 2 9.3 2 12s.01 3.05.06 4.1c.05 1.06.22 1.79.47 2.43.25.66.59 1.22 1.15 1.77.55.56 1.11.9 1.77 1.15.64.25 1.37.42 2.43.47 1.05.05 1.4.06 4.12.06s3.05-.01 4.1-.06c1.06-.05 1.79-.22 2.43-.47a4.9 4.9 0 0 0 1.77-1.15 4.9 4.9 0 0 0 1.15-1.77c.25-.64.42-1.37.47-2.43.05-1.05.06-1.4.06-4.1s-.01-3.05-.06-4.1c-.05-1.06-.22-1.79-.47-2.43a4.9 4.9 0 0 0-1.15-1.77 4.9 4.9 0 0 0-1.77-1.15c-.64-.25-1.37-.42-2.43-.47C15.05 2.01 14.7 2 12 2Zm0 1.8c2.67 0 2.99.01 4.04.06.97.04 1.5.21 1.86.34.47.18.8.4 1.15.75.35.35.57.68.75 1.15.13.35.3.89.34 1.86.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.04.97-.21 1.5-.34 1.86-.18.47-.4.8-.75 1.15-.35.35-.68.57-1.15.75-.35.13-.89.3-1.86.34-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-.97-.04-1.5-.21-1.86-.34a3.1 3.1 0 0 1-1.15-.75 3.1 3.1 0 0 1-.75-1.15c-.13-.35-.3-.89-.34-1.86C3.81 14.99 3.8 14.67 3.8 12s.01-2.99.06-4.04c.04-.97.21-1.5.34-1.86.18-.47.4-.8.75-1.15.35-.35.68-.57 1.15-.75.35-.13.89-.3 1.86-.34C9.01 3.81 9.33 3.8 12 3.8Z" />
  ),
  facebook: <path d="M13.5 21v-8.2h2.75l.41-3.2H13.5V7.56c0-.93.26-1.56 1.59-1.56h1.7V3.14A22.7 22.7 0 0 0 14.31 3c-2.46 0-4.14 1.5-4.14 4.25V9.6H7.4v3.2h2.77V21h3.33Z" />,
  youtube: (
    <path d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 0 0 2.42 7.2C2 8.76 2 12 2 12s0 3.24.42 4.81a2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.24 22 12 22 12s0-3.24-.42-4.81ZM10 15V9l5.2 3L10 15Z" />
  ),
};

const COLUMNS = [
  {
    title: "Services",
    links: [
      { href: "/services#permanent", label: "Permanent staffing" },
      { href: "/services#contract", label: "Contract staffing" },
      { href: "/services#contract-to-hire", label: "Contract-to-hire" },
      { href: "/services#rpo", label: "RPO" },
      { href: "/services#executive", label: "Executive search" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/industries", label: "Industries" },
      { href: "/employers", label: "For employers" },
      { href: "/careers", label: "Careers" },
      { href: "/register", label: "Register as candidate" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of use" },
      { href: "/login", label: "Team sign in" },
    ],
  },
];

export function SiteFooter() {
  const socials = Object.entries(site.social).filter(([, url]) => url);
  return (
    <footer className="section-dark relative overflow-hidden">
      <DarkGlow variant="b" />
      <Container className="relative pb-10 pt-16 sm:pt-20">
        <div className="grid gap-10 border-b border-line pb-12 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="max-w-2xl text-balance text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-900 sm:text-[44px]">{site.footer.statement}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <MagneticButton href="/employers" variant="light" size="md">
                Hire talent
              </MagneticButton>
              <MagneticButton href="/careers" variant="ghost-light" size="md">
                Find a job
              </MagneticButton>
            </div>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-ink-900">Stay in the loop</h2>
            <p className="mb-4 mt-1 text-sm text-ink-500">{site.footer.newsletter}</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-ink-500">{site.description}</p>
            <ul className="mt-5 space-y-2 text-sm text-ink-600">
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-jade-700" aria-hidden />
                <a href={`mailto:${site.contact.email}`} className="hover:text-ink-900">
                  {site.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-jade-700" aria-hidden />
                <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="hover:text-ink-900">
                  {site.contact.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-jade-700" aria-hidden />
                <span>{site.contact.address.join(", ")}</span>
              </li>
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-400">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-ink-600 transition-colors hover:text-ink-900">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse items-start justify-between gap-5 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="text-[13px] text-ink-400">
            © {new Date().getFullYear()} {site.legalName}. All rights reserved.
          </p>
          {socials.length > 0 && (
            <ul className="flex items-center gap-2">
              {socials.map(([key, url]) => (
                <li key={key}>
                  <a
                    href={url}
                    target={url === "#" ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    aria-label={`${site.name} on ${key === "x" ? "X" : key[0].toUpperCase() + key.slice(1)}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-500 transition-colors hover:border-line-strong hover:text-ink-900"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                      {SOCIAL_ICONS[key]}
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
      <BackToTop />
    </footer>
  );
}
