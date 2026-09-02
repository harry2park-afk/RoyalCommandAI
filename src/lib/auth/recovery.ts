export const DEFAULT_RECOVERY_PATH = "/update-password";
export const RECOVERY_COOKIE = "rc_password_recovery";
export const RECOVERY_COOKIE_MAX_AGE_SECONDS = 10 * 60;

const ALLOWED_RECOVERY_PATHS = new Set([DEFAULT_RECOVERY_PATH]);

export function sanitizeRecoveryPath(value: string | null | undefined) {
  if (!value) return DEFAULT_RECOVERY_PATH;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_RECOVERY_PATH;
  }

  try {
    const parsed = new URL(value, "https://royalcommand.invalid");
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return ALLOWED_RECOVERY_PATHS.has(normalized)
      ? normalized
      : DEFAULT_RECOVERY_PATH;
  } catch {
    return DEFAULT_RECOVERY_PATH;
  }
}
