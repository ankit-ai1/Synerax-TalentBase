import type { Metadata } from "next";
import { site } from "@/content/site";
import { MotionProvider } from "@/components/site/motion";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { RevealObserver } from "@/components/site/reveal";
import { ScrollTopRing, SmoothScroll } from "@/components/site/effects";
import { RouteWipe } from "@/components/site/connection/global";

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

/** Public marketing website — no login required */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <div className="site-theme flex min-h-screen flex-col overflow-x-clip">
        <SiteNavbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <RevealObserver />
        <SmoothScroll />
        <RouteWipe />
        <div className="grain" aria-hidden />
        <ScrollTopRing />
      </div>
    </MotionProvider>
  );
}
