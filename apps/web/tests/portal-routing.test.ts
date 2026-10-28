import { describe, expect, it } from "vitest";
import {
  PORTALS, PORTAL_SECTIONS, canonicalAppOrigin, getPortal,
  isPortalSection, portalPublicRewrite, resolvePortalHost, workspaceUrl,
} from "@/lib/portals/catalog";

describe("Linora module catalog", () => {
  it("defines ten unique modules with real, distinct MIOS destinations", () => {
    expect(PORTALS).toHaveLength(10);
    expect(new Set(PORTALS.map(p => p.slug)).size).toBe(PORTALS.length);
    expect(PORTALS.every(p => p.modules.length === 3 && p.journey.length === 4)).toBe(true);
    for (const portal of PORTALS) {
      expect(portal.workspacePath).toMatch(/^\/(?:dashboard|compliance|ask|knowledge|analytics|quality|settings(?:\/team|\/billing|\/connectors|\/audit-log)?)$/);
      expect(getPortal(portal.slug)).toBe(portal);
    }
    expect(getPortal("nonexistent")).toBeUndefined();
  });

  it("maintains four public information sections per module", () => {
    expect(PORTAL_SECTIONS).toEqual(["platform", "about", "trust", "demo"]);
    expect(isPortalSection("trust")).toBe(true);
    expect(isPortalSection("api")).toBe(false);
    expect(isPortalSection("login")).toBe(false);
  });
});

describe("Linora exact-host public portal rewriting", () => {
  const domain = "linora.ai";
  it.each(PORTALS.map(p => p.slug))("maps only known module root %s", (slug) => {
    expect(resolvePortalHost(`${slug}.${domain}`, domain)).toBe(slug);
    expect(portalPublicRewrite(`${slug}.${domain}`, "/", domain)).toBe(`/portals/${slug}`);
    expect(portalPublicRewrite(`${slug}.${domain}`, "/trust", domain)).toBe(`/portals/${slug}/trust`);
    expect(portalPublicRewrite(`${slug}.${domain}`, "/platform", domain)).toBe(`/portals/${slug}/platform`);
  });
  it("rejects unapproved hosts and roots, even if they contain a matching suffix", () => {
    for (const host of [
      "linora.ai", "unknown.linora.ai", "ask.linora.ai.evil.example",
      "ask.evil-linora.ai", "foo.ask.linora.ai", "asklinora.ai",
      "ask.linora.ai@example.com", "ask.linora.ai/x", "ask.linora.ai:invalid",
      "ask.linora.ai..", "ask.linora.ai%00", "ask.linora.ai:443.evil.com",
    ]) {
      expect(resolvePortalHost(host, domain)).toBe(null);
    }
    expect(resolvePortalHost("ask.linora.ai", undefined)).toBe(null);
    expect(resolvePortalHost("ask.linora.ai", "")).toBe(null);
    expect(resolvePortalHost("ask.vercel.app", "vercel.app")).toBe(null);
    expect(resolvePortalHost("ask.linora.ai", "*.linora.ai")).toBe(null);
  });
  it("does not rewrite protected app paths, APIs, or login", () => {
    for (const path of ["/api/compliance", "/compliance", "/ask", "/knowledge", "/login", "/onboarding", "/billing", "/demo/private", "/trust/extra"]) {
      expect(portalPublicRewrite("ask.linora.ai", path, domain)).toBeNull();
    }
  });
  it("does not require exact case or a trailing DNS dot", () => {
    expect(resolvePortalHost("Ask.Linora.Ai", "LINORA.AI")).toBe("ask");
    expect(resolvePortalHost("ask.linora.ai.", "linora.ai")).toBe("ask");
    expect(resolvePortalHost("ask.linora.ai:443", "linora.ai")).toBe("ask");
  });
});

describe("canonical workspace links", () => {
  it("connects every module to a controlled canonical HTTPS origin", () => {
    for (const portal of PORTALS) {
      const url = new URL(workspaceUrl(portal.slug, "https://mios-manufacturing-pilot.vercel.app"));
      expect(url.origin).toBe("https://mios-manufacturing-pilot.vercel.app");
      expect(url.pathname).toBe(portal.workspacePath);
    }
  });
  it("rejects malformed or credential-bearing app URL configuration", () => {
    for (const bad of [
      "https://attacker:password@evil.example",
      "javascript:alert(1)", "https://example.org/deep/path",
      "https://example.org/?redirect=evil", "//evil.example", "http://evil.example",
    ]) {
      expect(canonicalAppOrigin(bad)).toBe("https://mios-manufacturing-pilot.vercel.app");
    }
  });
  it("permits localhost only for local development", () => {
    expect(canonicalAppOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(workspaceUrl("ask", "http://localhost:3000")).toBe("http://localhost:3000/ask");
  });
});
