import { describe, expect, it } from "vitest";
import { createActionSchema, updateActionSchema } from "@/lib/compliance/action-validation";

const candidateId = "b6fb6d62-2b9b-4889-ae49-cc058c8f3cde";

describe("compliance action API validation", () => {
  it("accepts a bounded, valid action", () => {
    expect(createActionSchema.safeParse({
      assessment_item_id: candidateId,
      due_date: "2026-11-10",
      priority: "critical",
      notes: "Inspect certificate before expiry",
    }).success).toBe(true);
  });
  it("rejects client-supplied tenant and creator identities", () => {
    expect(createActionSchema.safeParse({
      assessment_item_id: candidateId,
      tenant_id: candidateId,
      created_by: candidateId,
    }).success).toBe(false);
  });
  it("rejects unsafe dates, unexpected identity fields and invalid priority", () => {
    expect(createActionSchema.safeParse({ assessment_item_id: candidateId, due_date: "2026-13-99" }).success).toBe(false);
    expect(createActionSchema.safeParse({ assessment_item_id: candidateId, priority: "superurgent" }).success).toBe(false);
    expect(updateActionSchema.safeParse({ tenant_id: candidateId, status: "resolved" }).success).toBe(false);
  });
  it("accepts due date removal and prevents empty patches", () => {
    expect(updateActionSchema.safeParse({ due_date: null }).success).toBe(true);
    expect(updateActionSchema.safeParse({}).success).toBe(false);
  });
});
