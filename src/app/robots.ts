import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/** Public pages are indexable; the internal app and APIs are not */
export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/login",
          "/forgot-password",
          "/reset-password",
          "/account",
          "/portal",
          "/client",
          "/notifications",
          "/dashboard",
          "/candidates",
          "/jobs",
          "/clients",
          "/interviews",
          "/tasks",
          "/shortlists",
          "/reports",
          "/import",
          "/templates",
          "/admin",
          "/print",
          "/api/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
