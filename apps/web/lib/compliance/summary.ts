import type { AssessmentInfo } from "@mios/shared";

export interface ComplianceOverview {
  assessments: number;
  requirements: number;
  assessed: number;
  attention: number;
  gaps: number;
  pending: number;
  completionPercent: number;
  priority: AssessmentInfo[];
}

/** Counts only persisted assessment rows. No synthetic readiness or certification claims. */
export function complianceOverview(assessments: AssessmentInfo[]): ComplianceOverview {
  const totals: Record<string, number> = {};
  for (const assessment of assessments) {
    for (const [status, count] of Object.entries(assessment.counts)) {
      totals[status] = (totals[status] ?? 0) + (Number.isFinite(count) ? Math.max(0, count) : 0);
    }
  }
  const requirements = Object.values(totals).reduce((sum, count) => sum + count, 0);
  const pending = (totals.pending ?? 0) + (totals.unknown ?? 0);
  const gaps = totals.gap ?? 0;
  const attention = gaps + (totals.partial ?? 0) + pending;
  const assessed = Math.max(0, requirements - pending);

  return {
    assessments: assessments.length,
    requirements,
    assessed,
    attention,
    gaps,
    pending,
    completionPercent: requirements > 0 ? Math.round((assessed / requirements) * 100) : 0,
    priority: assessments.filter((a) =>
      (a.counts.gap ?? 0) + (a.counts.partial ?? 0) + (a.counts.unknown ?? 0) > 0,
    ),
  };
}
