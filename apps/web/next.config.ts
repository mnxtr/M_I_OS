import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // packages/shared ships raw TS — Next must transpile it rather than expect a build step.
  transpilePackages: ["@mios/shared"],
  experimental: {
    // Server Actions receive factory names and CAP text; 2 MB is ample and bounds abuse.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
