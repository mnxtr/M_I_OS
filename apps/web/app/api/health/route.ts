import { NextResponse } from "next/server";

/**
 * Safe health endpoint for the Heroku router and external monitoring.
 * Intentionally does not probe or expose tenant data, Supabase keys, or user sessions.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "ok", service: "linora-web" },
    { headers: { "cache-control": "no-store" } },
  );
}
