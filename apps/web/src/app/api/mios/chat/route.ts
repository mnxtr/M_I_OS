import { NextRequest, NextResponse } from "next/server";

import { createSeededChatResponse } from "@/lib/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseChatPayload } from "@/lib/request-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const auth = await resolveAuth();
  if (auth.error) return auth.error;
  let payload;
  try { payload = parseChatPayload(body); } catch (error) {
    return NextResponse.json({ detail: (error as Error).message }, { status: 400 });
  }

  const apiUrl = process.env.MIOS_API_URL?.replace(/\/$/, "");
  if (apiUrl && auth.accessToken) {
    const response = await fetch(`${apiUrl}/v1/chat`, {
      method: "POST",
      cache: "no-store",
      headers: proxyHeaders(auth.accessToken, request),
      body: JSON.stringify(payload),
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  }

  return NextResponse.json(createSeededChatResponse(payload.question || ""), {
    headers: { "cache-control": "private, no-store" },
  });
}

async function resolveAuth(): Promise<{ accessToken?: string; error?: NextResponse }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return {};
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return { error: NextResponse.json({ detail: "Authentication required" }, { status: 401 }) };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return { error: NextResponse.json({ detail: "Session expired" }, { status: 401 }) };
  }
  return { accessToken };
}

function proxyHeaders(accessToken: string, request: NextRequest): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  const factoryId = request.headers.get("x-factory-id");
  if (factoryId) headers["X-Factory-Id"] = factoryId;
  return headers;
}
