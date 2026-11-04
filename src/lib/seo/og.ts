import type { Metadata } from "next";
import { site } from "@/content/site";

/** the generated share card (src/app/opengraph-image.tsx) */
export const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${site.name} — ${site.tagline}` };

/** keep a <title> within 60 characters (Google truncates longer ones): cut `main` at a word boundary, keep `suffix` */
export function clampTitle(main: string, suffix = "", max = 60) {
  if (main.length + suffix.length <= max) return main + suffix;
  const room = max - suffix.length - 1;
  const cut = main.slice(0, room).replace(/[\s—|·,(–-]+\S*$/, "").replace(/[\s—|·,(–-]+$/, "");
  return `${cut || main.slice(0, room)}…${suffix}`;
}

/**
 * Full Open Graph + Twitter card for a page. A page's `openGraph` replaces the layout's whole object (and the
 * file-based image is dropped with it), so every page sets title, description, image, site name and type itself.
 */
export function ogMeta(title: string, url: string, description: string = site.description, images = [OG_IMAGE]): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type: "website", siteName: site.name, locale: "en_IN", title, description, url, images },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
  };
}
