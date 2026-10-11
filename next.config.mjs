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
};
export default nextConfig;
