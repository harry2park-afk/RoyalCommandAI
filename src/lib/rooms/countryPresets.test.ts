import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "../../config/countryResolver";
import { COUNTRY_ROOM_PRESETS } from "./countryPresets";

const FIRST_WAVE_COUNTRIES = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const NEXT_PRIORITY_COUNTRIES = ["SG", "CN", "HK", "TW", "IN"] as const;

describe("Room Factory country preset registry", () => {
  it("provides at least 100 country locale defaults", () => {
    expect(COUNTRY_ROOM_PRESETS.length).toBeGreaterThanOrEqual(100);
  });

  it("uses unique ISO-style country codes", () => {
    const ids = COUNTRY_ROOM_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[A-Z]{2}$/);
  });

  it("keeps all six first-wave launch countries registered", () => {
    const ids = new Set(COUNTRY_ROOM_PRESETS.map((preset) => preset.id));
    for (const id of FIRST_WAVE_COUNTRIES) expect(ids.has(id), id).toBe(true);
  });

  it("keeps next-priority country presets available without treating them as first-wave launch approval", () => {
    const ids = new Set(COUNTRY_ROOM_PRESETS.map((preset) => preset.id));
    for (const id of NEXT_PRIORITY_COUNTRIES) expect(ids.has(id), id).toBe(true);
  });

  it("keeps first-wave Room Factory locale, currency and timezone aligned with country configuration", () => {
    const presetsById = new Map(COUNTRY_ROOM_PRESETS.map((preset) => [preset.id, preset]));

    for (const countryCode of FIRST_WAVE_COUNTRIES) {
      const preset = presetsById.get(countryCode);
      const config = getCountryConfigByCountryCode(countryCode);

      expect(preset, `${countryCode} Room Factory preset`).toBeDefined();
      expect(config, `${countryCode} country config`).not.toBeNull();
      expect(preset?.languageTag, `${countryCode} locale`).toBe(config?.locale);
      expect(preset?.currencyCode, `${countryCode} currency`).toBe(config?.currency);
      expect(config?.timezone.supportedExamples, `${countryCode} timezone`).toContain(preset?.timeZone);
    }
  });

  it("provides only base locale defaults, not compliance approval fields", () => {
    for (const preset of COUNTRY_ROOM_PRESETS) {
      expect(preset.languageTag.length).toBeGreaterThan(1);
      expect(preset.timeZone.length).toBeGreaterThan(2);
      expect(preset.currencyCode).toMatch(/^[A-Z]{3}$/);
      expect("complianceApproved" in preset).toBe(false);
    }
  });
});
