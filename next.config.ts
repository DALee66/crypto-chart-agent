import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "crypto-chart-agent";

const nextConfig: NextConfig = {
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? `/${repo}` : "",
  assetPrefix: isGithubPages ? `/${repo}/` : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  allowedDevOrigins: ["*.trycloudflare.com", "*.github.io"],
};

export default nextConfig;
