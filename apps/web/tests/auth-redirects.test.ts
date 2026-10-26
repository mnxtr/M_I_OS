import { afterEach, describe, expect, it, vi } from "vitest";
import { authCallbackUrl, safeReturnPath } from "@/lib/auth/redirects";

describe("safeReturnPath", () => {
  it("keeps allowed application destinations and their query strings", () => {
    expect(safeReturnPath("/dashboard")).toBe("/dashboard");
    expect(safeReturnPath("/knowledge/document-id?tab=source")).toBe(
      "/knowledge/document-id?tab=source",
    );
    expect(safeReturnPath("/compliance/assessment-id")).toBe("/compliance/assessment-id");
    expect(safeReturnPath("/onboarding")).toBe("/onboarding");
    expect(safeReturnPath("/reset")).toBe("/reset");
  });

  it.each([
    null,
    "",
    "https://attacker.example",
    "//attacker.example",
    "/\\attacker.example",
    "/%2Fattacker.example",
    "/%5cattacker.example",
    "/api/documents",
    "/callback?code=secret",
    "/login",
    "/guest/token",
    "/unknown-route",
    "/dashboard#fragment",
  ])("rejects external or disallowed return destination %s", (candidate) => {
    expect(safeReturnPath(candidate)).toBe("/dashboard");
  });
});

describe("authCallbackUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to compliance when hosted in compliance portal mode", () => {
    vi.stubEnv("NEXT_PUBLIC_COMPLIANCE_PORTAL_MODE", "true");
    expect(safeReturnPath(null)).toBe("/compliance");
    expect(safeReturnPath("//untrusted.example")).toBe("/compliance");
  });

  it("routes signup and recovery emails to the canonical site origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mios-manufacturing-pilot.vercel.app");
    expect(authCallbackUrl("https://preview.example", "/reset")).toBe(
      "https://mios-manufacturing-pilot.vercel.app/callback?next=%2Freset",
    );
  });

  it("uses the current origin when no site URL is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(authCallbackUrl("http://localhost:3000", "/onboarding")).toBe(
      "http://localhost:3000/callback?next=%2Fonboarding",
    );
  });

  it("sanitizes return destinations in emailed links", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mios-manufacturing-pilot.vercel.app");
    expect(authCallbackUrl("https://preview.example", "//evil.example")).toBe(
      "https://mios-manufacturing-pilot.vercel.app/callback?next=%2Fdashboard",
    );
  });
});
