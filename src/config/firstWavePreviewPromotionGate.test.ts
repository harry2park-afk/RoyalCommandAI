import { describe, expect, it } from "vitest";
import type { CountryOperationalEvidenceEnvelope } from "./countryOperationalEvidenceBinding";
import type { CountryOperationalEvidence } from "./countryOperationalLaunchGate";
import {
  FIRST_WAVE_COUNTRY_CODES,
  type FirstWaveCountryEvidenceInput,
} from "./firstWaveCountryOperationalAggregation";
import {
  evaluateFirstWavePreviewPromotion,
  type FirstWavePreviewPromotionEvidence,
  type PreviewBoundVerificationEvidence,
} from "./firstWavePreviewPromotionGate";

const EXACT_HEAD = "19fd5f8069d9ae2ed4c9d97c0c4f4eda08398501";
const DIFFERENT_VALID_HEAD = "33da2a917dc6adcf266f59f0b27d18a56f1271d8";
const PREVIEW_DEPLOYMENT_ID = "vercel-preview-evidence-only";
const EVALUATED_AT = "2026-09-11T10:00:00Z";

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

function envelope(countryCode: string): CountryOperationalEvidenceEnvelope {
  return {
    countryCode,
    exactHeadSha: EXACT_HEAD,
    evidenceId: `preview-promotion-${countryCode.toLowerCase()}`,
    capturedAtUtc: "2026-09-11T09:51:00Z",
  };
}

function allFirstWaveInputs(): FirstWaveCountryEvidenceInput[] {
  return FIRST_WAVE_COUNTRY_CODES.map((countryCode) => ({
    countryCode,
    operationalEvidence: verifiedOperationalEvidence,
    envelope: envelope(countryCode),
  }));
}

function boundEvidence(evidenceId: string): PreviewBoundVerificationEvidence {
  return {
    evidenceId,
    exactHeadSha: EXACT_HEAD,
    capturedAtUtc: "2026-09-11T09:52:30Z",
    previewDeploymentId: PREVIEW_DEPLOYMENT_ID,
    verification: "VERIFIED",
  };
}

function verifiedPreviewEvidence(): FirstWavePreviewPromotionEvidence {
  return {
    exactHeadSha: EXACT_HEAD,
    evidenceId: "preview-verification-first-wave",
    capturedAtUtc: "2026-09-11T09:52:00Z",
    previewDeploymentId: PREVIEW_DEPLOYMENT_ID,
    authenticatedSmokeTest: "VERIFIED",
    localizationBrowserRegression: "VERIFIED",
    securityRegression: "VERIFIED",
    rollbackVerification: "VERIFIED",
    securityRegressionEvidence: boundEvidence("security-regression-first-wave"),
    rollbackEvidence: boundEvidence("rollback-first-wave"),
    countryVerifications: FIRST_WAVE_COUNTRY_CODES.map((countryCode) => ({
      countryCode,
      authenticatedSmokeTest: "VERIFIED",
      localizationBrowserRegression: "VERIFIED",
    })),
  };
}

function evaluatePreview(
  evidence: FirstWavePreviewPromotionEvidence,
  countryInputs = allFirstWaveInputs(),
  evaluatedAtUtc = EVALUATED_AT,
) {
  return evaluateFirstWavePreviewPromotion(EXACT_HEAD, countryInputs, evidence, evaluatedAtUtc);
}

describe("first-wave Preview-first promotion gate", () => {
  it("does not turn complete Preview evidence into launch approval while country readiness is blocked", () => {
    const result = evaluatePreview(verifiedPreviewEvidence());

    expect(result.releaseReadiness.safeToPromote).toBe(false);
    expect(result.blockers).toContain("FIRST_WAVE_RELEASE_NOT_READY");
    expect(result.countryVerifications.every(({ ready }) => ready)).toBe(true);
    expect(result.safeForProductionReview).toBe(false);
    expect(result.decision).toBe("HOLD");
  });

  it("fails closed when Preview evidence belongs to a different exact head", () => {
    const result = evaluatePreview({
      ...verifiedPreviewEvidence(),
      exactHeadSha: DIFFERENT_VALID_HEAD,
    });

    expect(result.blockers).toContain("PREVIEW_EVIDENCE_HEAD_SHA_MISMATCH");
    expect(result.safeForProductionReview).toBe(false);
  });

  it("keeps missing Preview/runtime/rollback proof visible instead of inferring it", () => {
    const result = evaluatePreview({
      ...verifiedPreviewEvidence(),
      evidenceId: " ",
      capturedAtUtc: "2026-09-11 09:52:00",
      previewDeploymentId: "",
      authenticatedSmokeTest: "NOT_VERIFIED",
      localizationBrowserRegression: "NOT_VERIFIED",
      securityRegression: "NOT_VERIFIED",
      rollbackVerification: "NOT_VERIFIED",
      securityRegressionEvidence: null,
      rollbackEvidence: null,
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PREVIEW_EVIDENCE_ID_MISSING",
        "PREVIEW_EVIDENCE_TIMESTAMP_INVALID",
        "PREVIEW_DEPLOYMENT_ID_MISSING",
        "PREVIEW_AUTHENTICATED_SMOKE_NOT_VERIFIED",
        "PREVIEW_LOCALIZATION_REGRESSION_NOT_VERIFIED",
        "PREVIEW_SECURITY_REGRESSION_NOT_VERIFIED",
        "PREVIEW_SECURITY_EVIDENCE_MISSING",
        "PREVIEW_ROLLBACK_NOT_VERIFIED",
        "PREVIEW_ROLLBACK_EVIDENCE_MISSING",
      ]),
    );
    expect(result.safeForProductionReview).toBe(false);
    expect(result.decision).toBe("HOLD");
  });

  it("rejects malformed Preview commit provenance", () => {
    const result = evaluatePreview({
      ...verifiedPreviewEvidence(),
      exactHeadSha: "launch/room-factory-operational-gate-20260907",
    });

    expect(result.blockers).toContain("PREVIEW_EVIDENCE_HEAD_SHA_INVALID");
    expect(result.blockers).not.toContain("PREVIEW_EVIDENCE_HEAD_SHA_MISMATCH");
    expect(result.safeForProductionReview).toBe(false);
  });

  it("requires security proof to belong to the exact candidate and Preview deployment", () => {
    const evidence = verifiedPreviewEvidence();
    const result = evaluatePreview({
      ...evidence,
      securityRegressionEvidence: {
        ...boundEvidence("security-regression-stale"),
        exactHeadSha: DIFFERENT_VALID_HEAD,
        previewDeploymentId: "different-preview-deployment",
      },
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PREVIEW_SECURITY_EVIDENCE_HEAD_SHA_MISMATCH",
        "PREVIEW_SECURITY_EVIDENCE_DEPLOYMENT_ID_MISMATCH",
      ]),
    );
    expect(result.safeForProductionReview).toBe(false);
  });

  it("requires rollback proof to belong to the exact candidate and Preview deployment", () => {
    const result = evaluatePreview({
      ...verifiedPreviewEvidence(),
      rollbackEvidence: {
        ...boundEvidence("rollback-stale"),
        exactHeadSha: DIFFERENT_VALID_HEAD,
        previewDeploymentId: "different-preview-deployment",
      },
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PREVIEW_ROLLBACK_EVIDENCE_HEAD_SHA_MISMATCH",
        "PREVIEW_ROLLBACK_EVIDENCE_DEPLOYMENT_ID_MISMATCH",
      ]),
    );
    expect(result.safeForProductionReview).toBe(false);
  });

  it("does not infer bound security or rollback proof from top-level VERIFIED flags", () => {
    const result = evaluatePreview({
      ...verifiedPreviewEvidence(),
      securityRegressionEvidence: null,
      rollbackEvidence: null,
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PREVIEW_SECURITY_EVIDENCE_MISSING",
        "PREVIEW_ROLLBACK_EVIDENCE_MISSING",
      ]),
    );
    expect(result.safeForProductionReview).toBe(false);
  });

  it("requires valid timestamps and explicit VERIFIED state on bound evidence", () => {
    const result = evaluatePreview({
      ...verifiedPreviewEvidence(),
      securityRegressionEvidence: {
        ...boundEvidence("security-regression-invalid"),
        capturedAtUtc: "2026-09-11 09:52:30",
        verification: "NOT_VERIFIED",
      },
      rollbackEvidence: {
        ...boundEvidence("rollback-invalid"),
        capturedAtUtc: "not-a-timestamp",
        verification: "NOT_VERIFIED",
      },
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PREVIEW_SECURITY_EVIDENCE_TIMESTAMP_INVALID",
        "PREVIEW_SECURITY_EVIDENCE_NOT_VERIFIED",
        "PREVIEW_ROLLBACK_EVIDENCE_TIMESTAMP_INVALID",
        "PREVIEW_ROLLBACK_EVIDENCE_NOT_VERIFIED",
      ]),
    );
    expect(result.safeForProductionReview).toBe(false);
  });

  it("fails closed when top-level Preview evidence is older than one hour", () => {
    const result = evaluatePreview({
      ...verifiedPreviewEvidence(),
      capturedAtUtc: "2026-09-11T08:59:59Z",
    });

    expect(result.blockers).toContain("PREVIEW_EVIDENCE_STALE");
    expect(result.safeForProductionReview).toBe(false);
  });

  it("fails closed when bound security or rollback proof is stale", () => {
    const result = evaluatePreview({
      ...verifiedPreviewEvidence(),
      securityRegressionEvidence: {
        ...boundEvidence("security-regression-too-old"),
        capturedAtUtc: "2026-09-11T08:59:59Z",
      },
      rollbackEvidence: {
        ...boundEvidence("rollback-too-old"),
        capturedAtUtc: "2026-09-11T08:59:59Z",
      },
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PREVIEW_SECURITY_EVIDENCE_STALE",
        "PREVIEW_ROLLBACK_EVIDENCE_STALE",
      ]),
    );
    expect(result.safeForProductionReview).toBe(false);
  });

  it("fails closed when Preview-bound proof is more than five minutes in the future", () => {
    const result = evaluatePreview({
      ...verifiedPreviewEvidence(),
      capturedAtUtc: "2026-09-11T10:05:01Z",
      securityRegressionEvidence: {
        ...boundEvidence("security-regression-future"),
        capturedAtUtc: "2026-09-11T10:05:01Z",
      },
      rollbackEvidence: {
        ...boundEvidence("rollback-future"),
        capturedAtUtc: "2026-09-11T10:05:01Z",
      },
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PREVIEW_EVIDENCE_FROM_FUTURE",
        "PREVIEW_SECURITY_EVIDENCE_FROM_FUTURE",
        "PREVIEW_ROLLBACK_EVIDENCE_FROM_FUTURE",
      ]),
    );
    expect(result.safeForProductionReview).toBe(false);
  });

  it("fails closed when the Preview review clock is invalid", () => {
    const result = evaluatePreview(verifiedPreviewEvidence(), allFirstWaveInputs(), "invalid-clock");

    expect(result.blockers).toContain("PREVIEW_EVALUATION_TIMESTAMP_INVALID");
    expect(result.safeForProductionReview).toBe(false);
  });

  it("requires Preview verification coverage for every first-wave country", () => {
    const evidence = verifiedPreviewEvidence();
    const result = evaluatePreview({
      ...evidence,
      countryVerifications: evidence.countryVerifications.filter(
        ({ countryCode }) => countryCode !== "GB",
      ),
    });

    expect(result.blockers).toContain("PREVIEW_FIRST_WAVE_COUNTRY_COVERAGE_INCOMPLETE");
    expect(result.countryVerifications.find(({ countryCode }) => countryCode === "GB")).toMatchObject({
      evaluated: false,
      ready: false,
    });
    expect(result.safeForProductionReview).toBe(false);
  });

  it("rejects duplicate or unsupported country Preview rows", () => {
    const evidence = verifiedPreviewEvidence();
    const result = evaluatePreview({
      ...evidence,
      countryVerifications: [
        ...evidence.countryVerifications,
        {
          countryCode: "AU",
          authenticatedSmokeTest: "VERIFIED",
          localizationBrowserRegression: "VERIFIED",
        },
        {
          countryCode: "SG",
          authenticatedSmokeTest: "VERIFIED",
          localizationBrowserRegression: "VERIFIED",
        },
      ],
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PREVIEW_FIRST_WAVE_COUNTRY_DUPLICATE",
        "PREVIEW_FIRST_WAVE_COUNTRY_UNSUPPORTED",
      ]),
    );
    expect(result.safeForProductionReview).toBe(false);
  });

  it("does not let one country's Preview pass stand in for another", () => {
    const evidence = verifiedPreviewEvidence();
    const result = evaluatePreview({
      ...evidence,
      countryVerifications: evidence.countryVerifications.map((verification) =>
        verification.countryCode === "KR"
          ? {
              ...verification,
              authenticatedSmokeTest: "NOT_VERIFIED" as const,
              localizationBrowserRegression: "NOT_VERIFIED" as const,
            }
          : verification,
      ),
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PREVIEW_FIRST_WAVE_COUNTRY_AUTHENTICATED_SMOKE_NOT_VERIFIED",
        "PREVIEW_FIRST_WAVE_COUNTRY_LOCALIZATION_REGRESSION_NOT_VERIFIED",
      ]),
    );
    expect(result.countryVerifications.find(({ countryCode }) => countryCode === "KR")).toMatchObject({
      evaluated: true,
      ready: false,
      authenticatedSmokeTest: "NOT_VERIFIED",
      localizationBrowserRegression: "NOT_VERIFIED",
    });
    expect(result.safeForProductionReview).toBe(false);
  });
});
