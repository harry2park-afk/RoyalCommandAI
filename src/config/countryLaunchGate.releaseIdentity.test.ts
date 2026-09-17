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

const immutableFingerprints = {
  migrationApplySetFingerprint: "2222222222222222222222222222222222222222222222222222222222222222",
  roomFactoryTemplateFingerprint: "3333333333333333333333333333333333333333333333333333333333333333",
  hostedOperationalDataFingerprint: "4444444444444444444444444444444444444444444444444444444444444444",
} as const;

describe("country launch release identity binding", () => {
  it("rejects identical placeholder release labels instead of treating them as immutable commit evidence", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const placeholderScope: CountryOperationalReleaseScope = {
      releaseCandidateSha: "release-sha-for-test",
      ...immutableFingerprints,
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

  it("rejects matching mutable labels for migration, Room Factory and Hosted-data scope", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const mutableLabelScope: CountryOperationalReleaseScope = {
      releaseCandidateSha: "1111111111111111111111111111111111111111",
      migrationApplySetFingerprint: "migration-set-v1",
      roomFactoryTemplateFingerprint: "room-factory-template-set-v1",
      hostedOperationalDataFingerprint: "hosted-operational-data-v1",
    };

    expect(
      evaluateCountryOperationalLaunch(
        configReady(base!),
        completeEvidence("AU", mutableLabelScope),
        mutableLabelScope,
      ),
    ).toEqual({
      launchable: false,
      blockers: [
        "OPERATIONAL_EVIDENCE_MIGRATION_SCOPE_MISMATCH",
        "OPERATIONAL_EVIDENCE_ROOM_FACTORY_SCOPE_MISMATCH",
        "OPERATIONAL_EVIDENCE_HOSTED_DATA_SCOPE_MISMATCH",
      ],
    });
  });

  it("accepts release authority only when the release is a full Git SHA and all scope fingerprints are SHA-256", () => {
    const base = getCountryConfigByCountryCode("AU");
    expect(base).not.toBeNull();
    const immutableScope: CountryOperationalReleaseScope = {
      releaseCandidateSha: "1111111111111111111111111111111111111111",
      ...immutableFingerprints,
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
