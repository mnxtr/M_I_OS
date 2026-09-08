import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getClaims, getAccessToken } from "@/lib/supabase/claims";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchUsageServer } from "@/lib/api";

/** Mirrors `apps/api/app/services/parsers.py::ALLOWED_EXTENSIONS`. */
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".txt",
  ".md",
  ".docx",
  ".xlsx",
  ".xlsm",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
]);

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

const schema = z.object({
  filename: z.string().min(1).max(500),
  size: z.number().int().positive().max(MAX_BYTES),
  contentType: z.string().max(200).optional(),
  docType: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
});

/**
 * Issue a short-lived signed upload URL for Supabase Storage.
 *
 * Why this exists (see docs/06-FRONTEND-PLAN.md §10): a Vercel function body is capped
 * at 4.5 MB, and factory PDFs and spreadsheets regularly exceed it. The browser PUTs the
 * bytes straight to Storage, so no file byte transits Vercel at all.
 *
 * Two things are deliberately server-decided:
 *  - the object path, always `{tenant_id}/{uuid}{ext}` — a client cannot write into
 *    another tenant's folder even if Storage RLS were misconfigured (defence in depth);
 *  - the plan quota check, so limits cannot be bypassed by PUTing directly.
 */
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
    return NextResponse.json({ detail: "Invalid upload request" }, { status: 422 });
  }

  const extension = extname(parsed.data.filename);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json(
      { detail: `Unsupported file type ${extension || "(none)"}` },
      { status: 415 },
    );
  }

  // Quota pre-check. Ingestion is metered in pages, which we cannot know before parsing,
  // so this blocks only when the tenant is already at its limit.
  const token = await getAccessToken();
  if (token) {
    try {
      const usage = await fetchUsageServer({ token });
      const limit = usage.limits.pages_ingested ?? -1;
      const used = usage.usage.pages_ingested ?? 0;
      if (limit >= 0 && used >= limit) {
        return NextResponse.json(
          { detail: "Monthly ingestion limit reached", code: "quota_exceeded" },
          { status: 402 },
        );
      }
    } catch {
      // Metering unavailable — allow the upload rather than block ingestion on a
      // dependency the user cannot fix. The API meters again during processing.
    }
  }

  const objectPath = `${claims.tenantId}/${randomUUID()}${extension}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("documents").createSignedUploadUrl(objectPath, {
    upsert: false,
  });

  if (error || !data) {
    return NextResponse.json(
      { detail: error?.message ?? "Could not create an upload URL" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: objectPath,
    filename: parsed.data.filename,
  });
}

function extname(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}
