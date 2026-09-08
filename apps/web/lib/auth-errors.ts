import type { Dict } from "@/lib/i18n/en";

/**
 * Map Supabase Auth errors to product copy.
 *
 * Never surface `AuthApiError.message` raw: it is English-only, leaks internal wording,
 * and distinguishes "user not found" from "wrong password" in ways we do not want to
 * confirm to an attacker.
 */
export function authErrorMessage(error: unknown, t: Dict): string {
  const code = extractCode(error);
  const status = extractStatus(error);

  switch (code) {
    case "invalid_credentials":
    case "invalid_grant":
      return t.auth.invalidCredentials;
    case "otp_expired":
    case "invalid_otp":
    case "token_expired":
      return t.auth.invalidCode;
    case "user_already_exists":
    case "email_exists":
      return t.auth.emailTaken;
    case "weak_password":
      return t.auth.weakPassword;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
    case "over_sms_send_rate_limit":
      return t.auth.rateLimited(retryAfterSeconds(error) ?? 60);
    case "email_not_confirmed":
      return t.auth.checkEmailToConfirm;
    default:
      break;
  }

  if (status === 429) return t.auth.rateLimited(retryAfterSeconds(error) ?? 60);
  if (status === 401 || status === 400) return t.auth.invalidCredentials;
  return t.common.unknownError;
}

function extractCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record.code === "string") return record.code;
  if (typeof record.error_code === "string") return record.error_code;
  return undefined;
}

function extractStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const record = error as Record<string, unknown>;
  return typeof record.status === "number" ? record.status : undefined;
}

/** Supabase puts the wait time in the message body for rate-limit errors. */
function retryAfterSeconds(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return undefined;
  const match = message.match(/(\d+)\s*second/i);
  return match?.[1] ? Number(match[1]) : undefined;
}
