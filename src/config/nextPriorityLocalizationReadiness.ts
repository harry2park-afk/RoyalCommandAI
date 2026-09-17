import {
  CREATE_ROOM_COUNTRIES,
  CREATE_ROOM_LANGUAGES,
  type CreateRoomLocale,
} from "../lib/rooms/create-room-i18n";
import { COUNTRY_ROOM_PRESETS } from "../lib/rooms/countryPresets";
import { getConfiguredCountryCodes } from "./countryResolver";

export const NEXT_PRIORITY_COUNTRIES = ["SG", "CN", "HK", "TW", "IN"] as const;
export type NextPriorityCountryCode = (typeof NEXT_PRIORITY_COUNTRIES)[number];

export type NextPriorityLocalizationBlockerCode =
  | "ROOM_FACTORY_PRESET_MISSING"
  | "CREATE_ROOM_COUNTRY_OPTION_MISSING"
  | "CREATE_ROOM_PRIMARY_LOCALE_MISMATCH"
  | "CREATE_ROOM_PRIMARY_LOCALE_UNSUPPORTED"
  | "UNEXPECTEDLY_ACTIVE_IN_LAUNCH_REGISTRY";

export type NextPriorityLocalizationCountryEvidence = {
  countryCode: NextPriorityCountryCode;
  presetLocale: string | null;
  expectedCreateRoomLocale: string | null;
  configuredCreateRoomLocale: string | null;
  blockers: NextPriorityLocalizationBlockerCode[];
  readyForCountryConfigAuthoring: boolean;
};

export type NextPriorityLocalizationReadiness = {
  ready: boolean;
  countries: NextPriorityLocalizationCountryEvidence[];
};

function languageBase(locale: string): string {
  return locale.trim().toLowerCase().split(/[-_]/)[0];
}

/**
 * Repository-only preparation gate for the next country wave.
 *
 * This does not activate a country and does not represent legal, privacy,
 * recording, tax, payment, provider, data-residency, browser or deployment
 * approval. It only proves that Room Factory locale identity and the Create Room
 * country selector are structurally aligned before a CountryConfig is authored.
 */
export function evaluateNextPriorityLocalizationReadiness(): NextPriorityLocalizationReadiness {
  const configuredCountries = new Set(getConfiguredCountryCodes());
  const supportedCreateRoomLocales = new Set(
    CREATE_ROOM_LANGUAGES.map(({ locale }) => locale),
  );

  const countries = NEXT_PRIORITY_COUNTRIES.map((countryCode) => {
    const blockers: NextPriorityLocalizationBlockerCode[] = [];
    const preset = COUNTRY_ROOM_PRESETS.find((candidate) => candidate.id === countryCode);
    const countryOption = CREATE_ROOM_COUNTRIES.find(
      (candidate) => candidate.code === countryCode,
    );
    const expectedCreateRoomLocale = preset ? languageBase(preset.languageTag) : null;

    if (!preset) blockers.push("ROOM_FACTORY_PRESET_MISSING");
    if (!countryOption) blockers.push("CREATE_ROOM_COUNTRY_OPTION_MISSING");

    if (
      preset &&
      countryOption &&
      countryOption.locale !== expectedCreateRoomLocale
    ) {
      blockers.push("CREATE_ROOM_PRIMARY_LOCALE_MISMATCH");
    }

    if (
      expectedCreateRoomLocale &&
      !supportedCreateRoomLocales.has(expectedCreateRoomLocale as CreateRoomLocale)
    ) {
      blockers.push("CREATE_ROOM_PRIMARY_LOCALE_UNSUPPORTED");
    }

    if (configuredCountries.has(countryCode)) {
      blockers.push("UNEXPECTEDLY_ACTIVE_IN_LAUNCH_REGISTRY");
    }

    return {
      countryCode,
      presetLocale: preset?.languageTag ?? null,
      expectedCreateRoomLocale,
      configuredCreateRoomLocale: countryOption?.locale ?? null,
      blockers,
      readyForCountryConfigAuthoring: blockers.length === 0,
    };
  });

  return {
    ready: countries.every((country) => country.readyForCountryConfigAuthoring),
    countries,
  };
}
