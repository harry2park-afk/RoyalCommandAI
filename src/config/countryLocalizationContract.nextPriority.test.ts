import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "./countryResolver";

const NEXT_PRIORITY_CONTRACT = {
  SG: {
    locale: "en-SG",
    secondaryLocale: null,
    currency: "SGD",
    phoneCountryCode: "+65",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    addressFormat: [
      "block_or_house_number",
      "street_name",
      "building_name",
      "unit_number",
      "postal_code",
    ],
    timezone: { storage: "UTC", display: "IANA", supportedExamples: ["Asia/Singapore"] },
  },
  CN: {
    locale: "zh-CN",
    secondaryLocale: null,
    currency: "CNY",
    phoneCountryCode: "+86",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
    addressFormat: [
      "province",
      "city",
      "district",
      "street_name",
      "building_number",
      "postal_code",
    ],
    timezone: { storage: "UTC", display: "IANA", supportedExamples: ["Asia/Shanghai"] },
  },
  HK: {
    locale: "en-HK",
    secondaryLocale: "zh-HK",
    currency: "HKD",
    phoneCountryCode: "+852",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    addressFormat: [
      "unit_number",
      "floor",
      "building_name",
      "street_name",
      "district",
      "region",
    ],
    timezone: { storage: "UTC", display: "IANA", supportedExamples: ["Asia/Hong_Kong"] },
  },
  TW: {
    locale: "zh-TW",
    secondaryLocale: "en-TW",
    currency: "TWD",
    phoneCountryCode: "+886",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "24h",
    addressFormat: [
      "postal_code",
      "region",
      "district",
      "street_name",
      "building_number",
      "floor",
      "unit_number",
    ],
    timezone: { storage: "UTC", display: "IANA", supportedExamples: ["Asia/Taipei"] },
  },
  IN: {
    locale: "en-IN",
    secondaryLocale: null,
    currency: "INR",
    phoneCountryCode: "+91",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    addressFormat: [
      "building_number",
      "street_name",
      "locality",
      "city",
      "state",
      "postal_code",
    ],
    timezone: { storage: "UTC", display: "IANA", supportedExamples: ["Asia/Kolkata"] },
  },
} as const;

describe("next-priority country localization contract", () => {
  it("pins exact locale, currency, phone, address and timezone metadata for SG/CN/HK/TW/IN", () => {
    for (const [countryCode, expected] of Object.entries(NEXT_PRIORITY_CONTRACT)) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      if (!config) throw new Error(`Missing CountryConfig for ${countryCode}`);

      expect(
        {
          locale: config.locale,
          secondaryLocale: config.secondaryLocale ?? null,
          currency: config.currency,
          phoneCountryCode: config.phoneCountryCode,
          dateFormat: config.dateFormat,
          timeFormat: config.timeFormat,
          addressFormat: config.addressFormat,
          timezone: config.timezone,
        },
        countryCode,
      ).toEqual(expected);
    }
  });

  it("does not convert localization completeness into launch approval", () => {
    for (const countryCode of Object.keys(NEXT_PRIORITY_CONTRACT)) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      if (!config) throw new Error(`Missing CountryConfig for ${countryCode}`);

      expect(config.payments.status, countryCode).toBe("NOT_CONNECTED");
      expect(config.tax.status, countryCode).toBe("NOT_CONNECTED");
      expect(config.taxStructure?.status, countryCode).toBe("NEEDS_REVIEW");
      expect(config.compliance.legal, countryCode).toBe("NEEDS_REVIEW");
      expect(config.compliance.tax, countryCode).toBe("NEEDS_REVIEW");
      expect(config.compliance.medical, countryCode).toBe("NEEDS_REVIEW");
      expect(config.compliance.investment, countryCode).toBe("NEEDS_REVIEW");
      expect(config.compliance.privacy, countryCode).toBe("NEEDS_REVIEW");
    }
  });
});
