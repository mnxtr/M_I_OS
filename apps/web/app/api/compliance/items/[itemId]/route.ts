import { NextResponse } from "next/server";
import { ITEM_STATUSES } from "@mios/shared";
import { complianceItemOut } from "@/lib/compliance/supabase";
import { getClaims } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  const { itemId } = await params;
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ITEM_STATUSES.includes(body.status as (typeof ITEM_STATUSES)[number])) {
      return NextResponse.json({ detail: "Invalid item status" }, { status: 422 });
    }
    patch.status = body.status;
    patch.manually_set = true;
  }
  if (body.manually_set === false) patch.manually_set = false;
  if (body.cap_text !== undefined) {
    if (typeof body.cap_text !== "string") return NextResponse.json({ detail: "CAP must be text" }, { status: 422 });
    patch.cap_text = body.cap_text.slice(0, 8000);
  }
  if (Object.keys(patch).length === 1) return NextResponse.json({ detail: "No update supplied" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("assessment_items")
    .update(patch)
    .eq("id", itemId)
    .eq("tenant_id", claims.tenantId)
    .select("id,ref,category,title,guidance,status,manually_set,ai_notes,cap_text,evidence")
    .maybeSingle();
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ detail: "Assessment item not found" }, { status: 404 });
  return NextResponse.json(complianceItemOut(data));
}
