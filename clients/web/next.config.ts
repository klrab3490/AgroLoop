import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@agroloop/api-client", "@agroloop/api-types"],
};

export default nextConfig;
