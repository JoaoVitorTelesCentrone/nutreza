import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NUTREZA_NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
};

export default nextConfig;
