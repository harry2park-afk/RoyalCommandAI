import { describe, expect, it } from "vitest";
import {
  evaluateNextPriorityLocalizationReadiness,
  NEXT_PRIORITY_COUNTRIES,
} from "./nextPriorityLocalizationReadiness";

describe("next-priority country localization preparation", () => {
  it("keeps the next wave explicit and outside the launch registry", () => {
    expect(NEXT_PRIORITY_COUNTRIES).toEqual(["SG", "CN", "HK", "TW", "IN"]);

    const evidence = evaluateNextPriorityLocalizationReadiness();

    for (const country of evidence.countries) {
      expect(country.blockers).not.toContain("UNEXPECTEDLY_ACTIVE_IN_LAUNCH_REGISTRY");
    }
  });

  it("proves the already aligned countries and pins the two current locale blockers", () => {
    const evidence = evaluateNextPriorityLocalizationReadiness();
    const byCountry = new Map(
      evidence.countries.map((country) => [country.countryCode, country] as const),
    );

    for (const countryCode of ["SG", "CN", "TW"] as const) {
      expect(byCountry.get(countryCode)?.readyForCountryConfigAuthoring).toBe(true);
      expect(byCountry.get(countryCode)?.blockers).toEqual([]);
    }

    expect(byCountry.get("HK")).toMatchObject({
      presetLocale: "zh-HK",
      expectedCreateRoomLocale: "zh",
      configuredCreateRoomLocale: "en",
      readyForCountryConfigAuthoring: false,
      blockers: ["CREATE_ROOM_PRIMARY_LOCALE_MISMATCH"],
    });

    expect(byCountry.get("IN")).toMatchObject({
      presetLocale: "en-IN",
      expectedCreateRoomLocale: "en",
      configuredCreateRoomLocale: "hi",
      readyForCountryConfigAuthoring: false,
      blockers: ["CREATE_ROOM_PRIMARY_LOCALE_MISMATCH"],
    });

    expect(evidence.ready).toBe(false);
  });
});
