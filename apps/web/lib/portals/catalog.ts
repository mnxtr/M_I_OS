/**
 * Linora module catalog. Public product pages only — no tenant data or secrets.
 * Domain labels are proposals until the owner verifies DNS and Vercel aliases.
 */
export type PortalStage = "existing" | "review" | "planned";

export interface PortalDefinition {
  slug: string;
  name: string;
  category: string;
  headline: string;
  description: string;
  audience: string;
  signature: string;
  accent: string;
  workspacePath: string;
  stage: PortalStage;
  modules: readonly { title: string; description: string }[];
  journey: readonly [string, string, string, string];
}

export const PORTALS = [
  {
    slug: "app",
    name: "Executive Workspace",
    category: "Command / 01",
    headline: "One operating picture. Better factory decisions.",
    description: "A shared starting point for operational signals, urgent exceptions and evidence-backed conversations across the manufacturing organization.",
    audience: "CEOs, owners and executive teams",
    signature: "See the signal. Own the outcome.",
    accent: "#73f6d2",
    workspacePath: "/dashboard",
    stage: "existing",
    journey: ["Observe", "Prioritize", "Delegate", "Review"],
    modules: [
      { title: "Operational pulse", description: "Bring available factory measures together with their reporting context and update times." },
      { title: "Decision queue", description: "Trace operational questions to the teams and source systems that can answer them." },
      { title: "Executive accessibility", description: "An intentional small-screen experience for time-constrained decision makers." },
    ],
  },
  {
    slug: "compliance",
    name: "Compliance Assurance",
    category: "Assurance / 02",
    headline: "Evidence, not assumptions.",
    description: "Plan factory assessments, understand evidence gaps and coordinate corrective action with transparent, human-reviewed outcomes.",
    audience: "Compliance officers, factory owners and authorized auditors",
    signature: "Evidence. Accountability. Assurance.",
    accent: "#b4e3ba",
    workspacePath: "/compliance",
    stage: "review",
    journey: ["Assess", "Trace", "Correct", "Verify"],
    modules: [
      { title: "Requirement workspaces", description: "Maintain a structured view of applicable requirements and review status." },
      { title: "Evidence lineage", description: "Follow a finding back to its documents and reviewers, not a model's unsupported assertion." },
      { title: "Corrective action", description: "Assign follow-up work and document closure without automatically certifying a requirement." },
    ],
  },
  {
    slug: "ask",
    name: "Ask Linora",
    category: "Intelligence / 03",
    headline: "Ask your factory. Follow the evidence.",
    description: "Turn a manufacturing question into a search across authorized factory knowledge, with source references where available.",
    audience: "Executives, analysts and plant teams",
    signature: "The answer should have a source.",
    accent: "#9cdbff",
    workspacePath: "/ask",
    stage: "review",
    journey: ["Question", "Retrieve", "Cite", "Decide"],
    modules: [
      { title: "Natural-language queries", description: "Ask about operational documents and factory history without navigating separate file systems." },
      { title: "Grounded responses", description: "Inspect the evidence supporting an answer and allow a clear no-evidence response." },
      { title: "Bilingual discovery", description: "Support English and Bangla workflows as retrieval and evaluation coverage matures." },
    ],
  },
  {
    slug: "knowledge",
    name: "Knowledge Hub",
    category: "Evidence / 04",
    headline: "Your institutional memory, within reach.",
    description: "Bring factory documents, SOPs and operating references into an organized, searchable evidence library.",
    audience: "Knowledge managers, engineers and compliance teams",
    signature: "Find it. Verify it. Reuse it.",
    accent: "#dcc2ff",
    workspacePath: "/knowledge",
    stage: "existing",
    journey: ["Collect", "Index", "Discover", "Verify"],
    modules: [
      { title: "Document library", description: "Keep authorized source material within the same factory workspace." },
      { title: "Document intelligence", description: "Prepare file content for retrieval, citations and related operational use cases." },
      { title: "Access and lifecycle", description: "Plan retention, deletion, upload recovery and controlled document sharing." },
    ],
  },
  {
    slug: "analytics",
    name: "Manufacturing Analytics",
    category: "Insight / 05",
    headline: "Numbers that can explain themselves.",
    description: "Connect operational tables and analytical questions to reproducible metrics and transparent calculation methods.",
    audience: "COOs, finance leaders and operations analysts",
    signature: "Measure what matters. Show your workings.",
    accent: "#ffd094",
    workspacePath: "/analytics",
    stage: "review",
    journey: ["Connect", "Validate", "Analyze", "Explain"],
    modules: [
      { title: "Source-aware analysis", description: "Identify the underlying records, coverage period and applicable factory filters." },
      { title: "Operational questions", description: "Explore throughput, downtime and other reported metrics with understandable outputs." },
      { title: "Metric provenance", description: "Distinguish actual executed calculations from illustrative query explanations." },
    ],
  },
  {
    slug: "quality",
    name: "Quality Intelligence",
    category: "Quality / 06",
    headline: "From recurring defects to clear next steps.",
    description: "A planned quality workspace for organized defect observations, verified trends and continuous improvement follow-through.",
    audience: "Quality heads and manufacturing engineers",
    signature: "Observe. Investigate. Improve.",
    accent: "#ffbdb1",
    workspacePath: "/quality",
    stage: "planned",
    journey: ["Capture", "Classify", "Investigate", "Improve"],
    modules: [
      { title: "Defect taxonomy", description: "Map quality observations to products, production stages and controlled categories." },
      { title: "Pattern discovery", description: "Investigate recurring signals only after connected records and baselines are verified." },
      { title: "Improvement tracking", description: "Maintain a human-reviewed root-cause and corrective-action workflow." },
    ],
  },
  {
    slug: "integrations",
    name: "Integrations",
    category: "Connectivity / 07",
    headline: "Connect what the factory already uses.",
    description: "A controlled entry point for understanding data sources, connector permissions and system-to-system reliability.",
    audience: "IT leaders, ERP owners and implementation teams",
    signature: "Bring the systems together responsibly.",
    accent: "#93e7e5",
    workspacePath: "/settings/connectors",
    stage: "review",
    journey: ["Authorize", "Connect", "Monitor", "Maintain"],
    modules: [
      { title: "Connector registry", description: "Track source-system purposes, authorization and operational readiness." },
      { title: "Secure integration", description: "Keep tenant credentials and sync privileges out of client-side application code." },
      { title: "Data lineage", description: "Preserve provenance and remediation paths when imported data is incomplete." },
    ],
  },
  {
    slug: "accounts",
    name: "Identity & Teams",
    category: "Identity / 08",
    headline: "The right people. The right boundaries.",
    description: "A brand-level introduction to team onboarding, access roles and secure collaboration within a manufacturing organization.",
    audience: "Factory administrators and IT security teams",
    signature: "Every permission should have a reason.",
    accent: "#a9d3ff",
    workspacePath: "/settings/team",
    stage: "review",
    journey: ["Invite", "Verify", "Authorize", "Review"],
    modules: [
      { title: "Factory identities", description: "Reuse existing Supabase Auth rather than issuing a separate account per product portal." },
      { title: "Role boundaries", description: "Document reviewer, administrator and operator capabilities with server-side checks." },
      { title: "Tenant isolation", description: "Prove that customer A cannot access customer B through any application or database path." },
    ],
  },
  {
    slug: "billing",
    name: "Billing & Plans",
    category: "Commercial / 09",
    headline: "Clear plans for growing operations.",
    description: "A transparent starting point for subscriptions, entitlements and invoices, with verified payment status as the source of truth.",
    audience: "Finance teams and account owners",
    signature: "Know your plan. Control your spend.",
    accent: "#ffdbab",
    workspacePath: "/settings/billing",
    stage: "review",
    journey: ["Choose", "Authorize", "Reconcile", "Review"],
    modules: [
      { title: "Plan visibility", description: "Understand factory-level access and the entitlements associated with a subscription." },
      { title: "Payment assurance", description: "Only server-verified provider callbacks can activate paid entitlements." },
      { title: "Billing evidence", description: "Surface invoices and payment history with appropriate owner permissions." },
    ],
  },
  {
    slug: "governance",
    name: "Governance & Audit",
    category: "Trust / 10",
    headline: "Accountability you can examine.",
    description: "A planned governance layer for accountable decisions, access review, privacy controls and traceable audit activity.",
    audience: "C-suite, risk officers and authorized auditors",
    signature: "Trust demands a record.",
    accent: "#cfc4ff",
    workspacePath: "/settings/audit-log",
    stage: "planned",
    journey: ["Define", "Observe", "Investigate", "Improve"],
    modules: [
      { title: "Audit records", description: "Plan durable records of significant user and system actions with appropriate retention." },
      { title: "Security oversight", description: "Review permissions, privileged access and cross-tenant evidence with accountable owners." },
      { title: "Policy transparency", description: "Document privacy, data handling and incident-response practices without unearned certifications." },
    ],
  },
] as const satisfies readonly PortalDefinition[];

export type PortalSlug = (typeof PORTALS)[number]["slug"];
const portalBySlug = new Map<string, (typeof PORTALS)[number]>(PORTALS.map((portal) => [portal.slug, portal]));

export function getPortal(slug: string): (typeof PORTALS)[number] | undefined {
  return portalBySlug.get(slug);
}

export function canonicalAppOrigin(configured?: string): string {
  const fallback = "https://mios-manufacturing-pilot.vercel.app";
  if (!configured) return fallback;
  try {
    const url = new URL(configured);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return fallback;
    if (url.protocol === "https:") return url.origin;
    if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) return url.origin;
  } catch {
    // Misconfigured origin must never turn into a user-controlled redirect.
  }
  return fallback;
}

export function workspaceUrl(slug: PortalSlug, configured?: string): string {
  const portal = getPortal(slug);
  if (!portal) throw new Error("Unknown Linora module");
  return new URL(portal.workspacePath, canonicalAppOrigin(configured)).toString();
}

export const PORTAL_SECTIONS = ["platform", "about", "trust", "demo"] as const;
export type PortalSection = (typeof PORTAL_SECTIONS)[number];

export function isPortalSection(section: string): section is PortalSection {
  return PORTAL_SECTIONS.some((name) => name === section);
}

/**
 * Strictly opt-in mapping; do not accept wildcard, suffix, port tricks or
 * root-domain guesses. No DNS/domain claims can be made from this function.
 */
export function resolvePortalHost(host: string | null, rootDomain?: string): PortalSlug | null {
  const root = rootDomain?.trim().toLowerCase().replace(/\.$/, "");
  if (!root || !/^(?:[a-z0-9-]+\.)+[a-z0-9-]+$/.test(root) || (root === "vercel.app" || root.endsWith(".vercel.app"))) return null;
  const normalizedHost = (host ?? "").toLowerCase().replace(/\.$/, "");
  if (!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/.test(normalizedHost)) return null;
  const hostname = normalizedHost.replace(/:[0-9]{1,5}$/, "");
  const suffix = "." + root;
  if (!hostname.endsWith(suffix)) return null;
  const prefix = hostname.slice(0, -suffix.length);
  return getPortal(prefix)?.slug ?? null;
}

/** Only the five public brochure routes are mapped, never protected app APIs. */
export function portalPublicRewrite(host: string | null, pathname: string, rootDomain?: string): string | null {
  const slug = resolvePortalHost(host, rootDomain);
  if (!slug) return null;
  if (pathname === "/") return `/portals/${slug}`;
  const section = pathname.slice(1);
  if (pathname.startsWith("/") && isPortalSection(section)) return `/portals/${slug}/${section}`;
  return null;
}

/** All other subdomains on the configured company root are reserved by default.
 * This prevents accidental shadow login, API and callback endpoints.
 */
export function isUnassignedPortalHost(host: string | null, rootDomain?: string): boolean {
  const root = rootDomain?.trim().toLowerCase().replace(/\.$/, "");
  if (!root || !/^(?:[a-z0-9-]+\.)+[a-z0-9-]+$/.test(root) || root === "vercel.app" || root.endsWith(".vercel.app")) return false;
  const normalized = (host ?? "").toLowerCase().replace(/\.$/, "").replace(/:[0-9]{1,5}$/, "");
  if (!/^[a-z0-9.-]+$/.test(normalized)) return false;
  return normalized.endsWith("." + root) && !resolvePortalHost(host, root);
}
