import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "../../../config/countryResolver";
import { COUNTRY_ROOM_PRESETS } from "../countryPresets";
import {
  CANADA_COUNTRY_PACK,
  FIRST_WAVE_COUNTRY_ROOM_PACKS,
  getFirstWaveCountryRoomPack,
} from ".";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

describe("first-wave country Room packs", () => {
  it("keeps the first wave exact and the next wave outside this registry", () => {
    expect(FIRST_WAVE_COUNTRY_ROOM_PACKS.map((pack) => pack.id)).toEqual(FIRST_WAVE);
    expect(getFirstWaveCountryRoomPack("SG")).toBeNull();
  });

  it("matches canonical config and Room Factory presets", () => {
    const presets = new Map(COUNTRY_ROOM_PRESETS.map((preset) => [preset.id, preset] as const));

    for (const code of FIRST_WAVE) {
      const pack = getFirstWaveCountryRoomPack(code);
      const config = getCountryConfigByCountryCode(code);
      const preset = presets.get(code);
      expect(pack).not.toBeNull();
      expect(config).not.toBeNull();
      expect(preset).toBeDefined();
      expect(pack?.locale).toBe(config?.locale);
      expect(pack?.languageTag).toBe(config?.locale);
      expect(pack?.currencyCode).toBe(config?.currency);
      expect(pack?.phoneCountryCode).toBe(config?.phoneCountryCode);
      expect(pack?.dateFormat).toBe(config?.dateFormat);
      expect(pack?.timeFormat).toBe(config?.timeFormat);
      expect(pack?.addressFormat).toEqual(config?.addressFormat);
      expect(pack?.timeZone).toBe(preset?.timeZone);
      expect(config?.timezone.supportedExamples).toContain(pack?.timeZone);
      expect(pack?.roomDefaults.clonePolicy).toBe("structure-only");
      expect(pack?.roomDefaults.cloneCustomerData).toBe(false);
      expect(pack?.roomDefaults.cloneMemory).toBe(false);
      expect(pack?.roomDefaults.cloneCredentials).toBe(false);
      expect(pack?.roomDefaults.cloneSecrets).toBe(false);
      expect(pack?.roomDefaults.humanApprovalForExternalActions).toBe(true);
      expect(pack?.policy).toEqual({
        globalCoreImmutable: true,
        countryRulesSeparateFromCore: true,
        customerDataIsolationRequired: true,
        customerSecretsNeverCopied: true,
        countrySpecificComplianceMustBeVersioned: true,
      });
    }
  });

  it("keeps Canada's reviewed secondary locale visible in the pack", () => {
    expect(getCountryConfigByCountryCode("CA")?.secondaryLocale).toBe("fr-CA");
    expect(CANADA_COUNTRY_PACK.secondaryLanguageTags).toContain("fr-CA");
  });
});
