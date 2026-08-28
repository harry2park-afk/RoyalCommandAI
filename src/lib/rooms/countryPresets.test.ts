import { describe, expect, it } from "vitest";
import { COUNTRY_ROOM_PRESETS } from "./countryPresets";

const REQUIRED_COUNTRIES = ["AU", "KR", "US", "GB", "JP", "SG", "CN", "HK", "TW", "IN"];

describe("Room Factory country preset registry", () => {
  it("provides at least 100 country locale defaults", () => {
    expect(COUNTRY_ROOM_PRESETS.length).toBeGreaterThanOrEqual(100);
  });

  it("uses unique ISO-style country codes", () => {
    const ids = COUNTRY_ROOM_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[A-Z]{2}$/);
  });

  it("keeps core launch countries registered", () => {
    const ids = new Set(COUNTRY_ROOM_PRESETS.map((preset) => preset.id));
    for (const id of REQUIRED_COUNTRIES) expect(ids.has(id)).toBe(true);
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
