import { describe, expect, it } from "vitest";
import { requireHumanReview } from "@/lib/compliance/review";

describe("requireHumanReview", () => {
  it("never certifies a requirement from an AI recommendation alone", () => {
    const result = requireHumanReview({ status: "compliant", notes: "Matches excerpt", quote: "Evidence" });
    expect(result.status).toBe("partial");
    expect(result.notes).toContain("human reviewer");
    expect(result.quote).toBe("Evidence");
  });
  it("preserves gap and unknown signals", () => {
    for (const status of ["gap", "unknown", "partial"] as const) {
      expect(requireHumanReview({ status, notes: "Review", quote: "" }).status).toBe(status);
    }
  });
});
