import { describe, expect, it } from "vitest";
import type { CountryOperationalEvidenceEnvelope } from "./countryOperationalEvidenceBinding";
import type { CountryOperationalEvidence } from "./countryOperationalLaunchGate";
import {
  FIRST_WAVE_COUNTRY_CODES,
  type FirstWaveCountryCode,
  type FirstWaveCountryEvidenceInput,
} from "./firstWaveCountryOperationalAggregation";
import type { FirstWavePaymentRuntimeEvidence } from "./firstWavePaymentRuntimeEvidence";
import type {
  FirstWavePreviewPromotionEvidence,
  PreviewBoundVerificationEvidence,
} from "./firstWavePreviewPromotionGate";
import { evaluateFirstWaveProductionReview } from "./firstWaveProductionReviewGate";

const EXACT_HEAD = "7f31f39ff1d3e7e5bca7a4de4a5f10c2ea40ce41";
const PREVIEW_DEPLOYMENT_ID = "vercel-preview-first-wave-production-review";

const currencies: Record<FirstWaveCountryCode, string> = {
  AU: "AUD",
  US: "USD",
  CA: "CAD",
  KR: "KRW",
  JP: "JPY",
  GB: "GBP",
};

const verifiedOperationalEvidence: CountryOperationalEvidence = {
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

function countryEnvelope(countryCode: string): CountryOperationalEvidenceEnvelope {
  return {
    countryCode,
    exactHeadSha: EXACT_HEAD,
    evidenceId: `production-review-${countryCode.toLowerCase()}`,
    capturedAtUtc: "2026-09-11T13:40:00Z",
  };
}

function allFirstWaveCountryInputs(): FirstWaveCountryEvidenceInput[] {
  return FIRST_WAVE_COUNTRY_CODES.map((countryCode) => ({
    countryCode,
    operationalEvidence: verifiedOperationalEvidence,
    envelope: countryEnvelope(countryCode),
  }));
}

function boundPreviewEvidence(evidenceId: string): PreviewBoundVerificationEvidence {
  return {
    evidenceId,
    exactHeadSha: EXACT_HEAD,
    capturedAtUtc: "2026-09-11T13:41:00Z",
    previewDeploymentId: PREVIEW_DEPLOYMENT_ID,
    verification: "VERIFIED",
  };
}

function previewEvidence(): FirstWavePreviewPromotionEvidence {
  return {
    exactHeadSha: EXACT_HEAD,
    evidenceId: "first-wave-preview-production-review",
    capturedAtUtc: "2026-09-11T13:41:30Z",
    previewDeploymentId: PREVIEW_DEPLOYMENT_ID,
    authenticatedSmokeTest: "VERIFIED",
    localizationBrowserRegression: "VERIFIED",
    securityRegression: "VERIFIED",
    rollbackVerification: "VERIFIED",
    securityRegressionEvidence: boundPreviewEvidence("first-wave-security-production-review"),
    rollbackEvidence: boundPreviewEvidence("first-wave-rollback-production-review"),
    countryVerifications: FIRST_WAVE_COUNTRY_CODES.map((countryCode) => ({
      countryCode,
      authenticatedSmokeTest: "VERIFIED",
      localizationBrowserRegression: "VERIFIED",
    })),
  };
}

function paymentEvidence(countryCode: FirstWaveCountryCode): FirstWavePaymentRuntimeEvidence {
  return {
    countryCode,
    currency: currencies[countryCode],
    providerKey: "sandbox-provider",
    environment: "SANDBOX",
    evidenceId: `production-review-payment-${countryCode.toLowerCase()}`,
    exactHeadSha: EXACT_HEAD,
    capturedAtUtc: "2026-09-11T13:42:00Z",
    previewDeploymentId: PREVIEW_DEPLOYMENT_ID,
    checkoutCreated: "VERIFIED",
    paymentSucceeded: "VERIFIED",
    signedWebhookVerified: "VERIFIED",
    duplicateWebhookRejected: "VERIFIED",
    idempotentRetryVerified: "VERIFIED",
    refundVerified: "VERIFIED",
    cancellationVerified: "VERIFIED",
    reconciliationVerified: "VERIFIED",
    liveModeDisabled: true,
  };
}

function allFirstWavePaymentEvidence(): FirstWavePaymentRuntimeEvidence[] {
  return FIRST_WAVE_COUNTRY_CODES.map(paymentEvidence);
}

describe("first-wave Production review gate", () => {
  it("keeps Production review on HOLD while source country readiness is still blocked", () => {
    const result = evaluateFirstWaveProductionReview(
      EXACT_HEAD,
      allFirstWaveCountryInputs(),
      previewEvidence(),
      allFirstWavePaymentEvidence(),
    );

    expect(result.paymentRuntime.ready).toBe(true);
    expect(result.previewPromotion.safeForProductionReview).toBe(false);
    expect(result.hostedSnapshot.blockers).toEqual(["HOSTED_SNAPSHOT_MISSING"]);
    expect(result.blockers).toContain("PREVIEW_PROMOTION_NOT_READY");
    expect(result.blockers).toContain("HOSTED_CRITICAL_SNAPSHOT_NOT_READY");
    expect(result.safeForProductionReview).toBe(false);
    expect(result.decision).toBe("HOLD");
  });

  it("does not allow Preview evidence to stand in for payment runtime proof", () => {
    const payments = allFirstWavePaymentEvidence().filter(({ countryCode }) => countryCode !== "GB");
    const result = evaluateFirstWaveProductionReview(
      EXACT_HEAD,
      allFirstWaveCountryInputs(),
      previewEvidence(),
      payments,
    );

    expect(result.paymentRuntime.aggregationBlockers).toContainEqual({
      code: "PAYMENT_FIRST_WAVE_COUNTRY_MISSING",
      countryCode: "GB",
    });
    expect(result.blockers).toContain("PAYMENT_RUNTIME_NOT_READY");
    expect(result.safeForProductionReview).toBe(false);
  });

  it("binds payment proof to the same Preview deployment used by promotion evidence", () => {
    const payments = allFirstWavePaymentEvidence().map((evidence) =>
      evidence.countryCode === "KR"
        ? { ...evidence, previewDeploymentId: "different-preview-deployment" }
        : evidence,
    );
    const result = evaluateFirstWaveProductionReview(
      EXACT_HEAD,
      allFirstWaveCountryInputs(),
      previewEvidence(),
      payments,
    );
    const kr = result.paymentRuntime.countries.find(({ countryCode }) => countryCode === "KR");

    expect(kr?.blockers).toContain("PAYMENT_PREVIEW_DEPLOYMENT_ID_MISMATCH");
    expect(result.blockers).toContain("PAYMENT_RUNTIME_NOT_READY");
    expect(result.safeForProductionReview).toBe(false);
  });

  it("rejects live-mode payment evidence even when Preview verification is complete", () => {
    const payments = allFirstWavePaymentEvidence().map((evidence) =>
      evidence.countryCode === "US"
        ? { ...evidence, environment: "LIVE" as const, liveModeDisabled: false }
        : evidence,
    );
    const result = evaluateFirstWaveProductionReview(
      EXACT_HEAD,
      allFirstWaveCountryInputs(),
      previewEvidence(),
      payments,
    );
    const us = result.paymentRuntime.countries.find(({ countryCode }) => countryCode === "US");

    expect(us?.blockers).toEqual(
      expect.arrayContaining(["PAYMENT_SANDBOX_REQUIRED", "PAYMENT_LIVE_MODE_NOT_DISABLED"]),
    );
    expect(result.blockers).toContain("PAYMENT_RUNTIME_NOT_READY");
    expect(result.decision).toBe("HOLD");
  });
});
