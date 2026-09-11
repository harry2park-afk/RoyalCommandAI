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
} from "./firstWavePreviewPromotionGate";

const EXACT_HEAD = "19fd5f8069d9ae2ed4c9d97c0c4f4eda08398501";
const DIFFERENT_VALID_HEAD = "33da2a917dc6adcf266f59f0b27d18a56f1271d8";

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

function verifiedPreviewEvidence(): FirstWavePreviewPromotionEvidence {
  return {
    exactHeadSha: EXACT_HEAD,
    evidenceId: "preview-verification-first-wave",
    capturedAtUtc: "2026-09-11T09:52:00Z",
    previewDeploymentId: "vercel-preview-evidence-only",
    authenticatedSmokeTest: "VERIFIED",
    localizationBrowserRegression: "VERIFIED",
    securityRegression: "VERIFIED",
    rollbackVerification: "VERIFIED",
    countryVerifications: FIRST_WAVE_COUNTRY_CODES.map((countryCode) => ({
      countryCode,
      authenticatedSmokeTest: "VERIFIED",
      localizationBrowserRegression: "VERIFIED",
    })),
  };
}

describe("first-wave Preview-first promotion gate", () => {
  it("does not turn complete Preview evidence into launch approval while country readiness is blocked", () => {
    const result = evaluateFirstWavePreviewPromotion(
      EXACT_HEAD,
      allFirstWaveInputs(),
      verifiedPreviewEvidence(),
    );

    expect(result.releaseReadiness.safeToPromote).toBe(false);
    expect(result.blockers).toContain("FIRST_WAVE_RELEASE_NOT_READY");
    expect(result.countryVerifications.every(({ ready }) => ready)).toBe(true);
    expect(result.safeForProductionReview).toBe(false);
    expect(result.decision).toBe("HOLD");
  });

  it("fails closed when Preview evidence belongs to a different exact head", () => {
    const result = evaluateFirstWavePreviewPromotion(EXACT_HEAD, allFirstWaveInputs(), {
      ...verifiedPreviewEvidence(),
      exactHeadSha: DIFFERENT_VALID_HEAD,
    });

    expect(result.blockers).toContain("PREVIEW_EVIDENCE_HEAD_SHA_MISMATCH");
    expect(result.safeForProductionReview).toBe(false);
  });

  it("keeps missing Preview/runtime/rollback proof visible instead of inferring it", () => {
    const result = evaluateFirstWavePreviewPromotion(EXACT_HEAD, allFirstWaveInputs(), {
      ...verifiedPreviewEvidence(),
      evidenceId: " ",
      capturedAtUtc: "2026-09-11 09:52:00",
      previewDeploymentId: "",
      authenticatedSmokeTest: "NOT_VERIFIED",
      localizationBrowserRegression: "NOT_VERIFIED",
      securityRegression: "NOT_VERIFIED",
      rollbackVerification: "NOT_VERIFIED",
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PREVIEW_EVIDENCE_ID_MISSING",
        "PREVIEW_EVIDENCE_TIMESTAMP_INVALID",
        "PREVIEW_DEPLOYMENT_ID_MISSING",
        "PREVIEW_AUTHENTICATED_SMOKE_NOT_VERIFIED",
        "PREVIEW_LOCALIZATION_REGRESSION_NOT_VERIFIED",
        "PREVIEW_SECURITY_REGRESSION_NOT_VERIFIED",
        "PREVIEW_ROLLBACK_NOT_VERIFIED",
      ]),
    );
    expect(result.safeForProductionReview).toBe(false);
    expect(result.decision).toBe("HOLD");
  });

  it("rejects malformed Preview commit provenance", () => {
    const result = evaluateFirstWavePreviewPromotion(EXACT_HEAD, allFirstWaveInputs(), {
      ...verifiedPreviewEvidence(),
      exactHeadSha: "launch/room-factory-operational-gate-20260907",
    });

    expect(result.blockers).toContain("PREVIEW_EVIDENCE_HEAD_SHA_INVALID");
    expect(result.blockers).not.toContain("PREVIEW_EVIDENCE_HEAD_SHA_MISMATCH");
    expect(result.safeForProductionReview).toBe(false);
  });

  it("requires Preview verification coverage for every first-wave country", () => {
    const evidence = verifiedPreviewEvidence();
    const result = evaluateFirstWavePreviewPromotion(EXACT_HEAD, allFirstWaveInputs(), {
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
    const result = evaluateFirstWavePreviewPromotion(EXACT_HEAD, allFirstWaveInputs(), {
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
    const result = evaluateFirstWavePreviewPromotion(EXACT_HEAD, allFirstWaveInputs(), {
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
