import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "../../config/countryResolver";
import { PROFESSIONAL_ROOM_DIRECTORY } from "./professional-room-directory";
import { buildProfessionalRoomCountryTemplatePlan } from "./professional-room-country-template-plan";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

const FIRST_WAVE_LOCALIZATION_CONTRACT = {
  AU: {
    locale: "en-AU",
    secondaryLocale: null,
    currency: "AUD",
    phoneCountryCode: "+61",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    addressFormat: ["street_address_1", "street_address_2", "suburb", "state_code", "postcode"],
    supportedTimeZones: [
      "Australia/Sydney",
      "Australia/Melbourne",
      "Australia/Brisbane",
      "Australia/Adelaide",
      "Australia/Perth",
      "Australia/Hobart",
      "Australia/Darwin",
    ],
  },
  US: {
    locale: "en-US",
    secondaryLocale: null,
    currency: "USD",
    phoneCountryCode: "+1",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    addressFormat: [
      "street_address_1",
      "street_address_2",
      "city",
      "state_code",
      "zip_code",
      "zip_plus_4",
    ],
    supportedTimeZones: [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Phoenix",
      "America/Anchorage",
      "Pacific/Honolulu",
    ],
  },
  CA: {
    locale: "en-CA",
    secondaryLocale: "fr-CA",
    currency: "CAD",
    phoneCountryCode: "+1",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "12h",
    addressFormat: ["street_address_1", "street_address_2", "city", "province_code", "postal_code"],
    supportedTimeZones: [
      "America/Toronto",
      "America/Vancouver",
      "America/Edmonton",
      "America/Winnipeg",
      "America/Halifax",
      "America/St_Johns",
    ],
  },
  KR: {
    locale: "ko-KR",
    secondaryLocale: null,
    currency: "KRW",
    phoneCountryCode: "+82",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
    addressFormat: [
      "postal_code",
      "province_or_special_city",
      "city_district",
      "road_name_address",
      "building_detail",
    ],
    supportedTimeZones: ["Asia/Seoul"],
  },
  JP: {
    locale: "ja-JP",
    secondaryLocale: null,
    currency: "JPY",
    phoneCountryCode: "+81",
    dateFormat: "YYYY/MM/DD",
    timeFormat: "24h",
    addressFormat: ["postal_code", "prefecture", "city_ward_town", "street_block", "building_detail"],
    supportedTimeZones: ["Asia/Tokyo"],
  },
  GB: {
    locale: "en-GB",
    secondaryLocale: null,
    currency: "GBP",
    phoneCountryCode: "+44",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    addressFormat: ["building_and_street", "address_line_2", "locality", "post_town", "postcode"],
    supportedTimeZones: ["Europe/London"],
  },
} as const;

function expectLocaleForCountry(locale: string, countryCode: string) {
  expect(locale.trim()).toMatch(/^[A-Za-z]{2,3}(?:-[A-Za-z]{4})?-[A-Za-z]{2}$/);
  expect(locale.trim().slice(-2).toUpperCase()).toBe(countryCode);
}

describe("Professional Room first-wave localization integrity", () => {
  it("pins the exact reviewed country localization contract before room planning", () => {
    for (const countryCode of FIRST_WAVE) {
      const expected = FIRST_WAVE_LOCALIZATION_CONTRACT[countryCode];
      const config = getCountryConfigByCountryCode(countryCode);

      expect(config, countryCode).not.toBeNull();
      expect(config?.countryCode).toBe(countryCode);
      expect(config?.locale).toBe(expected.locale);
      expect(config?.secondaryLocale ?? null).toBe(expected.secondaryLocale);
      expect(config?.currency).toBe(expected.currency);
      expect(config?.phoneCountryCode).toBe(expected.phoneCountryCode);
      expect(config?.dateFormat).toBe(expected.dateFormat);
      expect(config?.timeFormat).toBe(expected.timeFormat);
      expect(config?.addressFormat).toEqual(expected.addressFormat);
      expect(config?.timezone.storage).toBe("UTC");
      expect(config?.timezone.display).toBe("IANA");
      expect(config?.timezone.supportedExamples).toEqual(expected.supportedTimeZones);
    }
  });

  it("requires complete canonical localization metadata before any of the 18 room plans can be prepared", () => {
    expect(PROFESSIONAL_ROOM_DIRECTORY).toHaveLength(18);

    for (const countryCode of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      expect(config?.countryCode).toBe(countryCode);

      expectLocaleForCountry(config!.locale, countryCode);
      if (config!.secondaryLocale) {
        expectLocaleForCountry(config!.secondaryLocale, countryCode);
      }

      expect(config!.currency).toMatch(/^[A-Z]{3}$/);
      expect(config!.phoneCountryCode).toMatch(/^\+[1-9]\d{0,3}$/);
      expect(config!.dateFormat.trim().length).toBeGreaterThan(0);
      expect(["12h", "24h"]).toContain(config!.timeFormat);
      expect(config!.addressFormat.length).toBeGreaterThan(0);
      expect(config!.addressFormat.every((field) => field.trim().length > 0)).toBe(true);
      expect(new Set(config!.addressFormat).size).toBe(config!.addressFormat.length);
      expect(config!.timezone.storage).toBe("UTC");
      expect(config!.timezone.display).toBe("IANA");
      expect(config!.timezone.supportedExamples.length).toBeGreaterThan(0);
      expect(config!.timezone.supportedExamples.every((zone) => zone.includes("/"))).toBe(true);
      expect(new Set(config!.timezone.supportedExamples).size).toBe(
        config!.timezone.supportedExamples.length,
      );

      for (const room of PROFESSIONAL_ROOM_DIRECTORY) {
        const plan = buildProfessionalRoomCountryTemplatePlan(room.id, countryCode);
        expect(plan, `${countryCode}:${room.id}`).not.toBeNull();
        expect(plan?.countryCode).toBe(countryCode);
        expect(plan?.locale).toBe(config!.locale);
        expect(plan?.secondaryLocale).toBe(config!.secondaryLocale ?? null);
        expect(plan?.currency).toBe(config!.currency);
        expect(plan?.phoneCountryCode).toBe(config!.phoneCountryCode);
        expect(plan?.dateFormat).toBe(config!.dateFormat);
        expect(plan?.timeFormat).toBe(config!.timeFormat);
        expect(plan?.addressFormat).toEqual(config!.addressFormat);
        expect(plan?.timeZoneStorage).toBe(config!.timezone.storage);
        expect(plan?.timeZoneDisplay).toBe(config!.timezone.display);
        expect(plan?.supportedTimeZones).toEqual(config!.timezone.supportedExamples);
        expect(plan?.launchAuthority).toBe("COUNTRY_GATE_REQUIRED");
        expect(plan?.humanApprovalRequired).toBe(true);
        expect(plan?.regulatedExecutionAllowed).toBe(false);
        expect(plan?.livePaymentExecutionAllowed).toBe(false);
        expect(plan?.createsRoom).toBe(false);
        expect(plan?.activatesCountry).toBe(false);
      }
    }
  });
});
