import { assessComplianceItem, type ComplianceVerdict } from "@/lib/groq";
import { getClaims } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const STOP_WORDS = new Set(["about", "after", "and", "are", "audit", "before", "for", "from", "have", "into", "must", "that", "the", "their", "this", "with", "workers"]);

type Chunk = { document_id: string; chunk_index: number; page: number; content: string };
type AssessmentItem = { id: string; ref: string; category: string; title: string; guidance: string; status: string; manually_set: boolean };

function frame(value: unknown) { return `data: ${JSON.stringify(value)}\n\n`; }

function terms(value: string) {
  return [...new Set((value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((term) => term.length > 3 && !STOP_WORDS.has(term)))];
}

function relevantEvidence(item: AssessmentItem, chunks: Chunk[], names: Map<string, string>) {
  const keywords = terms(`${item.title} ${item.guidance}`);
  return chunks
    .map((chunk) => ({ chunk, score: keywords.reduce((count, keyword) => count + (chunk.content.toLowerCase().includes(keyword) ? 1 : 0), 0) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ chunk }) => ({
      document_id: chunk.document_id,
      document_name: names.get(chunk.document_id) ?? "Document",
      page: chunk.page ?? 0,
      chunk_index: chunk.chunk_index ?? 0,
      content: chunk.content,
    }));
}

function fallbackVerdict(evidence: ReturnType<typeof relevantEvidence>): ComplianceVerdict {
  if (!evidence.length) return { status: "unknown", notes: "No matching records found in the tenant knowledgebase. Evidence is required before compliance can be confirmed.", quote: "" };
  return { status: "partial", notes: "Relevant documentary evidence was found. Review the cited excerpts and verify the full requirement before confirming compliance.", quote: evidence[0]?.content.slice(0, 320) ?? "" };
}

export async function POST(_request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const claims = await getClaims();
  if (!claims) return new Response("Not authenticated", { status: 401 });
  const { assessmentId } = await params;
  const admin = createAdminClient();
  const { data: assessment, error: assessmentError } = await admin
    .from("assessments")
    .select("id")
    .eq("id", assessmentId)
    .eq("tenant_id", claims.tenantId)
    .maybeSingle();
  if (assessmentError) return new Response(assessmentError.message, { status: 500 });
  if (!assessment) return new Response("Assessment not found", { status: 404 });
  const [{ data: items, error: itemError }, { data: chunks, error: chunkError }] = await Promise.all([
    admin.from("assessment_items").select("id,ref,category,title,guidance,status,manually_set").eq("assessment_id", assessment.id).eq("tenant_id", claims.tenantId).order("ref"),
    admin.from("chunks").select("document_id,chunk_index,page,content").eq("tenant_id", claims.tenantId).limit(3000),
  ]);
  if (itemError || chunkError) return new Response(itemError?.message ?? chunkError?.message ?? "Could not read assessment evidence", { status: 500 });
  const documentIds = [...new Set((chunks ?? []).map((chunk) => chunk.document_id))];
  const { data: documents, error: documentError } = documentIds.length
    ? await admin.from("documents").select("id,filename").eq("tenant_id", claims.tenantId).in("id", documentIds)
    : { data: [], error: null };
  if (documentError) return new Response(documentError.message, { status: 500 });
  const names = new Map((documents ?? []).map((document) => [document.id, document.filename]));
  const assessable = ((items ?? []) as AssessmentItem[]).filter((item) => !item.manually_set);
  await admin.from("assessments").update({ status: "running" }).eq("id", assessment.id).eq("tenant_id", claims.tenantId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(frame({ type: "start", total: assessable.length })));
      try {
        for (const item of assessable) {
          controller.enqueue(encoder.encode(frame({ type: "progress", ref: item.ref })));
          const evidence = relevantEvidence(item, (chunks ?? []) as Chunk[], names);
          let verdict = fallbackVerdict(evidence);
          if (evidence.length && process.env.GROQ_API_KEY) {
            try {
              verdict = await assessComplianceItem({
                ref: item.ref,
                category: item.category,
                title: item.title,
                guidance: item.guidance,
                evidence: evidence.map((entry) => ({ documentName: entry.document_name, page: entry.page, content: entry.content })),
              });
            } catch {
              // Fall back to the evidence-bound deterministic verdict.
            }
          }
          const citations = verdict.quote && evidence.length
            ? [{ ...evidence[0], snippet: verdict.quote }]
            : evidence.slice(0, 2).map(({ content, ...citation }) => ({ ...citation, snippet: content.slice(0, 320) }));
          const { error } = await admin.from("assessment_items").update({
            status: verdict.status,
            ai_notes: verdict.notes,
            evidence: citations,
            updated_at: new Date().toISOString(),
          }).eq("id", item.id).eq("tenant_id", claims.tenantId);
          if (error) controller.enqueue(encoder.encode(frame({ type: "error", ref: item.ref, detail: error.message })));
          else controller.enqueue(encoder.encode(frame({ type: "verdict", ref: item.ref, status: verdict.status })));
        }
        const allItems = (items ?? []) as AssessmentItem[];
        const isComplete = allItems.length > 0 && allItems.every((item) => item.manually_set || item.status !== "pending" || assessable.some((current) => current.id === item.id));
        const status = isComplete ? "complete" : "partial";
        await admin.from("assessments").update({ status }).eq("id", assessment.id).eq("tenant_id", claims.tenantId);
        controller.enqueue(encoder.encode(frame({ type: "done", status })));
        controller.close();
      } catch (cause) {
        controller.enqueue(encoder.encode(frame({ type: "error", ref: "assessment", detail: cause instanceof Error ? cause.message.slice(0, 200) : "Assessment failed" })));
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } });
}
