import { NextResponse } from "next/server";
import { complianceItemOut } from "@/lib/compliance/supabase";
import { draftCorrectiveAction } from "@/lib/groq";
import { getClaims } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";

function fallbackCap(item: { title: string; guidance: string }) {
  return `Root cause hypothesis: Documentation or implementation gap for '${item.title}'.\n\nCorrective actions:\n1. Collect or prepare the required evidence: ${item.guidance}\n2. Assign an owner to close the gap and verify conditions on the floor.\n3. Update the internal compliance tracker.\n\nResponsible role: Compliance Manager\nSuggested timeline (days): 14\nVerification method: Document review and floor inspection before the next audit.`;
}

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  const { itemId } = await params;
  const admin = createAdminClient();
  const { data: item, error: itemError } = await admin
    .from("assessment_items")
    .select("id,ref,category,title,guidance,status,manually_set,ai_notes,cap_text,evidence")
    .eq("id", itemId)
    .eq("tenant_id", claims.tenantId)
    .maybeSingle();
  if (itemError) return NextResponse.json({ detail: itemError.message }, { status: 500 });
  if (!item) return NextResponse.json({ detail: "Assessment item not found" }, { status: 404 });

  let capText = fallbackCap(item);
  try {
    capText = (await draftCorrectiveAction({
      ref: item.ref,
      category: item.category,
      title: item.title,
      status: item.status,
      notes: item.ai_notes,
    })).slice(0, 8000);
  } catch {
    // The deterministic CAP keeps the workflow usable if the optional model is unavailable.
  }
  const { data, error } = await admin
    .from("assessment_items")
    .update({ cap_text: capText, updated_at: new Date().toISOString() })
    .eq("id", item.id)
    .eq("tenant_id", claims.tenantId)
    .select("id,ref,category,title,guidance,status,manually_set,ai_notes,cap_text,evidence")
    .single();
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(complianceItemOut(data));
}
