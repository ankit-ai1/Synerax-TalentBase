import type { Metadata } from "next";
import { site } from "@/content/site";
import { MotionProvider } from "@/components/site/motion";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { RevealObserver } from "@/components/site/reveal";
import { PauseOffscreen, ScrollTopRing, SmoothScroll } from "@/components/site/effects";
import { RouteWipe } from "@/components/site/connection/global";
import { ChatLauncher } from "@/components/chat/launcher";
import { SiteIntro } from "@/components/site/intro";
import { BrandMark } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_IN",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
};

/** Organization structured data for search engines and AI agents (not visible) */
const ORG_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "EmploymentAgency",
  name: site.name,
  legalName: site.legalName,
  description: site.description,
  url: site.url,
  logo: `${site.url}/logo.png`,
  email: site.contact.email,
  telephone: site.contact.phone,
  address: { "@type": "PostalAddress", addressLocality: "Noida", addressCountry: "IN" },
  areaServed: "IN",
  sameAs: Object.values(site.social).filter((u) => typeof u === "string" && u.startsWith("http")),
});

/** Public marketing website — no login required */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <div className="site-theme flex min-h-screen flex-col overflow-x-clip">
        {/* first visit in this session: show the loader screen before any JS runs (no flash of the page) */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(!sessionStorage.getItem('synerax-intro-seen')&&!navigator.webdriver)document.documentElement.setAttribute('data-intro','1')}catch(e){}" }} />
        <div className="intro-boot" aria-hidden>
          <span data-brand-invert>
            <BrandMark size={84} />
          </span>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ORG_JSON_LD }} />
        <SiteNavbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <RevealObserver />
        <SmoothScroll />
        <PauseOffscreen />
        <RouteWipe />
        <div className="grain" aria-hidden />
        <ScrollTopRing />
        <ChatLauncher placement="site" />
        <SiteIntro />
      </div>
    </MotionProvider>
  );
}
