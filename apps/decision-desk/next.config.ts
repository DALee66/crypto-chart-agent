import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "irrigation-tribes-stuff-investments.trycloudflare.com",
  ],
};

export default nextConfig;
