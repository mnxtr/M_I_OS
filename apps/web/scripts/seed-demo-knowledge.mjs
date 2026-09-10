import { createClient } from "@supabase/supabase-js";

const tenantId = process.env.DEMO_TENANT_ID;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const groqKey = process.env.GROQ_API_KEY;

if (!tenantId || !url || !secret || !groqKey) {
  throw new Error("Set DEMO_TENANT_ID, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, and GROQ_API_KEY.");
}

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const sources = [
  {
    filename: "demo-factory-safety-sop.md",
    doc_type: "sop",
    department: "production",
    content: `# Factory Safety SOP\n\nAll production-floor staff must wear safety shoes, gloves, and eye protection. Supervisors complete a start-of-shift safety walk at 08:45 and log blocked exits immediately.\n\n## Incident reporting\n\nReport injuries, near misses, machine guard faults, and chemical spills to the line supervisor within 15 minutes. The supervisor records the incident and assigns corrective action before the next shift.\n\n## Emergency exits\n\nKeep every exit, aisle, and fire extinguisher access route clear at all times.`,
  },
  {
    filename: "demo-quality-inspection-guide.md",
    doc_type: "quality",
    department: "quality",
    content: `# Quality Inspection Guide\n\nInspect the first five units of every production order before bulk production. Record stitch density, label placement, shade variation, and measurement tolerance.\n\nA defect rate above 3 percent requires a line stop, root-cause review, and a documented corrective action. Reinspect ten units after the correction before restarting the line.\n\nEscalate repeated critical defects to the quality manager and production manager on the same shift.`,
  },
];

const outputRows = [
  { date: "2026-09-01", line: "Line A", order_no: "PO-1001", planned_units: 1200, produced_units: 1165, rejected_units: 24, downtime_minutes: 35 },
  { date: "2026-09-02", line: "Line A", order_no: "PO-1001", planned_units: 1200, produced_units: 1190, rejected_units: 18, downtime_minutes: 20 },
  { date: "2026-09-01", line: "Line B", order_no: "PO-1002", planned_units: 950, produced_units: 910, rejected_units: 31, downtime_minutes: 48 },
  { date: "2026-09-02", line: "Line B", order_no: "PO-1002", planned_units: 950, produced_units: 940, rejected_units: 16, downtime_minutes: 22 },
  { date: "2026-09-03", line: "Line A", order_no: "PO-1003", planned_units: 1300, produced_units: 1260, rejected_units: 21, downtime_minutes: 28 },
];
const csv = [Object.keys(outputRows[0]).join(","), ...outputRows.map((row) => Object.values(row).join(","))].join("\n");

async function analyze(text, filename) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${groqKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_DOCUMENT_MODEL || "qwen/qwen3.8-27b",
      temperature: 0.1,
      max_completion_tokens: 500,
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return strict JSON with summary, topics (string array), language, and extraction. Do not invent facts." },
        { role: "user", content: `Filename: ${filename}\n\nDocument text:\n${text}` },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Groq seed analysis failed (${response.status})`);
  const payload = await response.json();
  return JSON.parse(payload.choices[0].message.content);
}

function chunks(text) {
  const values = [];
  for (let start = 0; start < text.length;) {
    const end = Math.min(start + 1200, text.length);
    values.push(text.slice(start, end).trim());
    start = Math.max(end - 160, start + 1);
  }
  return values.filter(Boolean);
}

async function clearDocument(documentId) {
  const { data: tableSources, error } = await admin.from("table_sources").select("id").eq("tenant_id", tenantId).eq("document_id", documentId);
  if (error) throw error;
  const ids = (tableSources ?? []).map((source) => source.id);
  if (ids.length) {
    const { error: rowError } = await admin.from("table_rows").delete().eq("tenant_id", tenantId).in("table_source_id", ids);
    if (rowError) throw rowError;
  }
  const results = await Promise.all([
    admin.from("chunks").delete().eq("tenant_id", tenantId).eq("document_id", documentId),
    admin.from("table_sources").delete().eq("tenant_id", tenantId).eq("document_id", documentId),
    admin.from("knowledge_insights").delete().eq("tenant_id", tenantId).eq("document_id", documentId),
  ]);
  for (const result of results) if (result.error) throw result.error;
}

async function upsertDocument({ filename, doc_type, department, content }) {
  const path = `${tenantId}/demo/${filename}`;
  const { error: uploadError } = await admin.storage.from("documents").upload(path, content, { upsert: true, contentType: "text/markdown" });
  if (uploadError) throw uploadError;
  const { data: existing, error: existingError } = await admin.from("documents").select("id").eq("tenant_id", tenantId).eq("storage_path", path).maybeSingle();
  if (existingError) throw existingError;
  const values = { tenant_id: tenantId, filename, doc_type, department, language: "en", status: "ready", page_count: 1, storage_path: path, error: "" };
  const result = existing
    ? await admin.from("documents").update(values).eq("id", existing.id).select("id").single()
    : await admin.from("documents").insert(values).select("id").single();
  if (result.error || !result.data) throw result.error ?? new Error("Could not create demo document");
  const analysis = await analyze(content, filename);
  await clearDocument(result.data.id);
  const entries = [`Document summary: ${analysis.summary}\nTopics: ${(analysis.topics ?? []).join(", ")}`, ...chunks(analysis.extraction || content)].map((chunk, index) => ({
    tenant_id: tenantId, document_id: result.data.id, chunk_index: index, page: index ? 1 : 0, content: chunk, embedding_dim: 0,
    meta: { model: process.env.GROQ_DOCUMENT_MODEL || "qwen/qwen3.8-27b", pipeline: "groq-document-intelligence", demo: true },
  }));
  const { error: chunkError } = await admin.from("chunks").insert(entries);
  if (chunkError) throw chunkError;
  const { error: insightError } = await admin.from("knowledge_insights").upsert({
    tenant_id: tenantId,
    document_id: result.data.id,
    model: process.env.GROQ_DOCUMENT_MODEL || "qwen/qwen3.8-27b",
    modality: "text",
    summary: analysis.summary || "",
    topics: Array.isArray(analysis.topics) ? analysis.topics : [],
    language: analysis.language || "en",
    chunk_count: entries.length,
    source_row_count: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: "document_id" });
  if (insightError) throw insightError;
  return result.data.id;
}

for (const source of sources) await upsertDocument(source);

const tablePath = `${tenantId}/demo/demo-line-output.csv`;
const { error: csvUploadError } = await admin.storage.from("documents").upload(tablePath, csv, { upsert: true, contentType: "text/csv" });
if (csvUploadError) throw csvUploadError;
const { data: existingTable, error: tableLookupError } = await admin.from("documents").select("id").eq("tenant_id", tenantId).eq("storage_path", tablePath).maybeSingle();
if (tableLookupError) throw tableLookupError;
const tableValues = { tenant_id: tenantId, filename: "demo-line-output.csv", doc_type: "data", department: "production", language: "en", status: "ready", page_count: 0, storage_path: tablePath, error: "" };
const tableDocument = existingTable
  ? await admin.from("documents").update(tableValues).eq("id", existingTable.id).select("id").single()
  : await admin.from("documents").insert(tableValues).select("id").single();
if (tableDocument.error || !tableDocument.data) throw tableDocument.error ?? new Error("Could not create demo spreadsheet");
await clearDocument(tableDocument.data.id);
const columns = Object.keys(outputRows[0]).map((name) => ({ name, type: typeof outputRows[0][name] === "number" ? "numeric" : "text" }));
const { data: tableSource, error: tableSourceError } = await admin.from("table_sources").insert({ tenant_id: tenantId, document_id: tableDocument.data.id, name: "demo_line_output", sheet_name: "Line output", columns, row_count: outputRows.length }).select("id").single();
if (tableSourceError || !tableSource) throw tableSourceError ?? new Error("Could not create demo table");
const { error: rowsError } = await admin.from("table_rows").insert(outputRows.map((data, index) => ({ tenant_id: tenantId, table_source_id: tableSource.id, row_number: index + 1, data })));
if (rowsError) throw rowsError;
const tableAnalysis = await analyze(`Columns: ${Object.keys(outputRows[0]).join(", ")}\nRows: ${JSON.stringify(outputRows)}`, "demo-line-output.csv");
const { error: tableChunkError } = await admin.from("chunks").insert({ tenant_id: tenantId, document_id: tableDocument.data.id, chunk_index: 0, page: 0, content: `Document summary: ${tableAnalysis.summary}\nTopics: ${(tableAnalysis.topics ?? []).join(", ")}\nTable: demo_line_output with ${outputRows.length} rows.`, embedding_dim: 0, meta: { model: process.env.GROQ_DOCUMENT_MODEL || "qwen/qwen3.8-27b", pipeline: "groq-document-intelligence", demo: true, table_source_id: tableSource.id } });
if (tableChunkError) throw tableChunkError;
const { error: tableInsightError } = await admin.from("knowledge_insights").upsert({
  tenant_id: tenantId,
  document_id: tableDocument.data.id,
  model: process.env.GROQ_DOCUMENT_MODEL || "qwen/qwen3.8-27b",
  modality: "table",
  summary: tableAnalysis.summary || "",
  topics: Array.isArray(tableAnalysis.topics) ? tableAnalysis.topics : [],
  language: tableAnalysis.language || "en",
  chunk_count: 1,
  source_row_count: outputRows.length,
  updated_at: new Date().toISOString(),
}, { onConflict: "document_id" });
if (tableInsightError) throw tableInsightError;

console.log(JSON.stringify({ seeded_documents: sources.length + 1, table_rows: outputRows.length, tenant_id: tenantId }));
