/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // Reuse recently visited pages on the client, so switching between modules is instant
    staleTimes: { dynamic: 30, static: 180 },
  },
};
export default nextConfig;
