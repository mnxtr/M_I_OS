/** An AI suggestion must never be recorded as a human-certified compliance verdict. */
export type SuggestedVerdict = {
  status: "compliant" | "partial" | "gap" | "unknown";
  notes: string;
  quote: string;
};

export function requireHumanReview(verdict: SuggestedVerdict): SuggestedVerdict {
  if (verdict.status !== "compliant") return verdict;
  return {
    ...verdict,
    status: "partial",
    notes: ("Relevant evidence was identified by automation. A human reviewer must " +
      "verify the full requirement before marking this item compliant. " +
      verdict.notes).slice(0, 1500),
  };
}
