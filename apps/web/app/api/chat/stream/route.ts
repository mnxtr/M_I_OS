import { getClaims } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";
import { GROQ_MODELS } from "@/lib/groq";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const STOP_WORDS = new Set(["about", "also", "and", "are", "from", "have", "must", "that", "the", "this", "what", "when", "where", "which", "with", "your"]);

function frame(value: unknown) { return `data: ${JSON.stringify(value)}\n\n`; }

export async function POST(request: Request) {
  const claims = await getClaims();
  if (!claims) return new Response("Not authenticated", { status: 401 });
  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return new Response("Question is required", { status: 400 });
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return new Response("GROQ_API_KEY is not configured on the server", { status: 503 });

  const supabase = await createClient();
  const { data: chunks, error: chunkError } = await supabase.from("chunks").select("document_id,chunk_index,page,content").eq("tenant_id", claims.tenantId).limit(200);
  if (chunkError) return new Response(chunkError.message, { status: 500 });
  const documentIds = [...new Set((chunks ?? []).map((chunk) => chunk.document_id))];
  const { data: documents, error: documentError } = documentIds.length
    ? await supabase.from("documents").select("id,filename").eq("tenant_id", claims.tenantId).in("id", documentIds)
    : { data: [], error: null };
  if (documentError) return new Response(documentError.message, { status: 500 });
  const documentNames = new Map((documents ?? []).map((document) => [document.id, document.filename]));
  const terms = (question.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((term: string) => term.length > 3 && !STOP_WORDS.has(term));
  const ranked = (chunks ?? [])
    .map((chunk: any) => ({ chunk, score: terms.reduce((score: number, term: string) => score + (chunk.content?.toLowerCase().includes(term) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score);
  const strongestScore = ranked[0]?.score ?? 0;
  const selected = (strongestScore > 0 ? ranked.filter((entry) => entry.score >= Math.max(1, strongestScore - 1)) : ranked)
    .slice(0, 6)
    .map(({ chunk }) => chunk);
  const citations = selected.map((chunk: any) => ({ document_id: chunk.document_id, document_name: documentNames.get(chunk.document_id) ?? "Document", page: chunk.page ?? 0, chunk_index: chunk.chunk_index, snippet: String(chunk.content).slice(0, 240) }));
  const context = selected.map((chunk: any, index: number) => `[${index + 1}] ${chunk.content}`).join("\n\n");
  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model: GROQ_MODELS.ask, stream: true, temperature: 0.2, max_completion_tokens: 1024, reasoning_effort: "low", reasoning_format: "hidden", messages: [{ role: "system", content: "Answer only from the supplied MIOS tenant context. If it is insufficient, say so clearly. Cite evidence using [1], [2] markers." }, { role: "user", content: `Question: ${question}\n\nTenant context:\n${context || "No indexed document context is available."}` }] }) });
  if (!upstream.ok || !upstream.body) return new Response("Groq request failed", { status: 502 });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({ async start(controller) { controller.enqueue(encoder.encode(frame({ type: "citations", citations }))); const reader = upstream.body!.getReader(); let buffer = ""; try { while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; for (const line of lines) { if (!line.startsWith("data: ") || line === "data: [DONE]") continue; try { const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content; if (delta) controller.enqueue(encoder.encode(frame({ type: "token", value: delta }))); } catch {} } } controller.enqueue(encoder.encode(frame({ type: "done" }))); controller.close(); } catch (error) { controller.error(error); } } });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } });
}
