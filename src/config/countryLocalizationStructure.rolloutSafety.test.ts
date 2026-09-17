import { describe, expect, it } from "vitest";
import { CREATE_ROOM_LANGUAGES, createRoomCopy } from "../lib/rooms/create-room-i18n";
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

  it("supports Canada's declared French secondary locale in Create Room without critical English fallback", () => {
    const config = getCountryConfigByCountryCode("CA");
    expect(config?.secondaryLocale).toBe("fr-CA");
    expect(CREATE_ROOM_LANGUAGES.map(({ locale }) => locale)).toContain("fr");
    expect(createRoomCopy("fr").title).toBe("Créer votre Room");

    const structure = evaluateCountryLocalizationStructure(config!);
    expect(structure).toEqual({ ready: true, blockers: [] });

    const gate = evaluateCountryOperationalLaunch(config!, VERIFIED_OPERATIONAL_EVIDENCE);
    expect(gate.operationalBlockers).not.toContain("LOCALIZATION_STRUCTURE_NOT_READY");
    expect(gate.launchable).toBe(false);
  });

  it("fails closed when a first-wave address contract requires a subdivision but no canonical inventory exists", () => {
    for (const countryCode of ["JP", "KR"] as const) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      if (!config) throw new Error(`Missing CountryConfig for ${countryCode}`);

      const structure = evaluateCountryLocalizationStructure(config);
      expect(structure.ready, countryCode).toBe(false);
      expect(structure.blockers, countryCode).toContain("ADDRESS_SUBDIVISION_INVENTORY_MISSING");
    }

    for (const countryCode of ["AU", "US", "CA", "GB"] as const) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();
      if (!config) throw new Error(`Missing CountryConfig for ${countryCode}`);

      expect(evaluateCountryLocalizationStructure(config).blockers, countryCode).not.toContain(
        "ADDRESS_SUBDIVISION_INVENTORY_MISSING",
      );
    }
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
