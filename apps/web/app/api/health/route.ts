import { NextResponse } from "next/server";

// Public liveness only. Does not expose database, environment or tenant state.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", service: "linora-web" }, {
    headers: { "cache-control": "no-store" },
  });
}
