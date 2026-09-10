import { createClient } from "@supabase/supabase-js";

const tenantId = process.env.DEMO_TENANT_ID;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const groqKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_DOCUMENT_MODEL || "qwen/qwen3.8-27b";

if (!tenantId || !url || !secret || !groqKey) {
  throw new Error("Set DEMO_TENANT_ID, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, and GROQ_API_KEY.");
}

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

function modality(filename) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (["csv", "xlsx", "xlsm"].includes(extension)) return "table";
  if (["png", "jpg", "jpeg"].includes(extension)) return "vision";
  return "text";
}

function normalize(value, fallback) {
  const record = value && typeof value === "object" ? value : {};
  return {
    summary: typeof record.summary === "string" ? record.summary.slice(0, 1200) : fallback.slice(0, 1200),
    topics: Array.isArray(record.topics) ? record.topics.filter((topic) => typeof topic === "string").slice(0, 8) : [],
    language: typeof record.language === "string" ? record.language.slice(0, 12) : "en",
  };
}

async function analyze(text, filename) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${groqKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_completion_tokens: 700,
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are MIOS's document-intelligence worker. Return strict JSON with summary, topics (string array), and language. Preserve factual text; never invent factory records." },
        { role: "user", content: `Filename: ${filename}\n\nDocument excerpt:\n${text.slice(0, 24000)}` },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Groq insight backfill failed (${response.status})`);
  const payload = await response.json();
  try {
    return normalize(JSON.parse(payload.choices?.[0]?.message?.content ?? "{}"), text);
  } catch {
    return normalize(null, text);
  }
}

const { data: documents, error: documentError } = await admin
  .from("documents")
  .select("id,filename,language")
  .eq("tenant_id", tenantId)
  .eq("status", "ready")
  .order("created_at", { ascending: true });
if (documentError) throw documentError;

let updated = 0;
for (const document of documents ?? []) {
  const [{ data: chunks, error: chunkError }, { data: tables, error: tableError }] = await Promise.all([
    admin.from("chunks").select("content,chunk_index").eq("tenant_id", tenantId).eq("document_id", document.id).order("chunk_index"),
    admin.from("table_sources").select("row_count").eq("tenant_id", tenantId).eq("document_id", document.id),
  ]);
  if (chunkError) throw chunkError;
  if (tableError) throw tableError;
  const evidence = (chunks ?? []).map((chunk) => chunk.content).filter(Boolean).join("\n\n");
  if (!evidence) continue;
  const analysis = await analyze(evidence, document.filename);
  const { error: insightError } = await admin.from("knowledge_insights").upsert({
    tenant_id: tenantId,
    document_id: document.id,
    model,
    modality: modality(document.filename),
    summary: analysis.summary,
    topics: analysis.topics,
    language: analysis.language || document.language || "en",
    chunk_count: chunks?.length ?? 0,
    source_row_count: (tables ?? []).reduce((sum, table) => sum + Number(table.row_count || 0), 0),
    updated_at: new Date().toISOString(),
  }, { onConflict: "document_id" });
  if (insightError) throw insightError;
  updated += 1;
}

console.log(JSON.stringify({ tenant_id: tenantId, knowledge_insights_updated: updated }));
