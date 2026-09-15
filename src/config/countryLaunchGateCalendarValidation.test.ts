import { afterEach, describe, expect, it, vi } from "vitest";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
  type CountryOperationalReleaseScope,
} from "./countryLaunchGate";
import { getCountryConfigByCountryCode } from "./countryResolver";
import type { CountryConfig } from "../types/countryConfig";

const RELEASE_SCOPE: CountryOperationalReleaseScope = {
  releaseCandidateSha: "1111111111111111111111111111111111111111",
  migrationApplySetFingerprint: "migration-set-v1",
  roomFactoryTemplateFingerprint: "room-factory-template-set-v1",
  hostedOperationalDataFingerprint: "hosted-operational-data-v1",
};

function asConfigReady(base: CountryConfig): CountryConfig {
  return {
    ...base,
    compliance: {
      legal: "READY",
      tax: "READY",
      medical: "READY",
      investment: "READY",
      privacy: "READY",
    },
    taxStructure: base.taxStructure ? { ...base.taxStructure, status: "READY" } : undefined,
    payments: { ...base.payments, status: "CONNECTED" },
    tax: { ...base.tax, status: "CONNECTED" },
  };
}

function otherwiseReadyEvidence(): CountryOperationalEvidence {
  return {
    countryCode: "AU",
    environment: "HOSTED_PRODUCTION",
    ...RELEASE_SCOPE,
    operationalEvidenceFreshnessVerified: true,
    operationalEvidenceObservedAt: "2026-03-03T12:00:00Z",
    operationalEvidenceExpiresAt: "2026-03-03T14:00:00Z",
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

afterEach(() => {
  vi.useRealTimers();
});

describe("country launch evidence calendar validation", () => {
  it("fails closed when Date.parse would normalize an impossible observed-at date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-03T13:00:00Z"));

    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();

    const evidence = {
      ...otherwiseReadyEvidence(),
      operationalEvidenceObservedAt: "2026-02-31T12:00:00Z",
    };

    expect(Date.parse(evidence.operationalEvidenceObservedAt)).toBe(Date.parse("2026-03-03T12:00:00Z"));
    expect(evaluateCountryOperationalLaunch(asConfigReady(base!), evidence, RELEASE_SCOPE)).toEqual({
      launchable: false,
      blockers: ["OPERATIONAL_EVIDENCE_FRESHNESS_NOT_VERIFIED"],
    });
  });

  it("accepts the same bounded window when the calendar dates are real", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-03T13:00:00Z"));

    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();

    expect(evaluateCountryOperationalLaunch(asConfigReady(base!), otherwiseReadyEvidence(), RELEASE_SCOPE)).toEqual({
      launchable: true,
      blockers: [],
    });
  });
});
