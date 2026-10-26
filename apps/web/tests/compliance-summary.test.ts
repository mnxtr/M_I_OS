import { describe, expect, it } from "vitest";
import type { AssessmentInfo } from "@mios/shared";
import { complianceOverview } from "@/lib/compliance/summary";

const assessment = (counts: Record<string, number>): AssessmentInfo => ({
  id: "example",
  title: "Quarterly review",
  template_code: "social-compliance-core",
  due_date: "",
  status: "pending",
  created_at: "2026-10-26T00:00:00Z",
  counts,
});

describe("complianceOverview", () => {
  it("shows zero activity rather than inventing readiness", () => {
    expect(complianceOverview([])).toMatchObject({
      assessments: 0, requirements: 0, assessed: 0,
      completionPercent: 0, gaps: 0, attention: 0, priority: [],
    });
  });
  it("summarizes only persisted counts and prioritizes unresolved assessments", () => {
    const second = { ...assessment({ compliant: 4, pending: 1 }), id: "second" };
    const result = complianceOverview([
      assessment({ compliant: 2, gap: 1, partial: 2, unknown: 1 }),
      second,
    ]);
    expect(result).toMatchObject({
      assessments: 2, requirements: 11, assessed: 9, gaps: 1, pending: 2,
      attention: 5, completionPercent: 82,
    });
    expect(result.priority).toHaveLength(1);
  });
});
