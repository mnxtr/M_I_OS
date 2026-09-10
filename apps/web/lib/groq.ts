import "server-only";

type Message = {
  role: "system" | "user";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

export const GROQ_MODELS = {
  /** Grounded factory Q&A benefits from the larger reasoning model. */
  ask: process.env.GROQ_ASK_MODEL || "openai/gpt-oss-120b",
  /** Structured document summaries and spreadsheet explanations. */
  document: process.env.GROQ_DOCUMENT_MODEL || "qwen/qwen3.8-27b",
  /** OCR and image/scanned-document understanding. */
  vision: process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b",
  /** Short, low-latency explanations for analytics results. */
  analytics: process.env.GROQ_ANALYTICS_MODEL || "qwen/qwen3.6-27b",
} as const;

async function completion(messages: Message[], model: string, json = false) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured on the server");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_completion_tokens: 1200,
      // Qwen's non-thinking mode is a better fit for repeatable extraction work.
      reasoning_effort: "none",
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Groq request failed (${response.status})`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Groq returned no text");
  return content;
}

export interface DocumentAnalysis {
  summary: string;
  topics: string[];
  language: string;
  extraction: string;
}

export interface ComplianceVerdict {
  status: "compliant" | "partial" | "gap" | "unknown";
  notes: string;
  quote: string;
}

function normalizeAnalysis(value: unknown, fallback: string): DocumentAnalysis {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const topics = Array.isArray(record.topics)
    ? record.topics.filter((topic): topic is string => typeof topic === "string").slice(0, 8)
    : [];
  return {
    summary: typeof record.summary === "string" ? record.summary.slice(0, 1200) : fallback.slice(0, 1200),
    topics,
    language: typeof record.language === "string" ? record.language.slice(0, 12) : "en",
    extraction: typeof record.extraction === "string" ? record.extraction.slice(0, 30000) : fallback,
  };
}

export async function analyzeDocument(text: string, filename: string): Promise<DocumentAnalysis> {
  const excerpt = text.slice(0, 24000);
  const content = await completion([
    {
      role: "system",
      content: "You are MIOS's document-intelligence worker. Return strict JSON with summary, topics (string array), language, and extraction. Preserve factual text; never invent factory records.",
    },
    { role: "user", content: `Filename: ${filename}\n\nDocument text:\n${excerpt}` },
  ], GROQ_MODELS.document, true);
  try {
    return normalizeAnalysis(JSON.parse(content), text);
  } catch {
    return normalizeAnalysis(null, text);
  }
}

export async function analyzeImage(imageUrl: string, filename: string): Promise<DocumentAnalysis> {
  const content = await completion([
    {
      role: "system",
      content: "You are MIOS's vision/OCR worker. Read the supplied factory document image. Return strict JSON with summary, topics (string array), language, and extraction (verbatim OCR text where possible). Never invent values you cannot read.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: `Extract and understand this document image: ${filename}` },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ], GROQ_MODELS.vision, true);
  try {
    return normalizeAnalysis(JSON.parse(content), "");
  } catch {
    return normalizeAnalysis(null, "");
  }
}

/** Judge a checklist item only against supplied tenant evidence. */
export async function assessComplianceItem(input: {
  ref: string;
  category: string;
  title: string;
  guidance: string;
  evidence: Array<{ documentName: string; page: number; content: string }>;
}): Promise<ComplianceVerdict> {
  const context = input.evidence
    .map((entry) => `[${entry.documentName} p.${entry.page}]\n${entry.content.slice(0, 900)}`)
    .join("\n\n---\n\n");
  const content = await completion([
    {
      role: "system",
      content: "You are MIOS Compliance, an audit-readiness assessor. Judge only the supplied factory excerpts. Return strict JSON with status (compliant, partial, gap, or unknown), notes, and quote. Never claim compliance without documentary evidence.",
    },
    {
      role: "user",
      content: `Requirement [${input.ref}] (${input.category}): ${input.title}\nWhat auditors look for: ${input.guidance}\n\nTenant evidence:\n${context || "(none)"}`,
    },
  ], GROQ_MODELS.document, true);
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const status = typeof parsed.status === "string" ? parsed.status.toLowerCase() : "";
    if (["compliant", "partial", "gap", "unknown"].includes(status)) {
      return {
        status: status as ComplianceVerdict["status"],
        notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 1500) : "Evidence reviewed.",
        quote: typeof parsed.quote === "string" ? parsed.quote.slice(0, 400) : "",
      };
    }
  } catch {
    // The deterministic fallback below keeps compliance work usable if a provider reply is malformed.
  }
  throw new Error("Groq returned an invalid compliance verdict");
}

export async function draftCorrectiveAction(input: {
  ref: string;
  category: string;
  title: string;
  status: string;
  notes: string;
}) {
  return completion([
    {
      role: "system",
      content: "You draft concise corrective action plans for factory audit findings. Return plain text with: Root cause hypothesis, Corrective actions (numbered), Responsible role, Suggested timeline (days), and Verification method. Do not invent evidence.",
    },
    {
      role: "user",
      content: `Requirement [${input.ref}] (${input.category}): ${input.title}\nAssessment: ${input.status}\nAuditor notes: ${input.notes || "No notes recorded."}`,
    },
  ], GROQ_MODELS.document);
}

/** Explain bounded relational query results without giving the model database access. */
export async function explainAnalytics(
  question: string,
  tableNames: string,
  rows: Record<string, unknown>[],
) {
  const content = await completion([
    {
      role: "system",
      content: "You are MIOS's factory analytics explainer. Answer only from the supplied rows. State when the sample is insufficient. Be concise and do not invent calculations.",
    },
    {
      role: "user",
      content: `Question: ${question}\nTables: ${tableNames}\nRows: ${JSON.stringify(rows.slice(0, 100))}`,
    },
  ], GROQ_MODELS.analytics);
  return content.slice(0, 2000);
}
