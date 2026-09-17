import { describe, expect, it } from "vitest";
import { getFirstWaveCountryRoomPack } from "../lib/rooms/countries";
import { getCountryConfigByCountryCode } from "./countryResolver";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

function packSecondaryLanguageTags(countryCode: (typeof FIRST_WAVE)[number]): readonly string[] {
  const pack = getFirstWaveCountryRoomPack(countryCode);
  expect(pack, countryCode).not.toBeNull();
  if (!pack) throw new Error(`Missing first-wave Room Pack for ${countryCode}`);

  return "secondaryLanguageTags" in pack
    ? (pack.secondaryLanguageTags as readonly string[])
    : [];
}

describe("first-wave secondary-locale regression safety", () => {
  it("binds Room Pack secondary languages exactly to canonical CountryConfig", () => {
    for (const code of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(code);
      expect(config, code).not.toBeNull();
      if (!config) throw new Error(`Missing CountryConfig for ${code}`);

      const expectedSecondaryLanguages = config.secondaryLocale
        ? [config.secondaryLocale]
        : [];

      expect(packSecondaryLanguageTags(code), code).toEqual(expectedSecondaryLanguages);
    }
  });

  it("keeps Canada's required French locale explicit and prevents accidental extras", () => {
    expect(packSecondaryLanguageTags("CA")).toEqual(["fr-CA"]);

    for (const code of ["AU", "US", "KR", "JP", "GB"] as const) {
      expect(packSecondaryLanguageTags(code), code).toEqual([]);
    }
  });
});
