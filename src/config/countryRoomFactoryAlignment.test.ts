import { describe, expect, it } from "vitest";
import { COUNTRY_ROOM_PRESETS } from "../lib/rooms/countryPresets";
import {
  getConfiguredCountryCodes,
  getCountryConfigByCountryCode,
} from "./countryResolver";

const FIRST_WAVE_COUNTRIES = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

describe("country configuration to Room Factory preset alignment", () => {
  it("keeps every first-wave country registered in both launch config and Room Factory presets", () => {
    const configuredCountries = new Set(getConfiguredCountryCodes());
    const presetCountries = new Set(COUNTRY_ROOM_PRESETS.map((preset) => preset.id));

    for (const countryCode of FIRST_WAVE_COUNTRIES) {
      expect(configuredCountries.has(countryCode), countryCode).toBe(true);
      expect(presetCountries.has(countryCode), countryCode).toBe(true);
    }
  });

  it("keeps locale and currency aligned for every configured launch country", () => {
    const presetsByCountry = new Map(
      COUNTRY_ROOM_PRESETS.map((preset) => [preset.id, preset] as const),
    );

    for (const countryCode of getConfiguredCountryCodes()) {
      const config = getCountryConfigByCountryCode(countryCode);
      const preset = presetsByCountry.get(countryCode);

      expect(config, countryCode).not.toBeNull();
      expect(preset, countryCode).toBeDefined();
      expect(preset?.languageTag, `${countryCode} locale`).toBe(config?.locale);
      expect(preset?.currencyCode, `${countryCode} currency`).toBe(config?.currency);
    }
  });
});
