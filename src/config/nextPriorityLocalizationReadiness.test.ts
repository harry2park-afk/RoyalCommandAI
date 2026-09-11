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

  it("proves Room Factory and Create Room primary locales are structurally aligned", () => {
    const evidence = evaluateNextPriorityLocalizationReadiness();
    const byCountry = new Map(
      evidence.countries.map((country) => [country.countryCode, country] as const),
    );

    expect(byCountry.get("SG")).toMatchObject({
      presetLocale: "en-SG",
      expectedCreateRoomLocale: "en",
      configuredCreateRoomLocale: "en",
      readyForCountryConfigAuthoring: true,
      blockers: [],
    });
    expect(byCountry.get("CN")).toMatchObject({
      presetLocale: "zh-CN",
      expectedCreateRoomLocale: "zh",
      configuredCreateRoomLocale: "zh",
      readyForCountryConfigAuthoring: true,
      blockers: [],
    });
    expect(byCountry.get("HK")).toMatchObject({
      presetLocale: "zh-HK",
      expectedCreateRoomLocale: "zh",
      configuredCreateRoomLocale: "zh",
      readyForCountryConfigAuthoring: true,
      blockers: [],
    });
    expect(byCountry.get("TW")).toMatchObject({
      presetLocale: "zh-TW",
      expectedCreateRoomLocale: "zh",
      configuredCreateRoomLocale: "zh",
      readyForCountryConfigAuthoring: true,
      blockers: [],
    });
    expect(byCountry.get("IN")).toMatchObject({
      presetLocale: "en-IN",
      expectedCreateRoomLocale: "en",
      configuredCreateRoomLocale: "en",
      readyForCountryConfigAuthoring: true,
      blockers: [],
    });

    expect(evidence.ready).toBe(true);
  });
});
