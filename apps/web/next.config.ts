import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // packages/shared ships raw TS — Next must transpile it rather than expect a build step.
  transpilePackages: ["@mios/shared"],
  // Preserve bookmarks from older MIOS/Linora site builds. Canonical auth and
  // navigation endpoints live at the root of the Next.js app.
  async redirects() {
    return [
      ...(process.env.COMPLIANCE_PORTAL_MODE === "true"
        ? [{ source: "/", destination: "/compliance", permanent: false }]
        : []),
      { source: "/signin", destination: "/login", permanent: true },
      { source: "/sign-in", destination: "/login", permanent: true },
      { source: "/signup", destination: "/register", permanent: true },
      { source: "/sign-up", destination: "/register", permanent: true },
      { source: "/auth/login", destination: "/login", permanent: true },
      { source: "/auth/register", destination: "/register", permanent: true },
      { source: "/auth/forgot-password", destination: "/forgot-password", permanent: true },
      { source: "/auth/reset-password", destination: "/reset", permanent: true },
      { source: "/auth/verify", destination: "/verify", permanent: true },
      { source: "/auth/signin", destination: "/login", permanent: true },
      { source: "/auth/signup", destination: "/register", permanent: true },
      { source: "/password-reset", destination: "/forgot-password", permanent: true },
      { source: "/reset-password", destination: "/reset", permanent: true },
      { source: "/app", destination: "/dashboard", permanent: true },
      { source: "/app/dashboard", destination: "/dashboard", permanent: true },
      { source: "/app/ask", destination: "/ask", permanent: true },
      { source: "/app/analytics", destination: "/analytics", permanent: true },
      { source: "/app/compliance", destination: "/compliance", permanent: true },
      { source: "/app/knowledge", destination: "/knowledge", permanent: true },
      { source: "/app/quality", destination: "/quality", permanent: true },
      { source: "/app/settings/team", destination: "/settings/team", permanent: true },
      { source: "/app/settings/billing", destination: "/settings/billing", permanent: true },
      { source: "/app/settings/connectors", destination: "/settings/connectors", permanent: true },
      { source: "/app/settings/guest-access", destination: "/settings/guest-access", permanent: true },
      { source: "/app/settings/audit-log", destination: "/settings/audit-log", permanent: true },
      { source: "/app/compliance/:assessmentId", destination: "/compliance/:assessmentId", permanent: true },
      { source: "/app/knowledge/:documentId", destination: "/knowledge/:documentId", permanent: true },
    ];
  },
  experimental: {
    // Server Actions receive factory names and CAP text; 2 MB is ample and bounds abuse.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
