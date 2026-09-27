import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "./countryResolver";
import { validateRoomFactoryRuntimeEvidence } from "./roomFactoryRuntimeEvidenceContract";

const FIRST_WAVE = {
  AU: "en-AU",
  US: "en-US",
  CA: "en-CA",
  KR: "ko-KR",
  JP: "ja-JP",
  GB: "en-GB",
} as const;

describe("Room Factory exact-locale runtime evidence contract", () => {
  it.each(Object.entries(FIRST_WAVE))(
    "%s accepts only an encounter-backed manifest for the configured exact locale",
    (countryCode, languageTag) => {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      expect(config?.locale, countryCode).toBe(languageTag);

      const result = validateRoomFactoryRuntimeEvidence(config!, {
        countryCode,
        languageTag,
        manifestId: `manifest-${countryCode}`,
        encounterId: `encounter-${countryCode}`,
      });

      expect(result, countryCode).toEqual({ verified: true, blockers: [] });
    },
  );

  it("rejects a legacy AU manifest whose language tag is not en-AU", () => {
    const config = getCountryConfigByCountryCode("AU");
    expect(config).not.toBeNull();

    expect(
      validateRoomFactoryRuntimeEvidence(config!, {
        countryCode: "AU",
        languageTag: "ko-KR",
        manifestId: "legacy-au-manifest",
        encounterId: "legacy-au-encounter",
      }),
    ).toEqual({
      verified: false,
      blockers: ["LANGUAGE_TAG_MISMATCH"],
    });
  });

  it("rejects a locale-correct manifest that is not encounter-backed", () => {
    const config = getCountryConfigByCountryCode("AU");
    expect(config).not.toBeNull();

    expect(
      validateRoomFactoryRuntimeEvidence(config!, {
        countryCode: "AU",
        languageTag: "en-AU",
        manifestId: "manifest-au",
        encounterId: null,
      }),
    ).toEqual({
      verified: false,
      blockers: ["ENCOUNTER_ID_MISSING"],
    });
  });

  it("fails closed when country, locale and runtime identifiers are absent or mismatched", () => {
    const config = getCountryConfigByCountryCode("AU");
    expect(config).not.toBeNull();

    expect(
      validateRoomFactoryRuntimeEvidence(config!, {
        countryCode: "US",
        languageTag: null,
        manifestId: " ",
        encounterId: "",
      }),
    ).toEqual({
      verified: false,
      blockers: [
        "COUNTRY_MISMATCH",
        "LANGUAGE_TAG_MISMATCH",
        "MANIFEST_ID_MISSING",
        "ENCOUNTER_ID_MISSING",
      ],
    });
  });
});
