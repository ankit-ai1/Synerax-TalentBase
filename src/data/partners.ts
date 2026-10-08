/**
 * Partner companies shown in the "Trusted by" section on the home page.
 *
 * Logos: put a file in /public/partners/ named after the partner's slug
 * (lowercase, spaces → dashes), e.g. "absyz.svg", "tek-star-global.png".
 * It is picked up automatically on the next build (svg, png, webp, jpg).
 * You can also point `logo` at a specific file, e.g. logo: "/partners/absyz-dark.svg".
 * Without a logo file, a text wordmark with a small monogram is shown.
 *
 * industry / since / url are optional — leave them out until confirmed.
 */
export type Partner = {
  name: string;
  /** path under /public, e.g. "/partners/absyz.svg" (optional — auto-detected from the slug) */
  logo?: string;
  industry?: string;
  /** year the partnership started */
  since?: number;
  url?: string;
};

export const partners: Partner[] = [
  { name: "Tek Star Global" },
  { name: "Lumina Workforce" },
  { name: "Kobo Cabs" },
  { name: "Yantracabs" },
  { name: "IncentIQ" },
  { name: "ABSYZ" },
];

export const partnerSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
