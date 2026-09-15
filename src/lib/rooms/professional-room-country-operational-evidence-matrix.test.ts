import { describe, expect, it } from "vitest";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalBlockerCode,
  type CountryOperationalEvidence,
  type OperationalEvidenceStatus,
} from "../../config/countryOperationalLaunchGate";
import { getCountryConfigByCountryCode } from "../../config/countryResolver";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

const VERIFIED_OPERATIONAL_EVIDENCE: CountryOperationalEvidence = {
  domainBinding: "VERIFIED",
  authCallback: "VERIFIED",
  sessionCookies: "VERIFIED",
  communicationsRules: "VERIFIED",
  dataResidency: "VERIFIED",
  localization: "VERIFIED",
  requiredIntegrations: "VERIFIED",
  previewSmokeTest: "VERIFIED",
  rollbackPath: "VERIFIED",
};

const REQUIREMENTS: ReadonlyArray<{
  key: keyof CountryOperationalEvidence;
  blocker: CountryOperationalBlockerCode;
}> = [
  { key: "domainBinding", blocker: "DOMAIN_BINDING_NOT_VERIFIED" },
  { key: "authCallback", blocker: "AUTH_CALLBACK_NOT_VERIFIED" },
  { key: "sessionCookies", blocker: "SESSION_COOKIES_NOT_VERIFIED" },
  { key: "communicationsRules", blocker: "COMMUNICATIONS_RULES_NOT_VERIFIED" },
  { key: "dataResidency", blocker: "DATA_RESIDENCY_NOT_VERIFIED" },
  { key: "localization", blocker: "LOCALIZATION_NOT_VERIFIED" },
  { key: "requiredIntegrations", blocker: "REQUIRED_INTEGRATIONS_NOT_VERIFIED" },
  { key: "previewSmokeTest", blocker: "PREVIEW_SMOKE_TEST_NOT_VERIFIED" },
  { key: "rollbackPath", blocker: "ROLLBACK_PATH_NOT_VERIFIED" },
] as const;

const NON_VERIFIED_STATUSES: OperationalEvidenceStatus[] = ["NEEDS_REVIEW", "BLOCKED"];

describe("Professional Room first-wave operational evidence matrix", () => {
  it("fails closed for every required operational control in every first-wave country", () => {
    for (const countryCode of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      for (const { key, blocker } of REQUIREMENTS) {
        for (const status of NON_VERIFIED_STATUSES) {
          const evidence: CountryOperationalEvidence = {
            ...VERIFIED_OPERATIONAL_EVIDENCE,
            [key]: status,
          };
          const gate = evaluateCountryOperationalLaunch(config!, evidence);
          const caseId = `${countryCode}:${key}:${status}`;

          expect(gate.launchable, caseId).toBe(false);
          expect(gate.operationalBlockers, caseId).toEqual([blocker]);
        }
      }
    }
  });

  it("requires the complete verified evidence set before operational blockers clear", () => {
    for (const countryCode of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      const gate = evaluateCountryOperationalLaunch(config!, VERIFIED_OPERATIONAL_EVIDENCE);

      expect(gate.operationalBlockers, countryCode).toEqual([]);
      // Operational evidence may clear its own gate, but canonical legal/tax/payment
      // readiness remains authoritative and cannot be bypassed here.
      expect(gate.launchable, countryCode).toBe(gate.countryGate.launchable);
    }
  });
});
