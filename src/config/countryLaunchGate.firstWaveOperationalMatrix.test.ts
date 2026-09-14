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
  migrationApplySetFingerprint: "migration-set-v1",
  roomFactoryTemplateFingerprint: "room-factory-template-set-v1",
  hostedOperationalDataFingerprint: "hosted-operational-data-v1",
};
type OperationalEvidenceFlag = Exclude<
  keyof CountryOperationalEvidence,
  | "countryCode"
  | "environment"
  | "releaseCandidateSha"
  | "migrationApplySetFingerprint"
  | "roomFactoryTemplateFingerprint"
  | "hostedOperationalDataFingerprint"
  | "operationalEvidenceObservedAt"
  | "operationalEvidenceExpiresAt"
>;

function freshOperationalEvidenceWindow() {
  const now = Date.now();
  return {
    operationalEvidenceObservedAt: new Date(now - 60_000).toISOString(),
    operationalEvidenceExpiresAt: new Date(now + 60 * 60 * 1000).toISOString(),
  };
}

function readyOperationalEvidence(countryCode: string): CountryOperationalEvidence {
  return {
    countryCode,
    environment: "HOSTED_PRODUCTION",
    ...RELEASE_SCOPE,
    operationalEvidenceFreshnessVerified: true,
    ...freshOperationalEvidenceWindow(),
    countryTermsReviewed: true,
    countryTermsReviewerProven: true,
    positiveLocalPrice: true,
    providerOfferReviewed: true,
    providerOfferReviewerProven: true,
    recordingPolicyReviewed: true,
    recordingPolicyReviewerProven: true,
    paymentProviderRegistryReady: true,
    paymentEventLedgerReady: true,
    serviceOrderIdempotencyReady: true,
    paymentSignedWebhookVerified: true,
    paymentWebhookReplayProtectionVerified: true,
    paymentRefundCancelVerified: true,
    paymentSandboxCheckoutVerified: true,
    paymentSettlementVerified: true,
    paymentRollbackVerified: true,
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
  ["operationalEvidenceFreshnessVerified", "OPERATIONAL_EVIDENCE_FRESHNESS_NOT_VERIFIED"],
  ["countryTermsReviewed", "COUNTRY_TERMS_NOT_REVIEWED"],
  ["countryTermsReviewerProven", "COUNTRY_TERMS_REVIEWER_PROVENANCE_NOT_VERIFIED"],
  ["positiveLocalPrice", "LOCAL_PRICE_NOT_READY"],
  ["providerOfferReviewed", "PROVIDER_OFFER_NOT_REVIEWED"],
  ["providerOfferReviewerProven", "PROVIDER_OFFER_REVIEWER_PROVENANCE_NOT_VERIFIED"],
  ["recordingPolicyReviewed", "RECORDING_POLICY_NOT_REVIEWED"],
  ["recordingPolicyReviewerProven", "RECORDING_POLICY_REVIEWER_PROVENANCE_NOT_VERIFIED"],
  ["paymentProviderRegistryReady", "PAYMENT_PROVIDER_REGISTRY_NOT_READY"],
  ["paymentEventLedgerReady", "PAYMENT_EVENT_LEDGER_NOT_READY"],
  ["serviceOrderIdempotencyReady", "SERVICE_ORDER_IDEMPOTENCY_NOT_READY"],
  ["paymentSignedWebhookVerified", "PAYMENT_SIGNED_WEBHOOK_NOT_VERIFIED"],
  ["paymentWebhookReplayProtectionVerified", "PAYMENT_WEBHOOK_REPLAY_PROTECTION_NOT_VERIFIED"],
  ["paymentRefundCancelVerified", "PAYMENT_REFUND_CANCEL_NOT_VERIFIED"],
  ["paymentSandboxCheckoutVerified", "PAYMENT_SANDBOX_CHECKOUT_NOT_VERIFIED"],
  ["paymentSettlementVerified", "PAYMENT_SETTLEMENT_NOT_VERIFIED"],
  ["paymentRollbackVerified", "PAYMENT_ROLLBACK_NOT_VERIFIED"],
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

  it("rejects expired operational evidence in every first-wave country", () => {
    const now = Date.now();
    for (const countryCode of FIRST_WAVE) {
      const base = getCountryConfigByCountryCode(countryCode);
      expect(base, countryCode).not.toBeNull();
      const evidence: CountryOperationalEvidence = {
        ...readyOperationalEvidence(countryCode),
        operationalEvidenceObservedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        operationalEvidenceExpiresAt: new Date(now - 60 * 60 * 1000).toISOString(),
      };
      expect(evaluateCountryOperationalLaunch(asConfigReady(base!), evidence, RELEASE_SCOPE), `${countryCode}:expired`).toEqual({
        launchable: false,
        blockers: ["OPERATIONAL_EVIDENCE_FRESHNESS_NOT_VERIFIED"],
      });
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
