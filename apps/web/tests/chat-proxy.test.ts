import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/claims", () => ({
  getClaims: vi.fn(),
  getAccessToken: vi.fn(),
}));

import { getClaims, getAccessToken } from "@/lib/supabase/claims";
import { POST } from "@/app/api/chat/stream/route";

const getClaimsMock = vi.mocked(getClaims);
const getTokenMock = vi.mocked(getAccessToken);

describe("tenant-safe chat streaming gateway", () => {
  beforeEach(() => {
    vi.stubEnv("API_INTERNAL_URL", "https://api.linora.example");
    getClaimsMock.mockResolvedValue({
      userId: "user-a",
      tenantId: "tenant-a",
      email: "owner@example.test",
      role: "owner",
    });
    getTokenMock.mockResolvedValue("valid-supabase-jwt");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("rejects requests without verified claims", async () => {
    getClaimsMock.mockResolvedValue(null);
    const response = await POST(new Request("https://linora.example/api/chat/stream", {
      method: "POST",
      body: JSON.stringify({ question: "machine downtime" }),
    }));
    expect(response.status).toBe(401);
  });

  it("never runs an independent chunk or Groq lookup", async () => {
    const frames = 'data: {"type":"citations","citations":[]}\n\n' +
      'data: {"type":"token","value":"No verified records"}\n\n' +
      'data: {"type":"done"}\n\n';
    const upstream = vi.fn(async (url: URL, init: RequestInit) => {
      expect(url.toString()).toBe("https://api.linora.example/v1/chat/stream");
      const headers = new Headers(init.headers);
      expect(headers.get("authorization")).toBe("Bearer valid-supabase-jwt");
      expect(headers.has("x-tenant-id")).toBe(false);
      expect(JSON.parse(init.body as string)).toEqual({ question: "machine downtime" });
      return new Response(frames, { headers: { "content-type": "text/event-stream" } });
    });
    vi.stubGlobal("fetch", upstream);
    const result = await POST(new Request("https://linora.example/api/chat/stream", {
      method: "POST",
      body: JSON.stringify({ question: "machine downtime" }),
    }));
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(await result.text()).toBe(frames);
    expect(upstream).toHaveBeenCalledOnce();
  });

  it("rejects malformed requests before invoking the API", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const result = await POST(new Request("https://linora.example/api/chat/stream", {
      method: "POST",
      body: JSON.stringify({ question: "  ", tenant_id: "user-supplied-tenant" }),
    }));
    expect(result.status).toBe(422);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("fails closed when the retrieval backend is not configured", async () => {
    vi.stubEnv("API_INTERNAL_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const result = await POST(new Request("https://linora.example/api/chat/stream", {
      method: "POST",
      body: JSON.stringify({ question: "factory output" }),
    }));
    expect(result.status).toBe(503);
  });
});
