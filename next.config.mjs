import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// Supabase (REST, storage, realtime websockets) is the only third-party origin the browser talks to
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
const supabaseWs = supabase.replace(/^https:/, "wss:");
const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Next.js inlines its bootstrap/hydration scripts; dev also needs eval for fast refresh
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseWs}${dev ? " ws:" : ""}`.trim(),
  `media-src 'self' blob: ${supabase}`.trim(),
  // CV previews (same origin) and an optional Google Maps embed on /contact
  "frame-src 'self' blob: https://www.google.com https://maps.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // lets a test build live next to a running `npm run dev` (NEXT_DIST_DIR=.next-test)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // local embeddings for the assistant fallback (native ONNX runtime stays outside the bundle)
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
  // ship only the Linux x64 ONNX runtime to Vercel (keeps the function well under the size limit)
  outputFileTracingExcludes: {
    "/api/bot": ["./node_modules/onnxruntime-node/bin/napi-v3/darwin/**/*", "./node_modules/onnxruntime-node/bin/napi-v3/win32/**/*", "./node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**/*", "./node_modules/onnxruntime-web/**/*"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // Reuse recently visited pages on the client, so switching between modules is instant
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default withBundleAnalyzer(nextConfig);
