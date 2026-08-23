"""Seed audit checklist packs.

Requirements are MIOS-authored summaries of widely used social-compliance themes
(child labor, wages, fire & building safety, OHS, environment, management systems).
They are intentionally generic; buyer-specific codes (BSCI/SMETA/WRAP editions)
should be added as tenant-specific templates during onboarding.
"""

PACKS: list[dict] = [
    {
        "code": "social-compliance-core",
        "name": "Core Social Compliance Pack",
        "version": 1,
        "description": (
            "Baseline requirements common to major buyer codes "
            "(amfori BSCI, SMETA, WRAP-aligned themes)."
        ),
        "items": [
            {
                "ref": "CL-01",
                "category": "Child Labor",
                "title": "No workers under minimum legal age; age-verification at hiring",
                "guidance": (
                    "Age verification procedure, hiring records with age proof, "
                    "no underage workers found in personnel files."
                ),
            },
            {
                "ref": "CL-02",
                "category": "Young Workers",
                "title": "Young workers (above min age, under 18) protected from hazardous work and night shifts",
                "guidance": "List of young workers, restricted duties policy, shift rosters.",
            },
            {
                "ref": "FL-01",
                "category": "Forced Labor",
                "title": "No forced, bonded or prison labor; no withheld identity documents",
                "guidance": "Document retention policy, recruitment agent contracts, worker interviews.",
            },
            {
                "ref": "FL-02",
                "category": "Forced Labor",
                "title": "No recruitment fees charged to workers; fair terms of employment",
                "guidance": "Fee receipts, employment contracts in Bangla, grievance records.",
            },
            {
                "ref": "FD-01",
                "category": "Freedom of Association",
                "title": "Workers' right to organize respected; functioning worker committee",
                "guidance": "Worker committee meeting minutes, participation training records.",
            },
            {
                "ref": "DI-01",
                "category": "Discrimination",
                "title": "No discrimination in hiring, pay, promotion, or discipline",
                "guidance": "Equal-opportunity policy, gender balance data, maternity protections.",
            },
            {
                "ref": "WH-01",
                "category": "Working Hours",
                "title": "Working hours comply with law; overtime voluntary and compensated",
                "guidance": "Attendance records 12 months back, overtime consent, rosters vs actual hours.",
            },
            {
                "ref": "WG-01",
                "category": "Wages & Benefits",
                "title": "Wages meet legal minimum incl. overtime premiums; paid on time with payslips",
                "guidance": "Payroll register cross-checked to attendance, payslip samples, festival bonus records.",
            },
            {
                "ref": "HS-01",
                "category": "Occupational Health & Safety",
                "title": "Machinery guarded; PPE provided and used; chemical safety (MSDS) in place",
                "guidance": "Machine guarding inspection log, PPE issue register, MSDS folder for chemicals.",
            },
            {
                "ref": "FS-01",
                "category": "Fire & Building Safety",
                "title": "Fire licenses valid; extinguishers serviced; exits unlocked and unobstructed",
                "guidance": "Fire license certificate, extinguisher service tags, evacuation drill records.",
            },
            {
                "ref": "EN-01",
                "category": "Environment",
                "title": "Environmental clearances valid; effluent treatment operational where applicable",
                "guidance": "DoE clearance certificates, ETP operation log, waste disposal contracts.",
            },
            {
                "ref": "MS-01",
                "category": "Management Systems",
                "title": "Social compliance policy documented; internal audits and CAP follow-up running",
                "guidance": "Signed policy, past audit reports, corrective action tracker with closure evidence.",
            },
        ],
    },
    {
        "code": "fire-safety-rsc-style",
        "name": "Fire & Building Safety Pack",
        "version": 1,
        "description": "Focused pack for fire/building/electrical readiness reviews.",
        "items": [
            {
                "ref": "FB-01",
                "category": "Certification",
                "title": "Fire license and building occupancy certificates current",
                "guidance": "Certificate copies with validity dates noted.",
            },
            {
                "ref": "FB-02",
                "category": "Detection & Alarm",
                "title": "Smoke detectors and alarm call points tested on schedule",
                "guidance": "Monthly test log with signatures.",
            },
            {
                "ref": "FB-03",
                "category": "Means of Escape",
                "title": "Exit routes marked, lit, unlocked during working hours; assembly point signage",
                "guidance": "Floor plans, photo walkthroughs, gate-release mechanism records.",
            },
            {
                "ref": "FB-04",
                "category": "Suppression",
                "title": "Extinguishers/hose systems present per floor plan and inspected",
                "guidance": "Service tags within validity, capacity calculations.",
            },
            {
                "ref": "FB-05",
                "category": "Training & Drills",
                "title": "Evacuation drills held quarterly per shift; fire wardens trained",
                "guidance": "Drill reports with timing, warden list, training attendance sheets.",
            },
            {
                "ref": "FB-06",
                "category": "Electrical Safety",
                "title": "Electrical panels closed/labeled; wiring condition checked by licensed electrician",
                "guidance": "Inspection report, thermographic scan if available.",
            },
        ],
    },
]

ITEM_STATUSES = ("pending", "compliant", "partial", "gap", "unknown", "not_applicable")
TERMINAL_STATUSES = ("compliant", "partial", "gap", "unknown", "not_applicable")
