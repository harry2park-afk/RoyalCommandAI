import { describe, expect, it } from "vitest";
import {
  getConfiguredCountryCodes,
  getCountryConfigByCountryCode,
} from "./countryResolver";

const FIRST_WAVE = {
  AU: {
    locale: "en-AU",
    secondaryLocale: null,
    currency: "AUD",
    phoneCountryCode: "+61",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
  },
  US: {
    locale: "en-US",
    secondaryLocale: null,
    currency: "USD",
    phoneCountryCode: "+1",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
  },
  CA: {
    locale: "en-CA",
    secondaryLocale: "fr-CA",
    currency: "CAD",
    phoneCountryCode: "+1",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "12h",
  },
  KR: {
    locale: "ko-KR",
    secondaryLocale: null,
    currency: "KRW",
    phoneCountryCode: "+82",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
  },
  JP: {
    locale: "ja-JP",
    secondaryLocale: null,
    currency: "JPY",
    phoneCountryCode: "+81",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "24h",
  },
  GB: {
    locale: "en-GB",
    secondaryLocale: null,
    currency: "GBP",
    phoneCountryCode: "+44",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
  },
} as const;

const REVIEW_FIELDS = ["legal", "tax", "medical", "investment", "privacy"] as const;

describe("October first-wave country localization contract", () => {
  it("keeps every first-wave country configured without removing staged next-wave country configs", () => {
    const configuredCountryCodes = getConfiguredCountryCodes();
    for (const countryCode of Object.keys(FIRST_WAVE)) {
      expect(configuredCountryCodes, countryCode).toContain(countryCode);
    }
  });

  it.each(Object.entries(FIRST_WAVE))(
    "%s keeps its reviewed locale, currency, phone and date/time identity",
    (countryCode, expected) => {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      expect(
        {
          locale: config?.locale,
          secondaryLocale: config?.secondaryLocale ?? null,
          currency: config?.currency,
          phoneCountryCode: config?.phoneCountryCode,
          dateFormat: config?.dateFormat,
          timeFormat: config?.timeFormat,
        },
        countryCode,
      ).toEqual(expected);

      expect(config?.timezone.storage, countryCode).toBe("UTC");
      expect(config?.timezone.display, countryCode).toBe("IANA");
      expect(config?.timezone.supportedExamples.length, countryCode).toBeGreaterThan(0);
      expect(config?.addressFormat.length, countryCode).toBeGreaterThan(0);
    },
  );

  it("preserves Canada's explicit French localization path", () => {
    const canada = getCountryConfigByCountryCode("CA");
    expect(canada?.locale).toBe("en-CA");
    expect(canada?.secondaryLocale).toBe("fr-CA");
  });

  it.each(Object.keys(FIRST_WAVE))(
    "%s remains fail-closed for compliance, tax and payments until evidence is reviewed",
    (countryCode) => {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      for (const field of REVIEW_FIELDS) {
        expect(config?.compliance[field], `${countryCode}:${field}`).not.toBe("READY");
      }

      expect(config?.taxStructure?.status, countryCode).not.toBe("READY");
      expect(config?.payments.status, countryCode).toBe("NOT_CONNECTED");
      expect(config?.tax.status, countryCode).toBe("NOT_CONNECTED");
    },
  );
});
