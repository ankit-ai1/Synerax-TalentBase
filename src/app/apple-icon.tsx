import { ImageResponse } from "next/og";
import { BRAND_MARK_SVG } from "@/components/brand-logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon generated from the brand mark */
export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(BRAND_MARK_SVG).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#38240D" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={180} height={180} alt="" />
      </div>
    ),
    size
  );
}
