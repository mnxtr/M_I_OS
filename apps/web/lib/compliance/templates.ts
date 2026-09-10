import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type ChecklistItemSeed = {
  ref: string;
  category: string;
  title: string;
  guidance: string;
};

export const DEFAULT_CHECKLISTS = [
  {
    code: "social-compliance-core",
    name: "Core Social Compliance Pack",
    version: 1,
    description: "Baseline requirements common to major buyer codes (amfori BSCI, SMETA, WRAP-aligned themes).",
    items: [
      ["CL-01", "Child Labor", "No workers under minimum legal age; age-verification at hiring", "Age verification procedure, hiring records with age proof, no underage workers found in personnel files."],
      ["CL-02", "Young Workers", "Young workers (above min age, under 18) protected from hazardous work and night shifts", "List of young workers, restricted duties policy, shift rosters."],
      ["FL-01", "Forced Labor", "No forced, bonded or prison labor; no withheld identity documents", "Document retention policy, recruitment agent contracts, worker interviews."],
      ["FL-02", "Forced Labor", "No recruitment fees charged to workers; fair terms of employment", "Fee receipts, employment contracts in Bangla, grievance records."],
      ["FD-01", "Freedom of Association", "Workers' right to organize respected; functioning worker committee", "Worker committee meeting minutes, participation training records."],
      ["DI-01", "Discrimination", "No discrimination in hiring, pay, promotion, or discipline", "Equal-opportunity policy, gender balance data, maternity protections."],
      ["WH-01", "Working Hours", "Working hours comply with law; overtime voluntary and compensated", "Attendance records 12 months back, overtime consent, rosters vs actual hours."],
      ["WG-01", "Wages & Benefits", "Wages meet legal minimum incl. overtime premiums; paid on time with payslips", "Payroll register cross-checked to attendance, payslip samples, festival bonus records."],
      ["HS-01", "Occupational Health & Safety", "Machinery guarded; PPE provided and used; chemical safety (MSDS) in place", "Machine guarding inspection log, PPE issue register, MSDS folder for chemicals."],
      ["FS-01", "Fire & Building Safety", "Fire licenses valid; extinguishers serviced; exits unlocked and unobstructed", "Fire license certificate, extinguisher service tags, evacuation drill records."],
      ["EN-01", "Environment", "Environmental clearances valid; effluent treatment operational where applicable", "DoE clearance certificates, ETP operation log, waste disposal contracts."],
      ["MS-01", "Management Systems", "Social compliance policy documented; internal audits and CAP follow-up running", "Signed policy, past audit reports, corrective action tracker with closure evidence."],
    ],
  },
  {
    code: "fire-safety-rsc-style",
    name: "Fire & Building Safety Pack",
    version: 1,
    description: "Focused pack for fire, building and electrical readiness reviews.",
    items: [
      ["FB-01", "Certification", "Fire license and building occupancy certificates current", "Certificate copies with validity dates noted."],
      ["FB-02", "Detection & Alarm", "Smoke detectors and alarm call points tested on schedule", "Monthly test log with signatures."],
      ["FB-03", "Means of Escape", "Exit routes marked, lit, unlocked during working hours; assembly point signage", "Floor plans, photo walkthroughs, gate-release mechanism records."],
      ["FB-04", "Suppression", "Extinguishers/hose systems present per floor plan and inspected", "Service tags within validity, capacity calculations."],
      ["FB-05", "Training & Drills", "Evacuation drills held quarterly per shift; fire wardens trained", "Drill reports with timing, warden list, training attendance sheets."],
      ["FB-06", "Electrical Safety", "Electrical panels closed/labeled; wiring condition checked by licensed electrician", "Inspection report, thermographic scan if available."],
    ],
  },
].map((template) => ({
  ...template,
  items: template.items.map(([ref, category, title, guidance]) => ({ ref, category, title, guidance })) as ChecklistItemSeed[],
}));

export async function ensureChecklistTemplates() {
  const admin = createAdminClient();
  const { data: existing, error: readError } = await admin
    .from("checklist_templates")
    .select("code")
    .in("code", DEFAULT_CHECKLISTS.map((template) => template.code));
  if (readError) throw new Error(readError.message);
  const existingCodes = new Set((existing ?? []).map((template) => template.code));
  const missing = DEFAULT_CHECKLISTS.filter((template) => !existingCodes.has(template.code));
  if (!missing.length) return;
  const { error } = await admin.from("checklist_templates").insert(
    missing.map((template) => ({ ...template, items: template.items })),
  );
  if (error) throw new Error(error.message);
}
