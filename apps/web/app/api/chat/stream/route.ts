import { z } from "zod";
import { getAccessToken, getClaims } from "@/lib/supabase/claims";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  top_k: z.number().int().min(1).max(20).optional(),
}).strict();

/**
 * Only FastAPI is allowed to retrieve, rank and cite factory documents.
 *
 * This route verifies the Supabase request, forwards the access token to the API
 * for independent verification, and transparently relays its SSE frames.
 * It NEVER queries Supabase chunks using a service-role key or calls an LLM.
 */
export async function POST(request: Request): Promise<Response> {
  const claims = await getClaims();
  if (!claims) return new Response("Not authenticated", { status: 401 });

  const token = await getAccessToken();
  if (!token) return new Response("Not authenticated", { status: 401 });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16_384) {
    return new Response("Question payload too large", { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Invalid question (max 4000 characters)", { status: 422 });
  }

  const origin = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!origin) {
    return new Response("MIOS retrieval service is not configured", { status: 503 });
  }

  let url: URL;
  try {
    url = new URL("/v1/chat/stream", origin);
    const localhost = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
    if (!["http:", "https:"].includes(url.protocol) ||
        (process.env.NODE_ENV === "production" && localhost)) {
      throw new Error("Invalid upstream origin");
    }
  } catch {
    return new Response("MIOS retrieval service configuration is invalid", { status: 503 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json",
        accept: "text/event-stream",
      },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      redirect: "error",
      signal: request.signal,
    });
  } catch {
    return new Response("MIOS retrieval service is unavailable", { status: 502 });
  }

  if (!upstream.ok) {
    // Do not leak backend stack traces, DB URLs or other internal error content.
    const status = [401, 403, 422, 429, 503].includes(upstream.status)
      ? upstream.status
      : 502;
    await upstream.body?.cancel().catch(() => undefined);
    return new Response("MIOS retrieval request could not be completed", { status });
  }

  if (!upstream.body ||
      !upstream.headers.get("content-type")?.toLowerCase().startsWith("text/event-stream")) {
    await upstream.body?.cancel().catch(() => undefined);
    return new Response("MIOS retrieval returned an invalid stream", { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "private, no-store, no-transform",
      "x-content-type-options": "nosniff",
    },
  });
}
