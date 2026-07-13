import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production hardening
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
