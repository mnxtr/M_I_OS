import { describe, expect, it } from "vitest";
import {
  canManageComplianceActions,
  complianceActionMetrics,
  filterComplianceActions,
  isActionOverdue,
  type ComplianceAction,
} from "@/lib/compliance/actions";

const base: ComplianceAction = {
  id: "a1",
  tenant_id: "tenant-a",
  assessment_id: "assessment-1",
  assessment_item_id: "item-1",
  title: "Fire equipment inspection",
  priority: "high",
  status: "open",
  assigned_to: null,
  due_date: "2026-10-27",
  notes: "Document service log",
  created_by: "user-1",
  created_at: "2026-10-20T00:00:00Z",
  updated_at: "2026-10-20T00:00:00Z",
  resolved_at: null,
};

describe("compliance action authorization", () => {
  it("only grants action management to compliance leadership", () => {
    expect(canManageComplianceActions("owner")).toBe(true);
    expect(canManageComplianceActions("admin")).toBe(true);
    expect(canManageComplianceActions("compliance_manager")).toBe(true);
    expect(canManageComplianceActions("operator")).toBe(false);
    expect(canManageComplianceActions("production_manager")).toBe(false);
    expect(canManageComplianceActions("auditor_guest")).toBe(false);
  });
});

describe("executive action metrics", () => {
  const rows: ComplianceAction[] = [
    base,
    { ...base, id: "a2", status: "blocked", due_date: "2026-11-02", priority: "critical", title: "Blocked safety review" },
    { ...base, id: "a3", status: "resolved", due_date: "2026-10-26", resolved_at: "2026-10-26T10:00:00Z" },
    { ...base, id: "a4", status: "in_progress", due_date: null, title: "Wage record follow-up" },
  ];
  it("does not count resolved work as overdue or verified compliance", () => {
    expect(isActionOverdue(rows[2]!, "2026-10-28")).toBe(false);
    expect(complianceActionMetrics(rows, "2026-10-28")).toEqual({
      total: 4,
      active: 3,
      blocked: 1,
      overdue: 1,
      dueSoon: 1,
      resolved: 1,
    });
  });
  it("filters attention items and supports search without changing inputs", () => {
    const result = filterComplianceActions(rows, "attention", "", "2026-10-28");
    expect(result.map((row) => row.id)).toEqual(["a1", "a2"]);
    expect(filterComplianceActions(rows, "all", "wage", "2026-10-28").map((row) => row.id)).toEqual(["a4"]);
    expect(rows[0]!.id).toBe("a1");
  });
});
