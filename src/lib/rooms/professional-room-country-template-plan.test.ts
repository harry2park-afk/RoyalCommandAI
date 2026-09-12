import { describe, expect, it } from "vitest";
import { PROFESSIONAL_ROOM_DIRECTORY } from "./professional-room-directory";
import { buildProfessionalRoomCountryTemplatePlan } from "./professional-room-country-template-plan";

const FIRST_WAVE = {
  AU: { locale: "en-AU", secondaryLocale: null, currency: "AUD", phoneCountryCode: "+61" },
  US: { locale: "en-US", secondaryLocale: null, currency: "USD", phoneCountryCode: "+1" },
  CA: { locale: "en-CA", secondaryLocale: "fr-CA", currency: "CAD", phoneCountryCode: "+1" },
  KR: { locale: "ko-KR", secondaryLocale: null, currency: "KRW", phoneCountryCode: "+82" },
  JP: { locale: "ja-JP", secondaryLocale: null, currency: "JPY", phoneCountryCode: "+81" },
  GB: { locale: "en-GB", secondaryLocale: null, currency: "GBP", phoneCountryCode: "+44" },
} as const;

const NEXT_PRIORITY_WITHOUT_CANONICAL_CONFIG = ["SG", "CN", "HK", "TW", "IN"] as const;

describe("Professional Room country template plan", () => {
  it("prepares all 18 governed templates for all six first-wave CountryConfigs without creating or activating anything", () => {
    expect(PROFESSIONAL_ROOM_DIRECTORY).toHaveLength(18);

    let preparedPlans = 0;
    for (const room of PROFESSIONAL_ROOM_DIRECTORY) {
      for (const [countryCode, expected] of Object.entries(FIRST_WAVE)) {
        const plan = buildProfessionalRoomCountryTemplatePlan(room.id, countryCode);

        expect(plan, `${room.id}:${countryCode}`).not.toBeNull();
        expect(plan?.catalogId).toBe(room.id);
        expect(plan?.productId).toBe(room.productId);
        expect(plan?.templateId).toBe(room.templateId);
        expect(plan?.countryCode).toBe(countryCode);
        expect(plan?.locale).toBe(expected.locale);
        expect(plan?.secondaryLocale).toBe(expected.secondaryLocale);
        expect(plan?.currency).toBe(expected.currency);
        expect(plan?.phoneCountryCode).toBe(expected.phoneCountryCode);
        expect(plan?.timeZoneStorage).toBe("UTC");
        expect(plan?.timeZoneDisplay).toBe("IANA");
        expect(plan?.supportedTimeZones.length).toBeGreaterThan(0);
        expect(plan?.launchAuthority).toBe("COUNTRY_GATE_REQUIRED");
        expect(plan?.createsRoom).toBe(false);
        expect(plan?.activatesCountry).toBe(false);
        preparedPlans += 1;
      }
    }

    expect(preparedPlans).toBe(18 * 6);
  });

  it("normalizes a canonical first-wave country code without weakening the launch boundary", () => {
    const plan = buildProfessionalRoomCountryTemplatePlan(
      PROFESSIONAL_ROOM_DIRECTORY[0].id,
      " ca ",
    );

    expect(plan?.countryCode).toBe("CA");
    expect(plan?.locale).toBe("en-CA");
    expect(plan?.secondaryLocale).toBe("fr-CA");
    expect(plan?.launchAuthority).toBe("COUNTRY_GATE_REQUIRED");
    expect(plan?.createsRoom).toBe(false);
  });

  it("fails closed for next-priority countries until a canonical CountryConfig exists", () => {
    for (const countryCode of NEXT_PRIORITY_WITHOUT_CANONICAL_CONFIG) {
      for (const room of PROFESSIONAL_ROOM_DIRECTORY) {
        expect(
          buildProfessionalRoomCountryTemplatePlan(room.id, countryCode),
          `${room.id}:${countryCode}`,
        ).toBeNull();
      }
    }
  });

  it("fails closed for unknown Professional Room catalog IDs", () => {
    for (const countryCode of Object.keys(FIRST_WAVE)) {
      expect(
        buildProfessionalRoomCountryTemplatePlan("unknown-professional-room", countryCode),
      ).toBeNull();
    }
  });
});
