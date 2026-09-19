const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const TOKEN_HASH_PATTERN = /^[A-Za-z0-9_-]{20,512}$/;

export const PASSWORD_RECOVERY_MESSAGE =
  "If an account exists for that email address, password reset instructions will be sent.";
export const PASSWORD_RECOVERY_COOKIE = "rc_password_recovery";
export const PASSWORD_RECOVERY_COOKIE_PATH = "/api/auth/password-recovery/confirm";
export const PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export function resolvePasswordRecoveryBaseUrl(
  rawUrl: string | undefined,
  nodeEnv: string | undefined,
) {
  if (!rawUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!(["http:", "https:"] as const).includes(parsed.protocol as "http:" | "https:")) {
    return null;
  }
  if (parsed.username || parsed.password) return null;

  if (nodeEnv === "production") {
    if (parsed.protocol !== "https:") return null;
    if (LOCAL_HOSTNAMES.has(parsed.hostname)) return null;
  }

  return parsed.origin;
}

export function buildPasswordRecoveryCallbackUrl(
  rawUrl: string | undefined,
  nodeEnv: string | undefined,
) {
  const baseUrl = resolvePasswordRecoveryBaseUrl(rawUrl, nodeEnv);
  if (!baseUrl) return null;

  return new URL("/auth/recovery/confirm", baseUrl).toString();
}

export function isValidPasswordRecoveryTokenHash(value: string | null) {
  return Boolean(value && TOKEN_HASH_PATTERN.test(value));
}
