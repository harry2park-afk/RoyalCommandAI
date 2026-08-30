export const GLOBAL_FALLBACK_LOCALE = "en-US" as const;

export const COUNTRY_DEFAULT_LOCALE: Record<string, string> = {
  US: "en-US",
  AU: "en-AU",
  GB: "en-GB",
  KR: "ko-KR",
};

export type LocaleResolutionInput = {
  explicitUiLocale?: string | null;
  legacyLanguage?: string | null;
  countryCode?: string | null;
};

export type LocaleResolution = {
  locale: string;
  language: string;
  countryCode: string | null;
  source: "explicit" | "legacy" | "country" | "fallback";
};

function canonicalLocale(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return null;
  try {
    return Intl.getCanonicalLocales(raw)[0] || null;
  } catch {
    return null;
  }
}

function normalizedCountry(value?: string | null) {
  const raw = (value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(raw) ? raw : null;
}

export function normalizeLegacyLanguage(value?: string | null, countryCode?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return null;

  // Backward compatibility: current Royal Command uses `en` to mean Australian English.
  if (raw.toLowerCase() === "en") return "en-AU";
  if (raw.toLowerCase() === "ko") return "ko-KR";

  const country = normalizedCountry(countryCode);
  if (raw.toUpperCase() === "AU") return "en-AU";
  if (raw.toUpperCase() === "US") return "en-US";
  if (raw.toUpperCase() === "GB") return "en-GB";
  if (raw.toUpperCase() === "KR") return "ko-KR";

  const canonical = canonicalLocale(raw);
  if (canonical) return canonical;

  if (raw.toLowerCase() === "english") return country ? COUNTRY_DEFAULT_LOCALE[country] || GLOBAL_FALLBACK_LOCALE : GLOBAL_FALLBACK_LOCALE;
  return null;
}

export function resolveGlobalLocale(input: LocaleResolutionInput = {}): LocaleResolution {
  const countryCode = normalizedCountry(input.countryCode);

  const explicit = canonicalLocale(input.explicitUiLocale);
  if (explicit) {
    return { locale: explicit, language: explicit.split("-")[0], countryCode, source: "explicit" };
  }

  const legacy = normalizeLegacyLanguage(input.legacyLanguage, countryCode);
  if (legacy) {
    return { locale: legacy, language: legacy.split("-")[0], countryCode, source: "legacy" };
  }

  if (countryCode && COUNTRY_DEFAULT_LOCALE[countryCode]) {
    const locale = COUNTRY_DEFAULT_LOCALE[countryCode];
    return { locale, language: locale.split("-")[0], countryCode, source: "country" };
  }

  return { locale: GLOBAL_FALLBACK_LOCALE, language: "en", countryCode, source: "fallback" };
}

export function localeForEnglishCountry(countryCode?: string | null) {
  const country = normalizedCountry(countryCode);
  if (country === "AU") return "en-AU";
  if (country === "GB") return "en-GB";
  return "en-US";
}
