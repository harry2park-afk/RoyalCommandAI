import { FIRST_WAVE_COUNTRY_CODES } from "@/lib/auth";

export type FirstWaveCountryCode = (typeof FIRST_WAVE_COUNTRY_CODES)[number];

const FIRST_WAVE_COUNTRY_CODE_SET = new Set<string>(FIRST_WAVE_COUNTRY_CODES);

export function isFirstWaveCountryCode(value: unknown): value is FirstWaveCountryCode {
  return typeof value === "string" && FIRST_WAVE_COUNTRY_CODE_SET.has(value);
}

export function parseCountryAuthorityAdminUserIds(raw: string | undefined) {
  return new Set(
    (raw || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function isCountryAuthorityEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.RC_COUNTRY_AUTHORITY_ENABLED === "true";
}

export function isCountryAuthorityAdmin(
  userId: string,
  env: Record<string, string | undefined> = process.env,
) {
  if (!isCountryAuthorityEnabled(env)) return false;
  return parseCountryAuthorityAdminUserIds(
    env.RC_COUNTRY_AUTHORITY_ADMIN_USER_IDS,
  ).has(userId);
}

export function getRequestedCountryCode(user: {
  user_metadata?: Record<string, unknown> | null;
}) {
  const requested = user.user_metadata?.requested_country_code;
  return isFirstWaveCountryCode(requested) ? requested : "";
}

export function requestedCountryMatchesAssignment(
  user: { user_metadata?: Record<string, unknown> | null },
  countryCode: FirstWaveCountryCode,
) {
  return getRequestedCountryCode(user) === countryCode;
}
