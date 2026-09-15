import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "./countryResolver";
import { evaluateCountryLocalizationStructure } from "./countryLocalizationStructure";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "./countryOperationalLaunchGate";

const VERIFIED_OPERATIONAL_EVIDENCE: CountryOperationalEvidence = {
  domainBinding: "VERIFIED",
  authCallback: "VERIFIED",
  sessionCookies: "VERIFIED",
  authRecoveryEvidence: "VERIFIED",
  databaseMigrationSafety: "VERIFIED",
  tenantDataIsolation: "VERIFIED",
  matterOwnershipAssignmentAuthority: "VERIFIED",
  authorizationRoleAuthority: "VERIFIED",
  communicationsRules: "VERIFIED",
  recordingConsentEvidence: "VERIFIED",
  legalComplianceEvidence: "VERIFIED",
  privacyLifecycleEvidence: "VERIFIED",
  dataResidency: "VERIFIED",
  localization: "VERIFIED",
  requiredIntegrations: "VERIFIED",
  commercialReadiness: "VERIFIED",
  roomFactoryTemplate: "VERIFIED",
  paymentOperations: "VERIFIED",
  observabilityIncidentResponse: "VERIFIED",
  qaSecurityRegression: "VERIFIED",
  previewSmokeTest: "VERIFIED",
  deploymentProtection: "VERIFIED",
  rollbackPath: "VERIFIED",
};

describe("country localization structure rollout safety", () => {
  it("keeps the existing Australia launch path structurally aligned", () => {
    const config = getCountryConfigByCountryCode("AU");
    expect(config).not.toBeNull();
    expect(evaluateCountryLocalizationStructure(config!)).toEqual({
      ready: true,
      blockers: [],
    });
  });

  it("fails Canada closed while its declared French secondary locale is absent from Create Room languages", () => {
    const config = getCountryConfigByCountryCode("CA");
    expect(config?.secondaryLocale).toBe("fr-CA");

    const structure = evaluateCountryLocalizationStructure(config!);
    expect(structure.ready).toBe(false);
    expect(structure.blockers).toContain("SECONDARY_CREATE_ROOM_LOCALE_UNSUPPORTED");

    const gate = evaluateCountryOperationalLaunch(config!, VERIFIED_OPERATIONAL_EVIDENCE);
    expect(gate.launchable).toBe(false);
    expect(gate.operationalBlockers).toContain("LOCALIZATION_STRUCTURE_NOT_READY");
  });

  it("does not let a VERIFIED localization evidence flag hide missing repository wiring", () => {
    const config = getCountryConfigByCountryCode("AU");
    expect(config).not.toBeNull();

    const structure = evaluateCountryLocalizationStructure({
      ...config!,
      countryCode: "ZZ",
    });

    expect(structure.ready).toBe(false);
    expect(structure.blockers).toContain("ROOM_FACTORY_COUNTRY_PRESET_MISSING");
    expect(structure.blockers).toContain("CREATE_ROOM_COUNTRY_OPTION_MISSING");
  });
});
