import { describe, expect, it } from "vitest";
import type { CountryConfig } from "../types/countryConfig";
import { getCountryConfigByCountryCode } from "./countryResolver";
import {
  evaluateCountryOperationalLaunch,
  type CountryOperationalEvidence,
  type CountryOperationalReleaseScope,
} from "./countryLaunchGate";

function configReady(base: CountryConfig): CountryConfig {
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

function completeEvidence(countryCode: string, scope: CountryOperationalReleaseScope): CountryOperationalEvidence {
  return {
    countryCode,
    environment: "HOSTED_PRODUCTION",
    ...scope,
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

describe("country launch release identity binding", () => {
  it("rejects identical placeholder release labels instead of treating them as immutable commit evidence", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const placeholderScope: CountryOperationalReleaseScope = {
      releaseCandidateSha: "release-sha-for-test",
      migrationApplySetFingerprint: "migration-set-v1",
      roomFactoryTemplateFingerprint: "room-factory-template-set-v1",
      hostedOperationalDataFingerprint: "hosted-operational-data-v1",
    };

    expect(
      evaluateCountryOperationalLaunch(
        configReady(base!),
        completeEvidence("AU", placeholderScope),
        placeholderScope,
      ),
    ).toEqual({
      launchable: false,
      blockers: ["OPERATIONAL_EVIDENCE_RELEASE_MISMATCH"],
    });
  });

  it("accepts the release binding only when both sides use the same full Git commit SHA", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const immutableScope: CountryOperationalReleaseScope = {
      releaseCandidateSha: "1111111111111111111111111111111111111111",
      migrationApplySetFingerprint: "migration-set-v1",
      roomFactoryTemplateFingerprint: "room-factory-template-set-v1",
      hostedOperationalDataFingerprint: "hosted-operational-data-v1",
    };

    expect(
      evaluateCountryOperationalLaunch(
        configReady(base!),
        completeEvidence("AU", immutableScope),
        immutableScope,
      ),
    ).toEqual({ launchable: true, blockers: [] });
  });
});
