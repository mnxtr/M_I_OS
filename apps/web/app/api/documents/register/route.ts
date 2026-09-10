import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getClaims } from "@/lib/supabase/claims";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  storage_path: z.string().min(1).max(1000),
  filename: z.string().min(1).max(500),
  doc_type: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ detail: "Invalid document registration" }, { status: 422 });
  }

  const expectedPrefix = `${claims.tenantId}/`;
  if (
    !parsed.data.storage_path.startsWith(expectedPrefix) ||
    parsed.data.storage_path.includes("..")
  ) {
    return NextResponse.json({ detail: "Storage path is outside your workspace" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      tenant_id: claims.tenantId,
      uploaded_by: claims.userId,
      filename: parsed.data.filename,
      doc_type: parsed.data.doc_type ?? "other",
      department: parsed.data.department ?? "general",
      language: "en",
      storage_path: parsed.data.storage_path,
      status: "processing",
      page_count: 0,
      error: "",
    })
    .select("id,filename,doc_type,department,language,status,page_count,error,created_at")
    .single();

  if (error || !data) {
    console.error("Document registration failed", error);
    return NextResponse.json(
      { detail: error?.message ?? "Could not register document" },
      { status: 502 },
    );
  }

  return NextResponse.json(data);
}
