import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("legacy Linora URL compatibility", () => {
  it("maps retired login, recovery, and nested workspace routes to existing pages", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    const expected: Record<string, string> = {
      "/signin": "/login",
      "/sign-in": "/login",
      "/signup": "/register",
      "/auth/login": "/login",
      "/auth/register": "/register",
      "/auth/verify": "/verify",
      "/auth/forgot-password": "/forgot-password",
      "/auth/reset-password": "/reset",
      "/password-reset": "/forgot-password",
      "/reset-password": "/reset",
      "/app": "/dashboard",
      "/app/compliance": "/compliance",
      "/app/compliance/:assessmentId": "/compliance/:assessmentId",
      "/app/knowledge/:documentId": "/knowledge/:documentId",
      "/app/settings/billing": "/settings/billing",
      "/app/settings/team": "/settings/team",
      "/app/settings/connectors": "/settings/connectors",
      "/app/settings/guest-access": "/settings/guest-access",
      "/app/settings/audit-log": "/settings/audit-log",
    };

    for (const [source, destination] of Object.entries(expected)) {
      expect(redirects).toContainEqual({
        source,
        destination,
        permanent: true,
      });
    }
    // No user-controlled hostname or query parameter becomes a redirect destination.
    for (const rule of redirects) {
      expect(rule.destination.startsWith("/")).toBe(true);
      expect(rule.destination.startsWith("//")).toBe(false);
    }
  });
});
