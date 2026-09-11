import { NextRequest, NextResponse } from "next/server";

import { createSeededDashboard, type DashboardFilters } from "@/lib/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateDashboardDates } from "@/lib/request-validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try { validateDashboardDates(request.nextUrl.searchParams); } catch (error) {
    return NextResponse.json({ detail: (error as Error).message }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: claimsData } = await supabase.auth.getClaims();
    if (!claimsData?.claims?.sub) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }

    const apiUrl = process.env.MIOS_API_URL?.replace(/\/$/, "");
    if (apiUrl) {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        return NextResponse.json({ detail: "Session expired" }, { status: 401 });
      }

      const upstream = new URL(`${apiUrl}/v1/dashboard`);
      request.nextUrl.searchParams.forEach((value, key) => upstream.searchParams.set(key, value));
      const response = await fetch(upstream, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = await response.text();
      return new NextResponse(body, {
        status: response.status,
        headers: { "content-type": response.headers.get("content-type") || "application/json" },
      });
    }
  }

  const search = request.nextUrl.searchParams;
  const filters: DashboardFilters = {
    factoryId: search.get("factory_id") || undefined,
    from: search.get("from") || undefined,
    to: search.get("to") || undefined,
    granularity: (search.get("granularity") as DashboardFilters["granularity"]) || undefined,
    lineId: search.get("line_id") || undefined,
    shift: search.get("shift") || undefined,
  };
  return NextResponse.json(createSeededDashboard(filters), {
    headers: { "cache-control": "private, no-store" },
  });
}
