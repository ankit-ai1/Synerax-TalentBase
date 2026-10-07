import { ImageResponse } from "next/og";
import { site } from "@/content/site";

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
          background: "linear-gradient(135deg, #0A0D17 0%, #111827 55%, #0B3B38 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#159487", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700 }}>
            S
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>{site.name}</div>
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
                background: i === 3 ? "#F0B252" : "rgba(255,255,255,0.08)",
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
