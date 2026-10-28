import { describe, expect, it } from "vitest";
import { getProduct, PRODUCTS, PRODUCT_SECTIONS, PRODUCT_SLUGS } from "@/lib/products/catalog";
import {
  canonicalApplicationOrigin, normalizedHostname, productFromHost,
  productHostRoute, workspaceSignInUrl,
} from "@/lib/products/subdomains";

describe("product catalog completeness", () => {
  it("has unique, explicit product identities and safe internal workspace paths", () => {
    expect(PRODUCTS).toHaveLength(PRODUCT_SLUGS.length);
    expect(new Set(PRODUCTS.map((product) => product.slug)).size).toBe(PRODUCTS.length);
    for (const product of PRODUCTS) {
      expect(getProduct(product.slug)).toEqual(product);
      expect(product.tagline.length).toBeGreaterThan(9);
      expect(product.trustNote.length).toBeGreaterThan(30);
      expect(product.pillars).toHaveLength(4);
      expect(product.workflow).toHaveLength(3);
      expect(product.workspacePath).toMatch(/^\/[a-z/-]+$/);
    }
    expect(getProduct("api")).toBeUndefined();
    expect(PRODUCT_SECTIONS).toEqual(["about", "platform", "trust", "demo"]);
  });
});

describe("product vanity hostname boundary", () => {
  it.each([
    ["compliance.linora.ai", "compliance"],
    ["ASK.LINORA.AI", "ask"],
    ["knowledge.linora.ai:443", "knowledge"],
    ["analytics.linora.ai.", "analytics"],
    ["quality.linora.ai", "quality"],
    ["operations.linora.ai", "operations"],
    ["connect.linora.ai", "connect"],
  ])("matches exactly %s", (host, slug) => {
    expect(productFromHost(host)?.slug).toBe(slug);
  });

  it.each([
    "app.linora.ai", "api.linora.ai", "docs.linora.ai", "status.linora.ai",
    "www.linora.ai", "linora.ai", "compliance.linora.ai.attacker.test",
    "fakecompliance.linora.ai", "compliance.evil-linora.ai",
    "evil.compliance.linora.ai", "https://compliance.linora.ai",
    "compliance.linora.ai@evil.example", "compliance..linora.ai",
    "localhost:3000", "mios-manufacturing-pilot.vercel.app", "",
  ])("does not treat %s as a product domain", (host) => {
    expect(productFromHost(host)).toBeUndefined();
  });

  it("allows an operator-defined exact apex without accepting other apexes", () => {
    expect(productFromHost("ask.factorybrand.example", "factorybrand.example")?.slug).toBe("ask");
    expect(productFromHost("ask.linora.ai", "factorybrand.example")).toBeUndefined();
    expect(normalizedHostname("Ask.FactoryBrand.Example:443")).toBe("ask.factorybrand.example");
  });
});

describe("product-only public route surface", () => {
  it("rewrites only the product home and four informational pages", () => {
    const host = "compliance.linora.ai";
    expect(productHostRoute(host, "/")).toEqual({
      type: "rewrite", slug: "compliance", destination: "/products/compliance",
    });
    for (const section of PRODUCT_SECTIONS) {
      expect(productHostRoute(host, "/" + section)).toEqual({
        type: "rewrite", slug: "compliance", destination: "/products/compliance/" + section,
      });
    }
  });

  it.each([
    "/login", "/register", "/onboarding", "/dashboard", "/settings/team",
    "/ask", "/knowledge", "/compliance", "/compliance/private-id",
    "/api/compliance/assessments", "/callback", "/auth/confirm", "/guest/token",
    "/products/ask", "/robots.txt", "/platform/other",
  ])("blocks %s on marketing-only product origins", (pathname) => {
    expect(productHostRoute("compliance.linora.ai", pathname)).toEqual({
      type: "not_found", slug: "compliance",
    });
  });

  it("leaves the existing canonical and Vercel deployment hosts unaffected", () => {
    expect(productHostRoute("mios-manufacturing-pilot.vercel.app", "/compliance")).toBeNull();
    expect(productHostRoute("linora.ai", "/")).toBeNull();
  });
});

describe("canonical authenticated origin", () => {
  it("never uses the marketing hostname or a request supplied next parameter", () => {
    expect(workspaceSignInUrl("/compliance", "https://mios-manufacturing-pilot.vercel.app"))
      .toBe("https://mios-manufacturing-pilot.vercel.app/login?next=%2Fcompliance");
    expect(workspaceSignInUrl("//evil.test", "https://app.linora.ai"))
      .toBe("https://app.linora.ai/login?next=%2Fdashboard");
    expect(workspaceSignInUrl("/settings/connectors", "https://app.linora.ai"))
      .toBe("https://app.linora.ai/login?next=%2Fsettings%2Fconnectors");
  });

  it.each([
    "https://example.com.evil.test/login",
    "javascript:alert(1)",
    "https://user:pass@app.linora.ai/",
    "http://app.linora.ai",
    "https://app.linora.ai/?next=//evil.test",
    "https://app.linora.ai/#fragment",
  ])("enforces an explicit trusted site URL shape: %s", (invalid) => {
    // A trusted but wrong HTTPS host is an operator configuration problem;
    // this test checks URL scheme/credential/query/path restrictions.
    if (invalid === "https://example.com.evil.test/login") {
      expect(canonicalApplicationOrigin(invalid))
        .toBe("https://mios-manufacturing-pilot.vercel.app");
    } else {
      expect(canonicalApplicationOrigin(invalid))
        .toBe("https://mios-manufacturing-pilot.vercel.app");
    }
  });

  it("allows local development and defaults to the already verified current host", () => {
    expect(canonicalApplicationOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(canonicalApplicationOrigin("")).toBe("https://mios-manufacturing-pilot.vercel.app");
  });
});
