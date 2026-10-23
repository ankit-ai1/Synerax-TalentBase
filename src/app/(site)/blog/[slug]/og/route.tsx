import { ImageResponse } from "next/og";
import { BRAND_MARK_SVG } from "@/components/brand-logo";
import { getPost } from "@/lib/seo/data";

const MARK = `data:image/svg+xml;base64,${Buffer.from(BRAND_MARK_SVG.replace(`fill="#38240D"`, `fill="#FDFBD4"`).replace(`stroke="#FDFBD4"`, `stroke="#38240D"`)).toString("base64")}`;

const size = { width: 1200, height: 630 };
export const revalidate = 300;

/** auto OG image for posts without one: title + category on the brand background */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await getPost((await params).slug);
  const title = p?.title ?? "Synerax blog";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "linear-gradient(135deg, #38240D 0%, #46301A 55%, #5A4128 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK} width={56} height={56} alt="" />
          <div style={{ display: "flex", fontSize: 32, letterSpacing: -1 }}>
            <span style={{ fontWeight: 700 }}>Synerax</span>
            <span style={{ marginLeft: 10, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>Blog</span>
          </div>
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
