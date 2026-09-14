import { describe, expect, it } from "vitest";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
  type CountryOperationalReleaseScope,
} from "./countryLaunchGate";
import { getCountryConfigByCountryCode } from "./countryResolver";
import type { CountryConfig } from "../types/countryConfig";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const NEXT_PRIORITY = ["SG", "CN", "HK", "TW", "IN"] as const;
const ROLLOUT_COUNTRIES = [...FIRST_WAVE, ...NEXT_PRIORITY] as const;

const RELEASE_SCOPE: CountryOperationalReleaseScope = {
  releaseCandidateSha: "1111111111111111111111111111111111111111",
  migrationApplySetFingerprint: "migration-set-v1",
  roomFactoryTemplateFingerprint: "room-factory-template-set-v1",
  hostedOperationalDataFingerprint: "hosted-operational-data-v1",
};

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

function asConfigReady(base: CountryConfig): CountryConfig {
  return {
    ...base,
    compliance: { legal: "READY", tax: "READY", medical: "READY", investment: "READY", privacy: "READY" },
    taxStructure: base.taxStructure ? { ...base.taxStructure, status: "READY" } : undefined,
    payments: { ...base.payments, status: "CONNECTED" },
    tax: { ...base.tax, status: "CONNECTED" },
  };
}

describe("country launch operational evidence timezone boundary", () => {
  it("accepts fresh evidence timestamps with explicit UTC or numeric offsets", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const now = Date.now();
    const evidence = readyOperationalEvidence("AU");

    expect(
      evaluateCountryOperationalLaunch(
        asConfigReady(base!),
        {
          ...evidence,
          operationalEvidenceObservedAt: new Date(now - 60_000).toISOString(),
          operationalEvidenceExpiresAt: new Date(now + 60 * 60 * 1000).toISOString(),
        },
        RELEASE_SCOPE,
      ),
    ).toEqual({ launchable: true, blockers: [] });

    const offsetObserved = new Date(now - 60_000).toISOString().replace("Z", "+00:00");
    const offsetExpires = new Date(now + 60 * 60 * 1000).toISOString().replace("Z", "+00:00");
    expect(
      evaluateCountryOperationalLaunch(
        asConfigReady(base!),
        {
          ...evidence,
          operationalEvidenceObservedAt: offsetObserved,
          operationalEvidenceExpiresAt: offsetExpires,
        },
        RELEASE_SCOPE,
      ),
    ).toEqual({ launchable: true, blockers: [] });
  });

  it("rejects timezone-less evidence timestamps for every first-wave and next-priority country", () => {
    const now = Date.now();
    const observedWithoutTimezone = new Date(now - 60_000).toISOString().replace(/Z$/, "");
    const expiresWithUtc = new Date(now + 60 * 60 * 1000).toISOString();
    const observedWithUtc = new Date(now - 60_000).toISOString();
    const expiresWithoutTimezone = new Date(now + 60 * 60 * 1000).toISOString().replace(/Z$/, "");

    for (const countryCode of ROLLOUT_COUNTRIES) {
      const base = getCountryConfigByCountryCode(countryCode);
      expect(base, countryCode).not.toBeNull();

      for (const [label, timestamps] of [
        [
          "observed-at-no-timezone",
          {
            operationalEvidenceObservedAt: observedWithoutTimezone,
            operationalEvidenceExpiresAt: expiresWithUtc,
          },
        ],
        [
          "expires-at-no-timezone",
          {
            operationalEvidenceObservedAt: observedWithUtc,
            operationalEvidenceExpiresAt: expiresWithoutTimezone,
          },
        ],
      ] as const) {
        expect(
          evaluateCountryOperationalLaunch(
            asConfigReady(base!),
            { ...readyOperationalEvidence(countryCode), ...timestamps },
            RELEASE_SCOPE,
          ),
          `${countryCode}:${label}`,
        ).toEqual({ launchable: false, blockers: ["OPERATIONAL_EVIDENCE_FRESHNESS_NOT_VERIFIED"] });
      }
    }
  });
});
