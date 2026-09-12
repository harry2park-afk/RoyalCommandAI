import { describe, expect, it } from "vitest";
import { COUNTRY_ROOM_PRESETS } from "../lib/rooms/countryPresets";
import {
  getConfiguredCountryCodes,
  getCountryConfigByCountryCode,
} from "./countryResolver";

const FIRST_WAVE_COUNTRIES = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const NEXT_PRIORITY_PRESET_EXPECTATIONS = {
  SG: {
    languageTag: "en-SG",
    currencyCode: "SGD",
    timeZone: "Asia/Singapore",
  },
  CN: {
    languageTag: "zh-CN",
    currencyCode: "CNY",
    timeZone: "Asia/Shanghai",
  },
  HK: {
    languageTag: "zh-HK",
    currencyCode: "HKD",
    timeZone: "Asia/Hong_Kong",
  },
  TW: {
    languageTag: "zh-TW",
    currencyCode: "TWD",
    timeZone: "Asia/Taipei",
  },
  IN: {
    languageTag: "en-IN",
    currencyCode: "INR",
    timeZone: "Asia/Kolkata",
  },
} as const;

describe("country configuration to Room Factory preset alignment", () => {
  it("keeps every first-wave country registered in both launch config and Room Factory presets", () => {
    const configuredCountries = new Set(getConfiguredCountryCodes());
    const presetCountries = new Set(COUNTRY_ROOM_PRESETS.map((preset) => preset.id));

    for (const countryCode of FIRST_WAVE_COUNTRIES) {
      expect(configuredCountries.has(countryCode), countryCode).toBe(true);
      expect(presetCountries.has(countryCode), countryCode).toBe(true);
    }
  });

  it("keeps locale, currency and timezone aligned for every configured launch country", () => {
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
      expect(
        config?.timezone.supportedExamples,
        `${countryCode} Room Factory timezone must be supported by CountryConfig`,
      ).toContain(preset?.timeZone);
    }
  });

  it("pins next-priority Room Factory locale identity without silently activating those countries", () => {
    const configuredCountries = new Set(getConfiguredCountryCodes());
    const presetsByCountry = new Map(
      COUNTRY_ROOM_PRESETS.map((preset) => [preset.id, preset] as const),
    );

    for (const [countryCode, expected] of Object.entries(
      NEXT_PRIORITY_PRESET_EXPECTATIONS,
    )) {
      const preset = presetsByCountry.get(countryCode);

      expect(preset, `${countryCode} Room Factory preset`).toBeDefined();
      expect(preset?.languageTag, `${countryCode} locale`).toBe(expected.languageTag);
      expect(preset?.currencyCode, `${countryCode} currency`).toBe(expected.currencyCode);
      expect(preset?.timeZone, `${countryCode} timezone`).toBe(expected.timeZone);
      expect(
        configuredCountries.has(countryCode),
        `${countryCode} must stay outside the configured launch registry until its own launch gates are reviewed`,
      ).toBe(false);
    }
  });
});
