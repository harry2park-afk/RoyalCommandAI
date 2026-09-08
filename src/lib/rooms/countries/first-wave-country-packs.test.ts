import { describe, expect, it } from "vitest";
import {
  getCountryConfigByCountryCode,
} from "../../../config/countryResolver";
import { COUNTRY_ROOM_PRESETS } from "../countryPresets";
import {
  CANADA_COUNTRY_PACK,
  FIRST_WAVE_COUNTRY_ROOM_PACKS,
  getFirstWaveCountryRoomPack,
} from ".";

const FIRST_WAVE_COUNTRIES = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

describe("first-wave country Room Factory packs", () => {
  it("registers exactly the six first-wave country packs without activating other countries", () => {
    expect(FIRST_WAVE_COUNTRY_ROOM_PACKS.map((pack) => pack.id)).toEqual(
      FIRST_WAVE_COUNTRIES,
    );
    expect(getFirstWaveCountryRoomPack("SG")).toBeNull();
  });

  it("aligns each pack with CountryConfig and the Room Factory preset", () => {
    const presetsByCountry = new Map(
      COUNTRY_ROOM_PRESETS.map((preset) => [preset.id, preset] as const),
    );

    for (const countryCode of FIRST_WAVE_COUNTRIES) {
      const pack = getFirstWaveCountryRoomPack(countryCode);
      const config = getCountryConfigByCountryCode(countryCode);
      const preset = presetsByCountry.get(countryCode);

      expect(pack, `${countryCode} pack`).not.toBeNull();
      expect(config, `${countryCode} config`).not.toBeNull();
      expect(preset, `${countryCode} preset`).toBeDefined();
      expect(pack?.locale, `${countryCode} locale`).toBe(config?.locale);
      expect(pack?.languageTag, `${countryCode} language`).toBe(config?.locale);
      expect(pack?.currencyCode, `${countryCode} currency`).toBe(config?.currency);
      expect(pack?.phoneCountryCode, `${countryCode} phone code`).toBe(
        config?.phoneCountryCode,
      );
      expect(pack?.dateFormat, `${countryCode} date format`).toBe(config?.dateFormat);
      expect(pack?.timeZone, `${countryCode} preset timezone`).toBe(preset?.timeZone);
      expect(config?.timezone.supportedExamples, `${countryCode} supported timezone`).toContain(
        pack?.timeZone,
      );
      expect(pack?.languageTag, `${countryCode} preset locale`).toBe(preset?.languageTag);
      expect(pack?.currencyCode, `${countryCode} preset currency`).toBe(
        preset?.currencyCode,
      );
    }
  });

  it("preserves structure-only cloning and customer isolation on every first-wave pack", () => {
    for (const pack of FIRST_WAVE_COUNTRY_ROOM_PACKS) {
      expect(pack.roomDefaults.clonePolicy, `${pack.id} clone policy`).toBe(
        "structure-only",
      );
      expect(pack.roomDefaults.cloneCustomerData, `${pack.id} customer data`).toBe(false);
      expect(pack.roomDefaults.cloneMemory, `${pack.id} memory`).toBe(false);
      expect(pack.roomDefaults.cloneCredentials, `${pack.id} credentials`).toBe(false);
      expect(pack.roomDefaults.cloneSecrets, `${pack.id} secrets`).toBe(false);
      expect(
        pack.roomDefaults.humanApprovalForExternalActions,
        `${pack.id} external action approval`,
      ).toBe(true);
      expect(pack.policy.globalCoreImmutable, `${pack.id} core immutability`).toBe(true);
      expect(
        pack.policy.countryRulesSeparateFromCore,
        `${pack.id} country rules separation`,
      ).toBe(true);
      expect(
        pack.policy.customerDataIsolationRequired,
        `${pack.id} customer isolation`,
      ).toBe(true);
      expect(pack.policy.customerSecretsNeverCopied, `${pack.id} secret isolation`).toBe(true);
      expect(
        pack.policy.countrySpecificComplianceMustBeVersioned,
        `${pack.id} compliance versioning`,
      ).toBe(true);
    }
  });

  it("keeps Canada's configured secondary French locale explicit in its country pack", () => {
    const config = getCountryConfigByCountryCode("CA");

    expect(config?.secondaryLocale).toBe("fr-CA");
    expect(CANADA_COUNTRY_PACK.secondaryLanguageTags).toContain("fr-CA");
  });
});
