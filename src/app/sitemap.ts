import type { MetadataRoute } from "next";
import { site } from "@/content/site";

const PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/services", priority: 0.9, changeFrequency: "monthly" },
  { path: "/employers", priority: 0.9, changeFrequency: "monthly" },
  { path: "/careers", priority: 0.9, changeFrequency: "weekly" },
  { path: "/job-seekers", priority: 0.8, changeFrequency: "monthly" },
  { path: "/industries", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  return PAGES.map((p) => ({ url: `${base}${p.path}`, lastModified: new Date(), changeFrequency: p.changeFrequency, priority: p.priority }));
}
