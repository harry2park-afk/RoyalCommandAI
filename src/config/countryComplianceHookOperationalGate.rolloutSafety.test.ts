import { describe, expect, it } from "vitest";
import { getCountryConfigByCountryCode } from "./countryResolver";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
} from "./countryOperationalLaunchGate";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const NEXT_PRIORITY = ["SG", "CN", "HK", "TW", "IN"] as const;

const verifiedEvidence: CountryOperationalEvidence = {
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

describe("country compliance-hook rollout safety", () => {
  it("has structural compliance wiring for every first-wave country", () => {
    for (const code of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(code);
      expect(config).not.toBeNull();
      const gate = evaluateCountryOperationalLaunch(config!, verifiedEvidence);
      expect(gate.operationalBlockers).not.toContain(
        "COMPLIANCE_HOOK_STRUCTURE_NOT_READY",
      );
    }
  });

  it("keeps the next-priority countries fail-closed until their compliance hooks are reviewed", () => {
    for (const code of NEXT_PRIORITY) {
      const config = getCountryConfigByCountryCode(code);
      expect(config).not.toBeNull();
      const gate = evaluateCountryOperationalLaunch(config!, verifiedEvidence);
      expect(gate.launchable).toBe(false);
      expect(gate.operationalBlockers).toContain(
        "COMPLIANCE_HOOK_STRUCTURE_NOT_READY",
      );
    }
  });
});
