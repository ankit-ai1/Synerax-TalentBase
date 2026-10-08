import { ImageResponse } from "next/og";
import { site } from "@/content/site";
import { BRAND_MARK_SVG } from "@/components/brand-logo";

// the mark on a light tile (the OG background is graphite)
const MARK = `data:image/svg+xml;base64,${Buffer.from(BRAND_MARK_SVG.replace(`fill="#38240D"`, `fill="#FDFBD4"`).replace(`stroke="#FDFBD4"`, `stroke="#38240D"`)).toString("base64")}`;

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Generated Open Graph image shared by all public pages */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #38240D 0%, #46301A 55%, #5A4128 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK} width={60} height={60} alt="" />
          <div style={{ display: "flex", fontSize: 36, letterSpacing: -1 }}>
            <span style={{ fontWeight: 700 }}>Synerax</span>
            <span style={{ marginLeft: 10, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>Talent</span>
            <span style={{ fontWeight: 700, color: "#C05800" }}>Base</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3, maxWidth: 900 }}>{site.hero.title}</div>
          <div style={{ marginTop: 24, fontSize: 30, color: "rgba(255,255,255,0.7)", maxWidth: 900 }}>
            Permanent, contract & executive staffing across India
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {["Sourced", "Screened", "Interview", "Hired"].map((s, i) => (
            <div
              key={s}
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                fontSize: 22,
                background: i === 3 ? "#C05800" : "rgba(255,255,255,0.08)",
                color: i === 3 ? "#1A1206" : "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
