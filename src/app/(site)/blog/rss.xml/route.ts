import { site } from "@/content/site";
import { livePosts } from "@/lib/seo/data";
import { siteBase } from "@/lib/seo/jsonld";

export const revalidate = 300;

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 feed of the latest 50 live posts */
export async function GET() {
  const base = siteBase();
  const posts = (await livePosts()).slice(0, 50);
  const items = posts
    .map(
      (p) => `    <item>
      <title>${x(p.title)}</title>
      <link>${base}/blog/${p.slug}</link>
      <guid isPermaLink="true">${base}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.publish_at ?? p.updated_at).toUTCString()}</pubDate>
${p.excerpt ? `      <description>${x(p.excerpt)}</description>\n` : ""}${p.author_name ? `      <dc:creator>${x(p.author_name)}</dc:creator>\n` : ""}${p.categories.map((c) => `      <category>${x(c)}</category>\n`).join("")}    </item>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${x(site.name)} blog</title>
    <link>${base}/blog</link>
    <description>${x(`Hiring, careers and staffing insights from ${site.name}`)}</description>
    <language>en-in</language>
    <atom:link href="${base}/blog/rss.xml" rel="self" type="application/rss+xml" />
${posts[0] ? `    <lastBuildDate>${new Date(posts[0].publish_at ?? posts[0].updated_at).toUTCString()}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=300" } });
}
