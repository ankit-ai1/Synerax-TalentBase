import { ImageResponse } from "next/og";
import { OG_LOGO, OG_LOGO_SIZE } from "@/lib/seo/og-logo";
import { getPost } from "@/lib/seo/data";

const size = { width: 1200, height: 630 };
export const revalidate = 300;

/** auto OG image for posts without one: title + category on the brand background */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await getPost((await params).slug);
  const title = p?.title ?? "Synerax blog";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "linear-gradient(135deg, #1F150A 0%, #2A1C0E 55%, #38240D 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={OG_LOGO} width={OG_LOGO_SIZE.width} height={OG_LOGO_SIZE.height} alt="" />
          <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.65)" }}>Blog</div>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 70 ? 54 : 66, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: "flex", gap: 14, fontSize: 24, color: "rgba(255,255,255,0.75)" }}>
          {p?.categories?.[0] && <span style={{ padding: "8px 20px", borderRadius: 999, background: "#C05800", color: "#1A1206" }}>{p.categories[0]}</span>}
          {p?.author_name && <span style={{ padding: "8px 0" }}>by {p.author_name}</span>}
        </div>
      </div>
    ),
    size
  );
}
