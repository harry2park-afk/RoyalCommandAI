import { CREATE_ROOM_LANGUAGES } from "../lib/rooms/create-room-i18n";
import { COUNTRY_ROOM_PRESETS } from "../lib/rooms/countryPresets";
import type { CountryConfig } from "../types/countryConfig";

export type CountryLocalizationStructureBlockerCode =
  | "ROOM_FACTORY_COUNTRY_PRESET_MISSING"
  | "ROOM_FACTORY_LOCALE_MISMATCH"
  | "ROOM_FACTORY_CURRENCY_MISMATCH"
  | "ROOM_FACTORY_TIMEZONE_MISMATCH"
  | "PRIMARY_CREATE_ROOM_LOCALE_UNSUPPORTED"
  | "SECONDARY_CREATE_ROOM_LOCALE_UNSUPPORTED";

export type CountryLocalizationStructureGate = {
  ready: boolean;
  blockers: CountryLocalizationStructureBlockerCode[];
};

const SUPPORTED_CREATE_ROOM_LANGUAGES = new Set(
  CREATE_ROOM_LANGUAGES.map(({ locale }) => locale.toLowerCase()),
);

function languageBase(locale: string): string {
  return locale.trim().toLowerCase().split(/[-_]/)[0];
}

/**
 * Repository-grounded localization structure gate.
 *
 * This is deliberately narrower than human localization QA. It verifies only
 * that the configured country can be represented consistently by the Room
 * Factory preset and Create Room language registry. A passing result does not
 * prove translation quality, browser rendering, legal wording, or locale E2E.
 */
export function evaluateCountryLocalizationStructure(
  config: CountryConfig,
): CountryLocalizationStructureGate {
  const blockers: CountryLocalizationStructureBlockerCode[] = [];
  const preset = COUNTRY_ROOM_PRESETS.find((candidate) => candidate.id === config.countryCode);

  if (!preset) {
    blockers.push("ROOM_FACTORY_COUNTRY_PRESET_MISSING");
  } else {
    if (preset.languageTag !== config.locale) blockers.push("ROOM_FACTORY_LOCALE_MISMATCH");
    if (preset.currencyCode !== config.currency) blockers.push("ROOM_FACTORY_CURRENCY_MISMATCH");
    if (!config.timezone.supportedExamples.includes(preset.timeZone)) {
      blockers.push("ROOM_FACTORY_TIMEZONE_MISMATCH");
    }
  }

  if (!SUPPORTED_CREATE_ROOM_LANGUAGES.has(languageBase(config.locale))) {
    blockers.push("PRIMARY_CREATE_ROOM_LOCALE_UNSUPPORTED");
  }

  if (
    config.secondaryLocale &&
    !SUPPORTED_CREATE_ROOM_LANGUAGES.has(languageBase(config.secondaryLocale))
  ) {
    blockers.push("SECONDARY_CREATE_ROOM_LOCALE_UNSUPPORTED");
  }

  return { ready: blockers.length === 0, blockers };
}
