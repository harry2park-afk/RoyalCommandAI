import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "./countryResolver";

const FIRST_WAVE_COUNTRY_IDENTITY = [
  {
    countryCode: "AU",
    locale: "en-AU",
    secondaryLocale: null,
    currency: "AUD",
    phoneCountryCode: "+61",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
  },
  {
    countryCode: "US",
    locale: "en-US",
    secondaryLocale: null,
    currency: "USD",
    phoneCountryCode: "+1",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
  },
  {
    countryCode: "CA",
    locale: "en-CA",
    secondaryLocale: "fr-CA",
    currency: "CAD",
    phoneCountryCode: "+1",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "12h",
  },
  {
    countryCode: "KR",
    locale: "ko-KR",
    secondaryLocale: null,
    currency: "KRW",
    phoneCountryCode: "+82",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
  },
  {
    countryCode: "JP",
    locale: "ja-JP",
    secondaryLocale: null,
    currency: "JPY",
    phoneCountryCode: "+81",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "24h",
  },
  {
    countryCode: "GB",
    locale: "en-GB",
    secondaryLocale: null,
    currency: "GBP",
    phoneCountryCode: "+44",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
  },
] as const;

describe("first-wave country identity contract", () => {
  it("locks locale, currency, telephony and date/time identity for the October first wave", () => {
    for (const expected of FIRST_WAVE_COUNTRY_IDENTITY) {
      const config = getCountryConfigByCountryCode(expected.countryCode);
      expect(config, expected.countryCode).not.toBeNull();
      expect(config, expected.countryCode).toMatchObject({
        ...expected,
        timezone: {
          storage: "UTC",
          display: "IANA",
        },
      });
    }
  });

  it("keeps the first-wave identity matrix unique by country code and locale/currency pair", () => {
    expect(new Set(FIRST_WAVE_COUNTRY_IDENTITY.map(({ countryCode }) => countryCode)).size).toBe(
      FIRST_WAVE_COUNTRY_IDENTITY.length,
    );
    expect(
      new Set(FIRST_WAVE_COUNTRY_IDENTITY.map(({ locale, currency }) => `${locale}:${currency}`)).size,
    ).toBe(FIRST_WAVE_COUNTRY_IDENTITY.length);
  });
});
