import { NextResponse, type NextRequest } from "next/server";
import type { DashboardFilters } from "@mios/shared";
import { fetchDashboardSummarySupabase } from "@/lib/dashboard/supabase";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters: Partial<DashboardFilters> = {
    range_days: params.has("range_days") ? Number(params.get("range_days")) : undefined,
    line: params.get("line") ?? undefined,
    department: params.get("department") ?? undefined,
    status: (params.get("status") as DashboardFilters["status"] | null) ?? undefined,
  };

  try {
    return NextResponse.json(await fetchDashboardSummarySupabase(filters));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard unavailable";
    if (message === "Not authenticated") {
      return NextResponse.json({ detail: message }, { status: 401 });
    }
    console.error("Dashboard summary failed", error);
    return NextResponse.json({ detail: "Dashboard summary unavailable" }, { status: 503 });
  }
}
