import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "./countryResolver";
import { evaluateCountryLocalizationStructure } from "./countryLocalizationStructure";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "./countryOperationalLaunchGate";

const FIRST_WAVE_COUNTRIES = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

const VERIFIED_OPERATIONAL_EVIDENCE: CountryOperationalEvidence = {
  domainBinding: "VERIFIED",
  authCallback: "VERIFIED",
  sessionCookies: "VERIFIED",
  tenantDataIsolation: "VERIFIED",
  communicationsRules: "VERIFIED",
  recordingConsentEvidence: "VERIFIED",
  legalComplianceEvidence: "VERIFIED",
  dataResidency: "VERIFIED",
  localization: "VERIFIED",
  requiredIntegrations: "VERIFIED",
  commercialReadiness: "VERIFIED",
  roomFactoryTemplate: "VERIFIED",
  paymentOperations: "VERIFIED",
  qaSecurityRegression: "VERIFIED",
  previewSmokeTest: "VERIFIED",
  deploymentProtection: "VERIFIED",
  rollbackPath: "VERIFIED",
};

describe("country localization structure launch gate", () => {
  it("keeps the configured first-wave country metadata structurally aligned", () => {
    for (const countryCode of FIRST_WAVE_COUNTRIES) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      const result = evaluateCountryLocalizationStructure(config!);
      expect(
        result.blockers.filter((blocker) => blocker.startsWith("ROOM_FACTORY_")),
        countryCode,
      ).toEqual([]);
      expect(
        result.blockers.includes("PRIMARY_CREATE_ROOM_LOCALE_UNSUPPORTED"),
        countryCode,
      ).toBe(false);
    }
  });

  it("fails Canada closed until its declared French secondary locale is supported", () => {
    const config = getCountryConfigByCountryCode("CA");
    expect(config?.secondaryLocale).toBe("fr-CA");

    expect(evaluateCountryLocalizationStructure(config!)).toEqual({
      ready: false,
      blockers: ["SECONDARY_CREATE_ROOM_LOCALE_UNSUPPORTED"],
    });
  });

  it("does not allow generic VERIFIED localization evidence to override structural gaps", () => {
    const config = getCountryConfigByCountryCode("CA");
    const result = evaluateCountryOperationalLaunch(config!, VERIFIED_OPERATIONAL_EVIDENCE);

    expect(result.localizationStructure.ready).toBe(false);
    expect(result.operationalBlockers).toContain("LOCALIZATION_STRUCTURE_NOT_READY");
    expect(result.launchable).toBe(false);
  });
});
