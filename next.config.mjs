/** @type {import('next').NextConfig} */
const nextConfig = {
  // lets a test build live next to a running `npm run dev` (NEXT_DIST_DIR=.next-test)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // Reuse recently visited pages on the client, so switching between modules is instant
    staleTimes: { dynamic: 30, static: 180 },
  },
};
export default nextConfig;
