import type { MessageKey } from "@/i18n/types";
import { errorKey } from "@/lib/errors";

export function authErrorKey(error: unknown): MessageKey {
  const e = (error ?? {}) as { message?: string; status?: number; code?: string };
  const msg = e.message ?? "";
  if (e.code === "invalid_credentials" || /invalid login credentials/i.test(msg)) return "auth.invalidCredentials";
  if (e.code === "email_not_confirmed" || /email not confirmed/i.test(msg)) return "auth.emailNotConfirmed";
  if (e.code === "weak_password" || /password should be at least/i.test(msg)) return "auth.weakPassword";
  if (e.code === "user_already_exists" || /already registered/i.test(msg)) return "auth.userExists";
  if (e.status === 429 || /rate limit/i.test(msg)) return "auth.rateLimited";
  return errorKey(error);
}
