/** The action register tracks remediation work, never audit verification. */
export const ACTION_STATUSES = ["open", "in_progress", "blocked", "resolved"] as const;
export const ACTION_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];
export type ActionPriority = (typeof ACTION_PRIORITIES)[number];

export interface ComplianceAction {
  id: string;
  tenant_id: string;
  assessment_id: string;
  assessment_item_id: string;
  title: string;
  priority: ActionPriority;
  status: ActionStatus;
  assigned_to: string | null;
  due_date: string | null;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface ActionCandidate {
  id: string;
  ref: string;
  title: string;
  assessment_id: string;
  status: string;
}

export interface ActionOwner {
  id: string;
  full_name: string;
  email: string;
}

export const ACTION_EDITOR_ROLES = ["owner", "admin", "compliance_manager"] as const;

export function canManageComplianceActions(role: string): boolean {
  return ACTION_EDITOR_ROLES.some((allowed) => allowed === role);
}

export function localDateISO(now: Date): string {
  return [String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

export function isActionOverdue(action: ComplianceAction, today: string): boolean {
  return action.status !== "resolved" && !!action.due_date && action.due_date < today;
}

export function complianceActionMetrics(actions: ComplianceAction[], today: string) {
  const end = new Date(today + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + 7);
  const weekEnd = end.toISOString().slice(0, 10);
  return {
    total: actions.length,
    active: actions.filter((action) => action.status !== "resolved").length,
    blocked: actions.filter((action) => action.status === "blocked").length,
    overdue: actions.filter((action) => isActionOverdue(action, today)).length,
    dueSoon: actions.filter((action) => action.status !== "resolved" && !!action.due_date && action.due_date >= today && action.due_date <= weekEnd).length,
    resolved: actions.filter((action) => action.status === "resolved").length,
  };
}

export function filterComplianceActions(actions: ComplianceAction[], filter: "all" | "attention" | "resolved", query: string, today: string): ComplianceAction[] {
  const needle = query.trim().toLowerCase();
  return actions.filter((action) =>
    (filter === "all" || (filter === "resolved" ? action.status === "resolved" : isActionOverdue(action, today) || action.status === "blocked"))
    && (!needle || (action.title + " " + action.notes).toLowerCase().includes(needle))
  ).sort((a, b) => {
    if (a.status === "resolved" && b.status !== "resolved") return 1;
    if (b.status === "resolved" && a.status !== "resolved") return -1;
    return (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31");
  });
}
