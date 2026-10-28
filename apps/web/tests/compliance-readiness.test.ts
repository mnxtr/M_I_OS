import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/claims", () => ({ getClaims: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getClaims } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import { listComplianceTemplatesSupabase } from "@/lib/compliance/supabase";
import { POST as createAssessment } from "@/app/api/compliance/assessments/route";

function userClientWithProfile(profile: { role: string; is_active: boolean } | null) {
  const profileQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
  };
  profileQuery.select.mockReturnValue(profileQuery);
  profileQuery.eq.mockReturnValue(profileQuery);
  return { from: vi.fn().mockReturnValue(profileQuery) };
}

describe("compliance page read path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
  });

  it("reads existing Supabase templates without a service-role credential or write", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { code: "social-compliance-core", name: "Core Social Compliance Pack", version: 1,
          description: "Pilot", items: [{ ref: "CL-01" }] },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(createClient).mockResolvedValue({ from } as unknown as Awaited<ReturnType<typeof createClient>>);

    const templates = await listComplianceTemplatesSupabase();
    expect(templates).toEqual([{
      code: "social-compliance-core", name: "Core Social Compliance Pack",
      version: 1, description: "Pilot", item_count: 1,
    }]);
    expect(from).toHaveBeenCalledExactlyOnceWith("checklist_templates");
    expect(select).toHaveBeenCalledWith("code,name,version,description,items");
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns a clear 503 instead of an uncaught exception when creation is unconfigured", async () => {
    vi.mocked(getClaims).mockResolvedValue({
      userId: "00000000-0000-0000-0000-000000000001",
      tenantId: "00000000-0000-0000-0000-000000000002",
      role: "owner", email: "example@example.test",
    });
    vi.mocked(createClient).mockResolvedValue(
      userClientWithProfile({ role: "owner", is_active: true }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    const request = new Request("http://localhost/api/compliance/assessments", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        template_code: "social-compliance-core", title: "Pilot readiness", due_date: "",
      }),
    });
    const response = await createAssessment(request);
    expect(response.status).toBe(503);
    expect((await response.json()).detail).toContain("temporarily unavailable");
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects unprivileged users and stale access after deactivation", async () => {
    const claims = {
      userId: "00000000-0000-0000-0000-000000000001",
      tenantId: "00000000-0000-0000-0000-000000000002",
      role: "operator" as const, email: "example@example.test",
    };
    vi.mocked(getClaims).mockResolvedValue(claims);
    const body = JSON.stringify({ template_code: "social-compliance-core", title: "Test", due_date: "" });
    const req = () => new Request("http://localhost/api/compliance/assessments", {
      method: "POST", headers: { "content-type": "application/json" }, body,
    });
    expect((await createAssessment(req())).status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();

    vi.mocked(getClaims).mockResolvedValue({ ...claims, role: "owner" });
    vi.mocked(createClient).mockResolvedValue(
      userClientWithProfile({ role: "owner", is_active: false }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    expect((await createAssessment(req())).status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
