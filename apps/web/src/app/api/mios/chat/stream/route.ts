import { NextRequest, NextResponse } from "next/server";

import { createSeededChatResponse } from "@/lib/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const supabase = await createSupabaseServerClient();
  let accessToken = "";

  if (supabase) {
    const { data: claimsData } = await supabase.auth.getClaims();
    if (!claimsData?.claims?.sub) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }
    const { data: sessionData } = await supabase.auth.getSession();
    accessToken = sessionData.session?.access_token || "";
    if (!accessToken) {
      return NextResponse.json({ detail: "Session expired" }, { status: 401 });
    }
  }

  const apiUrl = process.env.MIOS_API_URL?.replace(/\/$/, "");
  if (apiUrl && accessToken) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const factoryId = request.headers.get("x-factory-id");
    if (factoryId) headers["X-Factory-Id"] = factoryId;
    const response = await fetch(`${apiUrl}/v1/chat/stream`, {
      method: "POST",
      cache: "no-store",
      headers,
      body,
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "text/event-stream",
        "cache-control": "no-cache, no-transform",
      },
    });
  }

  const payload = JSON.parse(body) as { question?: string };
  const seeded = createSeededChatResponse(payload.question || "");
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (type: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
      };
      const { answer, citations, limitations, latency_ms: latencyMs, ...metadata } = seeded;
      send("metadata", metadata);
      citations.forEach((citation) => send("citation", { citation }));
      limitations.forEach((message) => send("warning", { message }));
      for (const token of answer.match(/\S+\s*/g) || []) send("token", { value: token });
      send("done", { trace_id: seeded.trace_id, latency_ms: latencyMs });
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "private, no-cache, no-transform",
    },
  });
}
