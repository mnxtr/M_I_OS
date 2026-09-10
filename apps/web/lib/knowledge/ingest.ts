import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import { analyzeDocument, analyzeImage, GROQ_MODELS, type DocumentAnalysis } from "@/lib/groq";
import { createAdminClient } from "@/lib/supabase/admin";

const execFileAsync = promisify(execFile);
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 160;
const VISION_URL_TTL_SECONDS = 300;

type DocumentRow = { id: string; tenant_id: string; filename: string; storage_path: string };
type TableRow = Record<string, string | number | boolean>;

export async function processKnowledgeDocument(document: DocumentRow) {
  const admin = createAdminClient();
  const extension = extname(document.filename).toLowerCase();
  try {
    const { data: object, error: downloadError } = await admin.storage.from("documents").download(document.storage_path);
    if (downloadError || !object) throw new Error(downloadError?.message ?? "Could not read document storage");
    const bytes = Buffer.from(await object.arrayBuffer());

    await clearDocumentData(admin, document.tenant_id, document.id);

    if ([".csv", ".xlsx", ".xlsm"].includes(extension)) {
      const sheets = extension === ".csv" ? [{ name: basename(document.filename, extension), rows: parseCsv(bytes.toString("utf8")) }] : await parseXlsx(bytes, extension);
      let totalRows = 0;
      const summaries: string[] = [];
      for (const sheet of sheets) {
        if (!sheet.rows.length) continue;
        const columns = Object.keys(sheet.rows[0] ?? {});
        const { data: source, error: sourceError } = await admin.from("table_sources").insert({
          tenant_id: document.tenant_id,
          document_id: document.id,
          name: basename(document.filename, extension),
          sheet_name: sheet.name,
          columns: columns.map((name) => ({ name, type: inferColumnType(sheet.rows.map((row) => row[name])) })),
          row_count: sheet.rows.length,
        }).select("id").single();
        if (sourceError || !source) throw new Error(sourceError?.message ?? "Could not create table source");
        const rows = sheet.rows.map((data, index) => ({ tenant_id: document.tenant_id, table_source_id: source.id, row_number: index + 1, data }));
        for (const batch of batches(rows, 500)) {
          const { error } = await admin.from("table_rows").insert(batch);
          if (error) throw new Error(error.message);
        }
        totalRows += sheet.rows.length;
        summaries.push(`Table ${sheet.name}: ${sheet.rows.length} rows. Columns: ${columns.join(", ")}.`);
      }
      const analysis = await analyzeDocument(`${summaries.join("\n")}\nSample rows:\n${JSON.stringify(sheets.flatMap((sheet) => sheet.rows.slice(0, 3)))}`, document.filename);
      const chunkCount = await insertChunks(admin, document, [`${analysis.summary}\nTopics: ${analysis.topics.join(", ")}\n${summaries.join("\n")}`], analysis, GROQ_MODELS.document);
      await upsertKnowledgeInsight(admin, document, analysis, {
        model: GROQ_MODELS.document,
        modality: "table",
        chunkCount,
        sourceRowCount: totalRows,
      });
      await markReady(admin, document.id, 0, analysis.language);
      return { kind: "table", rows: totalRows, model: GROQ_MODELS.document };
    }

    let extracted: string;
    let pageCount: number;
    let analysis;
    if ([".png", ".jpg", ".jpeg"].includes(extension)) {
      const { data: signed, error } = await admin.storage.from("documents").createSignedUrl(document.storage_path, VISION_URL_TTL_SECONDS);
      if (error || !signed) throw new Error(error?.message ?? "Could not create a vision URL");
      analysis = await analyzeImage(signed.signedUrl, document.filename);
      extracted = analysis.extraction || analysis.summary;
      pageCount = 1;
    } else {
      extracted = await extractText(bytes, extension);
      if (!extracted.trim()) throw new Error("No extractable text found");
      pageCount = Math.max(1, extracted.split("\f").filter(Boolean).length);
      analysis = await analyzeDocument(extracted, document.filename);
      // Keep parser output as the canonical evidence. Groq adds understanding metadata,
      // but a model excerpt must never silently discard pages from an uploaded document.
    }
    const model = extension.match(/png|jpe?g/) ? GROQ_MODELS.vision : GROQ_MODELS.document;
    const chunkCount = await insertChunks(admin, document, chunkText(extracted), analysis, model);
    await upsertKnowledgeInsight(admin, document, analysis, {
      model,
      modality: extension.match(/png|jpe?g/) ? "vision" : "text",
      chunkCount,
      sourceRowCount: 0,
    });
    await markReady(admin, document.id, pageCount, analysis.language);
    return { kind: "text", pages: pageCount, model };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.slice(0, 1800) : "Document processing failed";
    await admin.from("documents").update({ status: "failed", error: message }).eq("id", document.id).eq("tenant_id", document.tenant_id);
    throw cause;
  }
}

async function clearDocumentData(admin: ReturnType<typeof createAdminClient>, tenantId: string, documentId: string) {
  const { data: sources, error: sourceError } = await admin.from("table_sources").select("id").eq("tenant_id", tenantId).eq("document_id", documentId);
  if (sourceError) throw new Error(sourceError.message);
  const sourceIds = (sources ?? []).map((source) => source.id);
  if (sourceIds.length) {
    const { error } = await admin.from("table_rows").delete().eq("tenant_id", tenantId).in("table_source_id", sourceIds);
    if (error) throw new Error(error.message);
  }
  const [{ error: tablesError }, { error: chunksError }, { error: insightError }] = await Promise.all([
    admin.from("table_sources").delete().eq("tenant_id", tenantId).eq("document_id", documentId),
    admin.from("chunks").delete().eq("tenant_id", tenantId).eq("document_id", documentId),
    admin.from("knowledge_insights").delete().eq("tenant_id", tenantId).eq("document_id", documentId),
  ]);
  if (tablesError) throw new Error(tablesError.message);
  if (chunksError) throw new Error(chunksError.message);
  if (insightError) throw new Error(insightError.message);
}

async function markReady(admin: ReturnType<typeof createAdminClient>, id: string, pageCount: number, language: string) {
  const { error } = await admin.from("documents").update({ status: "ready", page_count: pageCount, language, error: "" }).eq("id", id);
  if (error) throw new Error(error.message);
}

async function insertChunks(
  admin: ReturnType<typeof createAdminClient>,
  document: DocumentRow,
  pieces: string[],
  analysis: Pick<DocumentAnalysis, "summary" | "topics">,
  model: string,
) {
  const all = [
    `Document summary: ${analysis.summary}\nTopics: ${analysis.topics.join(", ")}`,
    ...pieces,
  ].filter(Boolean).map((content, index) => ({
    tenant_id: document.tenant_id,
    document_id: document.id,
    chunk_index: index,
    page: index === 0 ? 0 : Math.max(1, Math.ceil(index / 3)),
    content,
    embedding_dim: 0,
    meta: { model, pipeline: "groq-document-intelligence" },
  }));
  for (const batch of batches(all, 500)) {
    const { error } = await admin.from("chunks").insert(batch);
    if (error) throw new Error(error.message);
  }
  return all.length;
}

async function upsertKnowledgeInsight(
  admin: ReturnType<typeof createAdminClient>,
  document: DocumentRow,
  analysis: DocumentAnalysis,
  data: { model: string; modality: "table" | "text" | "vision"; chunkCount: number; sourceRowCount: number },
) {
  const { error } = await admin.from("knowledge_insights").upsert({
    tenant_id: document.tenant_id,
    document_id: document.id,
    model: data.model,
    modality: data.modality,
    summary: analysis.summary,
    topics: analysis.topics,
    language: analysis.language,
    chunk_count: data.chunkCount,
    source_row_count: data.sourceRowCount,
    updated_at: new Date().toISOString(),
  }, { onConflict: "document_id" });
  if (error) throw new Error(error.message);
}

function chunkText(text: string) {
  const chunks: string[] = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf("\n", end);
      if (boundary > start + Math.floor(CHUNK_SIZE * 0.6)) end = boundary;
    }
    const piece = text.slice(start, end).trim();
    if (piece) chunks.push(piece);
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

async function extractText(bytes: Buffer, extension: string) {
  if ([".txt", ".md"].includes(extension)) return bytes.toString("utf8");
  const directory = await mkdtemp(join(tmpdir(), "mios-ingest-"));
  const input = join(directory, `input${extension}`);
  try {
    await writeFile(input, bytes);
    if (extension === ".pdf") return (await execFileAsync("pdftotext", ["-layout", input, "-"], { maxBuffer: 20 * 1024 * 1024 })).stdout;
    if (extension === ".docx") return htmlText((await execFileAsync("unzip", ["-p", input, "word/document.xml"], { maxBuffer: 20 * 1024 * 1024 })).stdout);
    throw new Error(`Unsupported text extractor for ${extension}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function htmlText(xml: string) {
  return xml.replace(/<w:p[\s\S]*?<\/w:p>/g, (paragraph) => `${paragraph.replace(/<[^>]+>/g, "")}\n`).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function parseCsv(text: string): TableRow[] {
  const rows: string[][] = [];
  let row: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && text[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(value.trim()); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && text[index + 1] === "\n") index += 1; row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = ""; }
    else value += character;
  }
  row.push(value.trim()); if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() ?? []).map((header, index) => slug(header) || `column_${index + 1}`);
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, coerce(cells[index] ?? "")])));
}

async function parseXlsx(bytes: Buffer, extension: string) {
  const directory = await mkdtemp(join(tmpdir(), "mios-xlsx-"));
  const input = join(directory, `input${extension}`);
  try {
    await writeFile(input, bytes);
    const workbook = (await execFileAsync("unzip", ["-p", input, "xl/workbook.xml"])).stdout;
    const rels = (await execFileAsync("unzip", ["-p", input, "xl/_rels/workbook.xml.rels"])).stdout;
    const shared = await execFileAsync("unzip", ["-p", input, "xl/sharedStrings.xml"]).then((result) => result.stdout).catch(() => "");
    const sharedStrings = [...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => htmlText(match[1] ?? ""));
    const sheets = [...workbook.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g)];
    const relations = new Map([...rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g)].map((match) => [match[1] ?? "", match[2] ?? ""]));
    const parsed = [] as Array<{ name: string; rows: TableRow[] }>;
    for (const [index, sheet] of sheets.entries()) {
      const target = relations.get(sheet[2] ?? "")?.replace(/^\//, "") || `worksheets/sheet${index + 1}.xml`;
      const xml = (await execFileAsync("unzip", ["-p", input, `xl/${target}`])).stdout;
      const rawRows = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((match) => parseWorksheetRow(match[1] ?? "", sharedStrings));
      const headers = (rawRows.shift() ?? []).map((header, column) => slug(header) || `column_${column + 1}`);
      parsed.push({ name: sheet[1] ?? `Sheet ${index + 1}`, rows: rawRows.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, column) => [header, coerce(row[column] ?? "")]))) });
    }
    return parsed;
  } finally { await rm(directory, { recursive: true, force: true }); }
}

function parseWorksheetRow(xml: string, shared: string[]) {
  return [...xml.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)].map((match) => {
    const type = /t="([^"]+)"/.exec(match[1] ?? "")?.[1];
    const cell = match[2] ?? "";
    const raw = /<v>([\s\S]*?)<\/v>/.exec(cell)?.[1] ?? /<t[^>]*>([\s\S]*?)<\/t>/.exec(cell)?.[1] ?? "";
    return type === "s" ? shared[Number(raw)] ?? "" : htmlText(raw);
  });
}

function slug(value: string) { return value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 60); }
function coerce(value: string): string | number | boolean { if (/^(true|false)$/i.test(value)) return value.toLowerCase() === "true"; const numeric = Number(value.replace(/,/g, "")); return value && Number.isFinite(numeric) ? numeric : value; }
function inferColumnType(values: Array<string | number | boolean | undefined>) { return values.some((value) => typeof value === "number") ? "numeric" : values.some((value) => typeof value === "boolean") ? "boolean" : "text"; }
function* batches<T>(values: T[], size: number) { for (let index = 0; index < values.length; index += size) yield values.slice(index, index + size); }
