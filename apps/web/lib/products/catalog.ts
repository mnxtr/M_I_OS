/**
 * Public positioning only: no private factory data, invented live KPIs or
 * implied certification. Keep product routes aligned with PLAN.md.
 */
export const PRODUCT_SLUGS = [
  "ask", "knowledge", "compliance", "analytics", "quality", "operations", "connect",
] as const;

export type ProductSlug = (typeof PRODUCT_SLUGS)[number];

export type ProductStage = "pilot" | "preview";

export interface ProductDefinition {
  slug: ProductSlug;
  name: string;
  tagline: string;
  eyebrow: string;
  description: string;
  audience: string;
  stage: ProductStage;
  workspacePath: string;
  trustNote: string;
  promise: string;
  pillars: ReadonlyArray<{ title: string; body: string }>;
  workflow: ReadonlyArray<{ title: string; body: string }>;
  useCases: ReadonlyArray<string>;
}

export const PRODUCTS: ReadonlyArray<ProductDefinition> = [
  {
    slug: "ask", name: "Ask", tagline: "Ask the factory. Trace the answer.",
    eyebrow: "01 / Contextual intelligence",
    description: "Explore questions across factory documents and available knowledge sources, with a clear path back to the supporting record.",
    audience: "Knowledge teams, plant managers and operational leaders",
    stage: "pilot", workspacePath: "/ask",
    trustNote: "AI responses can be incomplete or incorrect. Validate evidence and citations before making consequential decisions.",
    promise: "Move from searching document folders to reviewing source-backed answers.",
    pillars: [
      { title: "Document context", body: "Bring manuals, procedures and permitted factory files into one question workflow." },
      { title: "Source trail", body: "Follow citations back to the underlying document when supporting context is available." },
      { title: "Language flexibility", body: "Design for English and Bangla factory workflows, with review of technical terminology." },
      { title: "Responsible answers", body: "Make uncertainty and insufficient evidence visible rather than pretending a source exists." },
    ],
    workflow: [
      { title: "Ask", body: "Describe a production, procedure or policy question." },
      { title: "Review", body: "Inspect the retrieved context and cited source snippets." },
      { title: "Decide", body: "Confirm the answer against the underlying record and responsible staff." },
    ],
    useCases: ["SOP lookup", "Policy clarification", "Document-backed incident review"],
  },
  {
    slug: "knowledge", name: "Knowledge", tagline: "One place for the records that matter.",
    eyebrow: "02 / Document intelligence",
    description: "Organize technical files, SOPs, compliance evidence and structured factory data in a connected knowledge workspace.",
    audience: "Document controllers, quality and compliance teams",
    stage: "pilot", workspacePath: "/knowledge",
    trustNote: "Document visibility must follow factory permissions. Indexing and processing may not yet be available for every file type.",
    promise: "Make operational records easier to find, verify and maintain.",
    pillars: [
      { title: "Document library", body: "Bring authorized factory knowledge together without weakening document ownership." },
      { title: "Ingestion awareness", body: "Track files and processing outcomes, including incomplete or failed imports." },
      { title: "Queryable tables", body: "Maintain structured context from compatible spreadsheet sources." },
      { title: "Traceability", body: "Keep the original document available for human interpretation and verification." },
    ],
    workflow: [
      { title: "Collect", body: "Add approved procedures, records and source files." },
      { title: "Organize", body: "Review processing status and document metadata." },
      { title: "Reuse", body: "Connect authorized records to search, analysis and assessments." },
    ],
    useCases: ["SOP libraries", "Audit evidence folders", "Spreadsheet ingestion"],
  },
  {
    slug: "compliance", name: "Compliance", tagline: "Evidence. Accountability. Assurance.",
    eyebrow: "03 / Executive assurance",
    description: "Connect factory requirements with actual evidence, human review and corrective action follow-through.",
    audience: "Factory executives, compliance managers and authorized auditors",
    stage: "pilot", workspacePath: "/compliance",
    trustNote: "Linora assists internal readiness; it is not a regulator, legal adviser or certification authority. AI suggestions are not final audit verdicts.",
    promise: "Give leadership a clearer view of what is evidenced, what is missing and who must act.",
    pillars: [
      { title: "Requirements", body: "Organize internal assessment checklists without implying official buyer-program accreditation." },
      { title: "Evidence review", body: "Link findings to authorized factory records and highlight evidence gaps." },
      { title: "Corrective actions", body: "Track follow-up owners, priorities and deadlines in an accountable register." },
      { title: "Human assurance", body: "Keep final positive compliance decisions separate from machine-generated suggestions." },
    ],
    workflow: [
      { title: "Assess", body: "Open a scoped review against an applicable requirement pack." },
      { title: "Substantiate", body: "Collect evidence and identify uncertainty, missing material or gaps." },
      { title: "Resolve", body: "Assign action, review closure evidence and seek authorized human confirmation." },
    ],
    useCases: ["Internal readiness reviews", "Fire and workplace safety evidence", "Corrective action tracking"],
  },
  {
    slug: "analytics", name: "Analytics", tagline: "Numbers you can explain.",
    eyebrow: "04 / Factory decision analytics",
    description: "Connect operational tables and factory indicators to interpretable questions, comparisons and documented assumptions.",
    audience: "Plant leadership, engineering and financial stakeholders",
    stage: "pilot", workspacePath: "/analytics",
    trustNote: "Verify the actual data source and computation. Prototype query descriptions and sampled results must not be treated as audited financial figures.",
    promise: "Shift from isolated spreadsheets to explainable operational signals.",
    pillars: [
      { title: "Source context", body: "Tie reported indicators to approved tables and reporting periods." },
      { title: "Operational questions", body: "Explore production, downtime and quality data through a guided interface." },
      { title: "Visible limitations", body: "Identify missing records, incomplete samples and unverified transformations." },
      { title: "Executive interpretation", body: "Focus on the decisions suggested by data, not a chart in isolation." },
    ],
    workflow: [
      { title: "Choose a source", body: "Select a permitted structured dataset." },
      { title: "Explore", body: "Inspect an aggregate or analytical question." },
      { title: "Validate", body: "Confirm the period, calculation, sample size and relevant explanation." },
    ],
    useCases: ["Shift comparisons", "Production exceptions", "Management reporting"],
  },
  {
    slug: "quality", name: "Quality", tagline: "See defects. Learn the pattern.",
    eyebrow: "05 / Quality intelligence preview",
    description: "A planned home for inspection records, recurring defects and evidence-led quality improvement.",
    audience: "QA teams, industrial engineers and factory leaders",
    stage: "preview", workspacePath: "/quality",
    trustNote: "The authenticated quality workspace is currently feature-flagged and not a complete inspection product. No live quality metrics are implied.",
    promise: "Create a shared path from an observed defect to an accountable corrective action.",
    pillars: [
      { title: "Inspection context", body: "Future structured records for inspection points and observed defects." },
      { title: "Pareto analysis", body: "Planned prioritization of recurring defect categories." },
      { title: "Evidence trail", body: "Proposed links from a finding to authorized inspection evidence." },
      { title: "Quality actions", body: "A reviewable route for preventive and corrective measures." },
    ],
    workflow: [
      { title: "Observe", body: "Capture a quality signal with source context." },
      { title: "Prioritize", body: "Review frequencies, severity and recurring patterns." },
      { title: "Improve", body: "Assign a corrective measure and verify its outcome." },
    ],
    useCases: ["Defect reporting", "Trend investigation", "Inspection follow-up"],
  },
  {
    slug: "operations", name: "Operations", tagline: "The factory, in focus.",
    eyebrow: "06 / Executive command layer",
    description: "Bring production indicators, operational exceptions and management priorities into one concise factory workspace.",
    audience: "CEOs, COOs, plant managers and production leadership",
    stage: "pilot", workspacePath: "/dashboard",
    trustNote: "Operational numbers require verified factory sources, timestamps and correct site context. Illustrative interface data is not live evidence.",
    promise: "Spend less attention hunting for indicators and more time acting on verified exceptions.",
    pillars: [
      { title: "Production view", body: "Frame line output, downtime and quality indicators within the relevant period." },
      { title: "Exceptions first", body: "Surface signals that require decisions rather than overwhelming leadership with tables." },
      { title: "Source transparency", body: "Show when a record was updated and where an indicator originated." },
      { title: "Accountability", body: "Connect executive oversight with documented follow-up workflows." },
    ],
    workflow: [
      { title: "Observe", body: "Review an authorized factory overview." },
      { title: "Investigate", body: "Move from summary indicators to supporting records." },
      { title: "Act", body: "Assign a responsible team and track the outcome." },
    ],
    useCases: ["Executive briefings", "Plant performance review", "Exception management"],
  },
  {
    slug: "connect", name: "Connect", tagline: "Bridge the data. Keep control.",
    eyebrow: "07 / Integration architecture",
    description: "A governed entry point for connecting existing factory systems, approved data exports and operational files.",
    audience: "Factory IT teams, integration partners and process owners",
    stage: "preview", workspacePath: "/settings/connectors",
    trustNote: "Connector availability differs by environment. Production credentials and integration APIs require independent security approval.",
    promise: "Move toward reliable operational information without surrendering ownership of source systems.",
    pillars: [
      { title: "System inventory", body: "Describe data sources and their approved integration scope." },
      { title: "Secure connections", body: "Design for least-privilege credentials and tenant-scoped ingestion." },
      { title: "Mapping", body: "Translate exports and schemas into usable operational records." },
      { title: "Monitoring", body: "Make connector status, failures and recovery visible to administrators." },
    ],
    workflow: [
      { title: "Register", body: "Identify the source, owner and permitted access scope." },
      { title: "Validate", body: "Test schema mapping, permissions and processing boundaries." },
      { title: "Maintain", body: "Monitor data freshness, retries and integration health." },
    ],
    useCases: ["ERP export intake", "Document sync planning", "Integration monitoring"],
  },
];

export function getProduct(slug: string): ProductDefinition | undefined {
  return PRODUCTS.find((item) => item.slug === slug);
}

export const PRODUCT_SECTIONS = ["about", "platform", "trust", "demo"] as const;
export type ProductSection = (typeof PRODUCT_SECTIONS)[number];
export function isProductSection(value: string): value is ProductSection {
  return PRODUCT_SECTIONS.some((section) => section === value);
}
