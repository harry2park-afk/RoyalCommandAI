import { describe, expect, it } from "vitest";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
  type CountryOperationalReleaseScope,
  type LaunchBlockerCode,
} from "./countryLaunchGate";
import { getCountryConfigByCountryCode } from "./countryResolver";
import type { CountryConfig } from "../types/countryConfig";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const RELEASE_SCOPE: CountryOperationalReleaseScope = {
  releaseCandidateSha: "1111111111111111111111111111111111111111",
  migrationApplySetFingerprint: "2222222222222222222222222222222222222222222222222222222222222222",
  roomFactoryTemplateFingerprint: "3333333333333333333333333333333333333333333333333333333333333333",
  hostedOperationalDataFingerprint: "4444444444444444444444444444444444444444444444444444444444444444",
};
type OperationalEvidenceFlag = Exclude<
  keyof CountryOperationalEvidence,
  | "countryCode"
  | "environment"
  | "releaseCandidateSha"
  | "migrationApplySetFingerprint"
  | "roomFactoryTemplateFingerprint"
  | "hostedOperationalDataFingerprint"
>;

function readyOperationalEvidence(countryCode: string): CountryOperationalEvidence {
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

const OPERATIONAL_BLOCKERS: ReadonlyArray<readonly [OperationalEvidenceFlag, LaunchBlockerCode]> = [
  ["countryTermsReviewed", "COUNTRY_TERMS_NOT_REVIEWED"],
  ["positiveLocalPrice", "LOCAL_PRICE_NOT_READY"],
  ["providerOfferReviewed", "PROVIDER_OFFER_NOT_REVIEWED"],
  ["recordingPolicyReviewed", "RECORDING_POLICY_NOT_REVIEWED"],
  ["paymentProviderRegistryReady", "PAYMENT_PROVIDER_REGISTRY_NOT_READY"],
  ["paymentEventLedgerReady", "PAYMENT_EVENT_LEDGER_NOT_READY"],
  ["serviceOrderIdempotencyReady", "SERVICE_ORDER_IDEMPOTENCY_NOT_READY"],
  ["authDataIsolationVerified", "AUTH_DATA_ISOLATION_NOT_VERIFIED"],
  ["roomFactoryIsolationVerified", "ROOM_FACTORY_ISOLATION_NOT_VERIFIED"],
  ["roomFactorySourceReconciled", "ROOM_FACTORY_SOURCE_RECONCILIATION_NOT_VERIFIED"],
  ["linkedMigrationApplySetVerified", "LINKED_MIGRATION_APPLY_SET_NOT_VERIFIED"],
  ["authRecoveryE2EVerified", "AUTH_RECOVERY_E2E_NOT_VERIFIED"],
  ["authenticatedLocalizationBrowserVerified", "LOCALIZATION_BROWSER_REGRESSION_NOT_VERIFIED"],
  ["securityRegressionVerified", "SECURITY_REGRESSION_NOT_VERIFIED"],
  ["observabilityReady", "OBSERVABILITY_NOT_READY"],
  ["rollbackVerified", "ROLLBACK_NOT_VERIFIED"],
] as const;

function asConfigReady(base: CountryConfig): CountryConfig {
  return {
    ...base,
    compliance: { legal: "READY", tax: "READY", medical: "READY", investment: "READY", privacy: "READY" },
    taxStructure: base.taxStructure ? { ...base.taxStructure, status: "READY" } : undefined,
    payments: { ...base.payments, status: "CONNECTED" },
    tax: { ...base.tax, status: "CONNECTED" },
  };
}

describe("first-wave country operational launch matrix", () => {
  it("fails closed for every launch-critical operational evidence class in every first-wave country", () => {
    for (const countryCode of FIRST_WAVE) {
      const base = getCountryConfigByCountryCode(countryCode);
      expect(base, countryCode).not.toBeNull();
      for (const [key, expectedBlocker] of OPERATIONAL_BLOCKERS) {
        const evidence: CountryOperationalEvidence = { ...readyOperationalEvidence(countryCode), [key]: false };
        expect(evaluateCountryOperationalLaunch(asConfigReady(base!), evidence, RELEASE_SCOPE), `${countryCode}:${key}`).toEqual({
          launchable: false,
          blockers: [expectedBlocker],
        });
      }
    }
  });

  it("rejects evidence copied from a different first-wave country", () => {
    for (const countryCode of FIRST_WAVE) {
      const base = getCountryConfigByCountryCode(countryCode);
      expect(base, countryCode).not.toBeNull();
      const wrongCountry = countryCode === "AU" ? "US" : "AU";
      expect(evaluateCountryOperationalLaunch(asConfigReady(base!), readyOperationalEvidence(wrongCountry), RELEASE_SCOPE), countryCode).toEqual({
        launchable: false,
        blockers: ["OPERATIONAL_EVIDENCE_COUNTRY_MISMATCH"],
      });
    }
  });

  it("rejects first-wave evidence from a different release candidate, migration apply set, Room Factory/template contract or Hosted operational-data snapshot", () => {
    for (const countryCode of FIRST_WAVE) {
      const base = getCountryConfigByCountryCode(countryCode);
      expect(base, countryCode).not.toBeNull();
      expect(
        evaluateCountryOperationalLaunch(
          asConfigReady(base!),
          { ...readyOperationalEvidence(countryCode), releaseCandidateSha: "2222222222222222222222222222222222222222" },
          RELEASE_SCOPE,
        ),
        `${countryCode}:release`,
      ).toEqual({ launchable: false, blockers: ["OPERATIONAL_EVIDENCE_RELEASE_MISMATCH"] });
      expect(
        evaluateCountryOperationalLaunch(
          asConfigReady(base!),
          { ...readyOperationalEvidence(countryCode), migrationApplySetFingerprint: "migration-set-v0" },
          RELEASE_SCOPE,
        ),
        `${countryCode}:migration`,
      ).toEqual({ launchable: false, blockers: ["OPERATIONAL_EVIDENCE_MIGRATION_SCOPE_MISMATCH"] });
      expect(
        evaluateCountryOperationalLaunch(
          asConfigReady(base!),
          { ...readyOperationalEvidence(countryCode), roomFactoryTemplateFingerprint: "room-factory-template-set-v0" },
          RELEASE_SCOPE,
        ),
        `${countryCode}:room-factory-template`,
      ).toEqual({ launchable: false, blockers: ["OPERATIONAL_EVIDENCE_ROOM_FACTORY_SCOPE_MISMATCH"] });
      expect(
        evaluateCountryOperationalLaunch(
          asConfigReady(base!),
          { ...readyOperationalEvidence(countryCode), hostedOperationalDataFingerprint: "hosted-operational-data-v0" },
          RELEASE_SCOPE,
        ),
        `${countryCode}:hosted-operational-data`,
      ).toEqual({ launchable: false, blockers: ["OPERATIONAL_EVIDENCE_HOSTED_DATA_SCOPE_MISMATCH"] });
    }
  });
});
