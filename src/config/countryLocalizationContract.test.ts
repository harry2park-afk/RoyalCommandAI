import { describe, expect, it } from "vitest";
import {
  getConfiguredCountryCodes,
  getCountryConfigByCountryCode,
} from "./countryResolver";

const FIRST_WAVE_LOCALIZATION = {
  AU: { locale: "en-AU", secondaryLocale: null, currency: "AUD", phoneCountryCode: "+61" },
  US: { locale: "en-US", secondaryLocale: null, currency: "USD", phoneCountryCode: "+1" },
  CA: { locale: "en-CA", secondaryLocale: "fr-CA", currency: "CAD", phoneCountryCode: "+1" },
  KR: { locale: "ko-KR", secondaryLocale: null, currency: "KRW", phoneCountryCode: "+82" },
  JP: { locale: "ja-JP", secondaryLocale: null, currency: "JPY", phoneCountryCode: "+81" },
  GB: { locale: "en-GB", secondaryLocale: null, currency: "GBP", phoneCountryCode: "+44" },
} as const;

describe("first-wave country localization contract", () => {
  it("keeps the October first-wave locale, currency and calling-code mapping explicit", () => {
    expect(getConfiguredCountryCodes()).toEqual(["AU", "CA", "GB", "JP", "KR", "US"]);

    for (const [countryCode, expected] of Object.entries(FIRST_WAVE_LOCALIZATION)) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      expect(
        {
          locale: config?.locale,
          secondaryLocale: config?.secondaryLocale ?? null,
          currency: config?.currency,
          phoneCountryCode: config?.phoneCountryCode,
        },
        countryCode,
      ).toEqual(expected);
    }
  });

  it("keeps localization metadata structurally usable without treating configuration as launch approval", () => {
    for (const countryCode of getConfiguredCountryCodes()) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      expect(config?.locale.trim().length, countryCode).toBeGreaterThan(0);
      expect(config?.currency).toMatch(/^[A-Z]{3}$/);
      expect(config?.phoneCountryCode).toMatch(/^\+\d+$/);
      expect(config?.dateFormat.trim().length, countryCode).toBeGreaterThan(0);
      expect(["12h", "24h"], countryCode).toContain(config?.timeFormat);
      expect(config?.timezone.storage, countryCode).toBe("UTC");
      expect(config?.timezone.display, countryCode).toBe("IANA");
      expect(config?.timezone.supportedExamples.length, countryCode).toBeGreaterThan(0);
    }
  });
});
