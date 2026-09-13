import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "../../config/countryResolver";
import { PROFESSIONAL_ROOM_DIRECTORY } from "./professional-room-directory";
import { buildProfessionalRoomCountryTemplatePlan } from "./professional-room-country-template-plan";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

function expectLocaleForCountry(locale: string, countryCode: string) {
  expect(locale.trim()).toMatch(/^[A-Za-z]{2,3}(?:-[A-Za-z]{4})?-[A-Za-z]{2}$/);
  expect(locale.trim().slice(-2).toUpperCase()).toBe(countryCode);
}

describe("Professional Room first-wave localization integrity", () => {
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
