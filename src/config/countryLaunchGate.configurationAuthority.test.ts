import { describe, expect, it } from "vitest";
import {
  evaluateCountryLaunch,
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
  type CountryOperationalReleaseScope,
} from "./countryLaunchGate";
import { getCountryConfigByCountryCode } from "./countryResolver";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const NEXT_PRIORITY = ["SG", "CN", "HK", "TW", "IN"] as const;
const RELEASE_SCOPE: CountryOperationalReleaseScope = {
  releaseCandidateSha: "1111111111111111111111111111111111111111",
  migrationApplySetFingerprint: "migration-set-v1",
  roomFactoryTemplateFingerprint: "room-factory-template-set-v1",
  hostedOperationalDataFingerprint: "hosted-operational-data-v1",
};

function completeOperationalEvidence(countryCode: string): CountryOperationalEvidence {
  return {
    countryCode,
    environment: "HOSTED_PRODUCTION",
    ...RELEASE_SCOPE,
    countryTermsReviewed: true,
    positiveLocalPrice: true,
    providerOfferReviewed: true,
    recordingPolicyReviewed: true,
    paymentProviderRegistryReady: true,
    paymentEventLedgerReady: true,
    serviceOrderIdempotencyReady: true,
    authDataIsolationVerified: true,
    roomFactoryIsolationVerified: true,
    roomFactorySourceReconciled: true,
    linkedMigrationApplySetVerified: true,
    authRecoveryE2EVerified: true,
    authenticatedLocalizationBrowserVerified: true,
    securityRegressionVerified: true,
    observabilityReady: true,
    rollbackVerified: true,
  };
}

describe("country configuration authority over operational evidence", () => {
  it("does not let complete operational evidence override unresolved first-wave country configuration", () => {
    for (const countryCode of FIRST_WAVE) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      const configGate = evaluateCountryLaunch(config!);
      expect(configGate.launchable, countryCode).toBe(false);
      expect(
        evaluateCountryOperationalLaunch(config!, completeOperationalEvidence(countryCode), RELEASE_SCOPE),
        countryCode,
      ).toEqual(configGate);
    }
  });

  it("applies the same fail-closed composition rule before expanding to SG/CN/HK/TW/IN", () => {
    for (const countryCode of NEXT_PRIORITY) {
      const config = getCountryConfigByCountryCode(countryCode);
      expect(config, countryCode).not.toBeNull();

      const configGate = evaluateCountryLaunch(config!);
      expect(configGate.launchable, countryCode).toBe(false);
      expect(
        evaluateCountryOperationalLaunch(config!, completeOperationalEvidence(countryCode), RELEASE_SCOPE),
        countryCode,
      ).toEqual(configGate);
    }
  });
});
