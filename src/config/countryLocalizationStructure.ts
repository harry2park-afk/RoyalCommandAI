import {
  CREATE_ROOM_COUNTRIES,
  CREATE_ROOM_LANGUAGES,
  createRoomCopy,
  type CreateRoomLocale,
} from "../lib/rooms/create-room-i18n";
import { COUNTRY_ROOM_PRESETS } from "../lib/rooms/countryPresets";
import type { CountryConfig } from "../types/countryConfig";

export type CountryLocalizationStructureBlockerCode =
  | "ROOM_FACTORY_COUNTRY_PRESET_MISSING"
  | "ROOM_FACTORY_LOCALE_MISMATCH"
  | "ROOM_FACTORY_CURRENCY_MISMATCH"
  | "ROOM_FACTORY_TIMEZONE_MISMATCH"
  | "CREATE_ROOM_COUNTRY_OPTION_MISSING"
  | "CREATE_ROOM_COUNTRY_LOCALE_MISMATCH"
  | "PRIMARY_CREATE_ROOM_LOCALE_UNSUPPORTED"
  | "SECONDARY_CREATE_ROOM_LOCALE_UNSUPPORTED"
  | "PRIMARY_CREATE_ROOM_CRITICAL_COPY_INCOMPLETE"
  | "SECONDARY_CREATE_ROOM_CRITICAL_COPY_INCOMPLETE";

export type CountryLocalizationStructureGate = {
  ready: boolean;
  blockers: CountryLocalizationStructureBlockerCode[];
};

const SUPPORTED_CREATE_ROOM_LANGUAGES = new Set(
  CREATE_ROOM_LANGUAGES.map(({ locale }) => locale.toLowerCase()),
);

const FIRST_WAVE_COUNTRY_CODES = new Set(["AU", "US", "CA", "KR", "JP", "GB"]);

/**
 * High-risk user-facing Create Room copy that must not silently inherit English
 * when a first-wave country declares a non-English launch locale. Product names
 * and short words that can legitimately be identical across languages are kept
 * out of this list to avoid false positives.
 */
const CRITICAL_CREATE_ROOM_COPY_KEYS = [
  "goodDesc",
  "betterDesc",
  "bestDesc",
  "roomType",
  "team",
  "trialText",
  "training",
  "websiteBenefit",
  "step5Help",
  "agreement",
  "pendingIntegration",
  "readyPreview",
  "priceToConfirm",
  "included",
  "from",
  "selected",
  "basicBenefit",
] as const satisfies ReadonlyArray<keyof ReturnType<typeof createRoomCopy>>;

function languageBase(locale: string): string {
  return locale.trim().toLowerCase().split(/[-_]/)[0];
}

function hasCriticalEnglishFallback(locale: CreateRoomLocale): boolean {
  if (locale === "en") return false;

  const english = createRoomCopy("en");
  const localized = createRoomCopy(locale);

  return CRITICAL_CREATE_ROOM_COPY_KEYS.some((key) => localized[key] === english[key]);
}

/**
 * Repository-grounded localization structure gate.
 *
 * This is deliberately narrower than human localization QA. It verifies only
 * that the configured country can be represented consistently by the Room
 * Factory preset, the Create Room country selector, and the Create Room language
 * registry. For the October first wave it also prevents critical user-facing
 * Create Room copy from silently falling back to English for a declared
 * non-English primary or secondary locale. A passing result still does not prove
 * translation quality, browser rendering, legal wording, or locale E2E.
 */
export function evaluateCountryLocalizationStructure(
  config: CountryConfig,
): CountryLocalizationStructureGate {
  const blockers: CountryLocalizationStructureBlockerCode[] = [];
  const preset = COUNTRY_ROOM_PRESETS.find((candidate) => candidate.id === config.countryCode);
  const createRoomCountry = CREATE_ROOM_COUNTRIES.find(
    (candidate) => candidate.code === config.countryCode,
  );
  const primaryLocale = languageBase(config.locale);
  const secondaryLocale = config.secondaryLocale ? languageBase(config.secondaryLocale) : null;

  if (!preset) {
    blockers.push("ROOM_FACTORY_COUNTRY_PRESET_MISSING");
  } else {
    if (preset.languageTag !== config.locale) blockers.push("ROOM_FACTORY_LOCALE_MISMATCH");
    if (preset.currencyCode !== config.currency) blockers.push("ROOM_FACTORY_CURRENCY_MISMATCH");
    if (!config.timezone.supportedExamples.includes(preset.timeZone)) {
      blockers.push("ROOM_FACTORY_TIMEZONE_MISMATCH");
    }
  }

  if (!createRoomCountry) {
    blockers.push("CREATE_ROOM_COUNTRY_OPTION_MISSING");
  } else if (createRoomCountry.locale !== primaryLocale) {
    blockers.push("CREATE_ROOM_COUNTRY_LOCALE_MISMATCH");
  }

  if (!SUPPORTED_CREATE_ROOM_LANGUAGES.has(primaryLocale)) {
    blockers.push("PRIMARY_CREATE_ROOM_LOCALE_UNSUPPORTED");
  }

  if (secondaryLocale && !SUPPORTED_CREATE_ROOM_LANGUAGES.has(secondaryLocale)) {
    blockers.push("SECONDARY_CREATE_ROOM_LOCALE_UNSUPPORTED");
  }

  if (FIRST_WAVE_COUNTRY_CODES.has(config.countryCode)) {
    if (
      primaryLocale !== "en" &&
      SUPPORTED_CREATE_ROOM_LANGUAGES.has(primaryLocale) &&
      hasCriticalEnglishFallback(primaryLocale as CreateRoomLocale)
    ) {
      blockers.push("PRIMARY_CREATE_ROOM_CRITICAL_COPY_INCOMPLETE");
    }

    if (
      secondaryLocale &&
      secondaryLocale !== "en" &&
      SUPPORTED_CREATE_ROOM_LANGUAGES.has(secondaryLocale) &&
      hasCriticalEnglishFallback(secondaryLocale as CreateRoomLocale)
    ) {
      blockers.push("SECONDARY_CREATE_ROOM_CRITICAL_COPY_INCOMPLETE");
    }
  }

  return { ready: blockers.length === 0, blockers };
}
