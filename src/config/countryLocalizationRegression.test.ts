import { describe, expect, it } from "vitest";
import {
  getConfiguredCountryCodes,
  getCountryConfigByCountryCode,
} from "./countryResolver";

const FIRST_WAVE_LOCALIZATION = {
  AU: {
    locale: "en-AU",
    secondaryLocale: null,
    currency: "AUD",
    phoneCountryCode: "+61",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    timezoneAnchor: "Australia/Sydney",
  },
  US: {
    locale: "en-US",
    secondaryLocale: null,
    currency: "USD",
    phoneCountryCode: "+1",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    timezoneAnchor: "America/New_York",
  },
  CA: {
    locale: "en-CA",
    secondaryLocale: "fr-CA",
    currency: "CAD",
    phoneCountryCode: "+1",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "12h",
    timezoneAnchor: "America/Toronto",
  },
  KR: {
    locale: "ko-KR",
    secondaryLocale: null,
    currency: "KRW",
    phoneCountryCode: "+82",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
    timezoneAnchor: "Asia/Seoul",
  },
  JP: {
    locale: "ja-JP",
    secondaryLocale: null,
    currency: "JPY",
    phoneCountryCode: "+81",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "24h",
    timezoneAnchor: "Asia/Tokyo",
  },
  GB: {
    locale: "en-GB",
    secondaryLocale: null,
    currency: "GBP",
    phoneCountryCode: "+44",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    timezoneAnchor: "Europe/London",
  },
} as const;

describe("first-wave country localization regression guard", () => {
  it("keeps the six launch-country identities and locale metadata explicit", () => {
    expect(getConfiguredCountryCodes()).toEqual(["AU", "CA", "GB", "JP", "KR", "US"]);

    for (const [countryCode, expected] of Object.entries(FIRST_WAVE_LOCALIZATION)) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      expect(config?.countryCode, countryCode).toBe(countryCode);
      expect(config?.locale, countryCode).toBe(expected.locale);
      expect(config?.secondaryLocale ?? null, countryCode).toBe(expected.secondaryLocale);
      expect(config?.currency, countryCode).toBe(expected.currency);
      expect(config?.phoneCountryCode, countryCode).toBe(expected.phoneCountryCode);
      expect(config?.dateFormat, countryCode).toBe(expected.dateFormat);
      expect(config?.timeFormat, countryCode).toBe(expected.timeFormat);
      expect(config?.timezone.storage, countryCode).toBe("UTC");
      expect(config?.timezone.display, countryCode).toBe("IANA");
      expect(config?.timezone.supportedExamples, countryCode).toContain(expected.timezoneAnchor);
    }
  });

  it("requires usable timezone and address metadata for every configured launch country", () => {
    for (const countryCode of getConfiguredCountryCodes()) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      const timezoneExamples = config!.timezone.supportedExamples;
      expect(timezoneExamples.length, countryCode).toBeGreaterThan(0);
      for (const timeZone of timezoneExamples) {
        expect(() => new Intl.DateTimeFormat("en", { timeZone }).format(0), `${countryCode}:${timeZone}`).not.toThrow();
      }

      expect(config!.addressFormat.length, countryCode).toBeGreaterThan(0);
      expect(new Set(config!.addressFormat).size, countryCode).toBe(config!.addressFormat.length);
      for (const field of config!.addressFormat) {
        expect(field.trim().length, `${countryCode}:address`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps bilingual metadata explicit where currently required", () => {
    expect(getCountryConfigByCountryCode("CA")?.secondaryLocale).toBe("fr-CA");
    expect(getCountryConfigByCountryCode("AU")?.secondaryLocale ?? null).toBeNull();
    expect(getCountryConfigByCountryCode("US")?.secondaryLocale ?? null).toBeNull();
    expect(getCountryConfigByCountryCode("KR")?.secondaryLocale ?? null).toBeNull();
    expect(getCountryConfigByCountryCode("JP")?.secondaryLocale ?? null).toBeNull();
    expect(getCountryConfigByCountryCode("GB")?.secondaryLocale ?? null).toBeNull();
  });
});
