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
  /** the logo has its own coloured background: show it as a rounded tile instead of on the card */
  logoTile?: boolean;
  /** the logo is only an icon: show the company name under it */
  logoWithName?: boolean;
  /** no logo file yet: a designed mark + two-tone name, drawn in partners.tsx (not the company's official logo) */
  designed?: boolean;
  industry?: string;
  /** year the partnership started */
  since?: number;
  url?: string;
};

export const partners: Partner[] = [
  { name: "Tek Star Global" },
  { name: "Lumina Workforce", logoWithName: true },
  { name: "Kobo Cabs", designed: true },
  { name: "Yantracabs", logoTile: true },
  { name: "IncentIQ", logoWithName: true },
  { name: "ABSYZ" },
];

export const partnerSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
