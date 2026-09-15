import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "./countryResolver";

const FIRST_WAVE_CONTRACT = {
  AU: {
    locale: "en-AU",
    secondaryLocale: null,
    currency: "AUD",
    phoneCountryCode: "+61",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    addressFormat: ["street_address_1", "street_address_2", "suburb", "state_code", "postcode"],
    timezone: {
      storage: "UTC",
      display: "IANA",
      supportedExamples: [
        "Australia/Sydney",
        "Australia/Melbourne",
        "Australia/Brisbane",
        "Australia/Adelaide",
        "Australia/Perth",
        "Australia/Hobart",
        "Australia/Darwin",
      ],
    },
  },
  US: {
    locale: "en-US",
    secondaryLocale: null,
    currency: "USD",
    phoneCountryCode: "+1",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    addressFormat: ["street_address_1", "street_address_2", "city", "state_code", "zip_code", "zip_plus_4"],
    timezone: {
      storage: "UTC",
      display: "IANA",
      supportedExamples: [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Phoenix",
        "America/Anchorage",
        "Pacific/Honolulu",
      ],
    },
  },
  CA: {
    locale: "en-CA",
    secondaryLocale: "fr-CA",
    currency: "CAD",
    phoneCountryCode: "+1",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "12h",
    addressFormat: ["street_address_1", "street_address_2", "city", "province_code", "postal_code"],
    timezone: {
      storage: "UTC",
      display: "IANA",
      supportedExamples: [
        "America/Toronto",
        "America/Vancouver",
        "America/Edmonton",
        "America/Winnipeg",
        "America/Halifax",
        "America/St_Johns",
      ],
    },
  },
  KR: {
    locale: "ko-KR",
    secondaryLocale: null,
    currency: "KRW",
    phoneCountryCode: "+82",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
    addressFormat: ["postal_code", "province_or_special_city", "city_district", "road_name_address", "building_detail"],
    timezone: { storage: "UTC", display: "IANA", supportedExamples: ["Asia/Seoul"] },
  },
  JP: {
    locale: "ja-JP",
    secondaryLocale: null,
    currency: "JPY",
    phoneCountryCode: "+81",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "24h",
    addressFormat: ["postal_code", "prefecture", "city_ward_town", "street_block", "building_detail"],
    timezone: { storage: "UTC", display: "IANA", supportedExamples: ["Asia/Tokyo"] },
  },
  GB: {
    locale: "en-GB",
    secondaryLocale: null,
    currency: "GBP",
    phoneCountryCode: "+44",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    addressFormat: ["building_and_street", "address_line_2", "locality", "post_town", "postcode"],
    timezone: { storage: "UTC", display: "IANA", supportedExamples: ["Europe/London"] },
  },
} as const;

describe("first-wave country localization contract", () => {
  it("pins exact locale, currency, phone, address and timezone metadata for AU/US/CA/KR/JP/GB", () => {
    for (const [countryCode, expected] of Object.entries(FIRST_WAVE_CONTRACT)) {
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

  it("keeps first-wave source configuration fail-closed until operational launch evidence is independently verified", () => {
    for (const countryCode of Object.keys(FIRST_WAVE_CONTRACT)) {
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
