import type { Dict } from "@/lib/i18n/en";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Server-side callers prefer a private origin when the host provides one. */
export const SERVER_API_URL =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Localised, human copy. Falls back to the API's own detail string. */
  localized(t: Dict): string {
    if (this.status === 401) return t.common.sessionExpired;
    if (this.status === 403) return t.common.forbidden;
    if (this.status === 404) return t.common.notFound;
    if (this.status === 0) return t.common.networkError;
    return this.message || t.common.unknownError;
  }
}

async function toError(res: Response): Promise<ApiError> {
  let detail: unknown;
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    detail = body;
    if (typeof body?.detail === "string") message = body.detail;
    else if (Array.isArray(body?.detail)) {
      // FastAPI validation errors.
      message = body.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ") || message;
    }
  } catch {
    // Non-JSON error body — keep the status-based message.
  }
  return new ApiError(message, res.status, detail);
}

export interface FetchOptions extends Omit<RequestInit, "body"> {
  token: string;
  body?: unknown;
  /** Set for endpoints that return a stream; skips JSON parsing. */
  raw?: boolean;
}

/**
 * Single entry point for MIOS API calls. The caller supplies the Supabase access token
 * explicitly — this module never reads it from storage, so there is one obvious place
 * where credentials enter a request.
 */
export async function apiFetch<T>(path: string, options: FetchOptions): Promise<T> {
  const { token, body, headers, raw, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiError("Network request failed", 0, cause);
  }

  if (!res.ok) throw await toError(res);
  if (raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Streaming variant: returns the raw Response so the caller can read SSE frames. */
export async function apiStream(
  path: string,
  options: FetchOptions & { signal?: AbortSignal },
): Promise<Response> {
  const res = await apiFetch<Response>(path, { ...options, raw: true });
  return res;
}

/** Server-side fetch (RSC / route handlers): uses the private origin. */
export async function serverApiFetch<T>(path: string, options: FetchOptions): Promise<T> {
  const { token, body, headers, ...rest } = options;
  let res: Response;
  try {
    res = await fetch(`${SERVER_API_URL}${path}`, {
      ...rest,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiError("Network request failed", 0, cause);
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Anonymous server-side GET, for the guest portal's token-scoped endpoints. */
export async function serverPublicFetch<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SERVER_API_URL}${path}`, { cache: "no-store" });
  } catch (cause) {
    throw new ApiError("Network request failed", 0, cause);
  }
  if (!res.ok) throw await toError(res);
  return (await res.json()) as T;
}
