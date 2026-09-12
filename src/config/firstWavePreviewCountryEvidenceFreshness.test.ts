import { describe, expect, it } from "vitest";
import type { CountryOperationalEvidence } from "./countryOperationalLaunchGate";
import { FIRST_WAVE_COUNTRY_CODES } from "./firstWaveCountryOperationalAggregation";
import { evaluateFirstWavePreviewPromotion } from "./firstWavePreviewPromotionGate";

const EXACT_HEAD = "19fd5f8069d9ae2ed4c9d97c0c4f4eda08398501";
const PREVIEW_DEPLOYMENT_ID = "preview-country-freshness-regression";
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

describe("Preview country operational evidence freshness", () => {
  it("fails closed inside Preview review when country evidence is stale", () => {
    const countryInputs = FIRST_WAVE_COUNTRY_CODES.map((countryCode) => ({
      countryCode,
      operationalEvidence: verifiedOperationalEvidence,
      envelope: {
        countryCode,
        exactHeadSha: EXACT_HEAD,
        evidenceId: `stale-preview-${countryCode.toLowerCase()}`,
        capturedAtUtc: "2026-09-11T08:59:59Z",
      },
    }));

    const result = evaluateFirstWavePreviewPromotion(
      EXACT_HEAD,
      countryInputs,
      {
        exactHeadSha: EXACT_HEAD,
        evidenceId: "fresh-preview-evidence",
        capturedAtUtc: "2026-09-11T09:59:00Z",
        previewDeploymentId: PREVIEW_DEPLOYMENT_ID,
        authenticatedSmokeTest: "VERIFIED",
        localizationBrowserRegression: "VERIFIED",
        securityRegression: "VERIFIED",
        rollbackVerification: "VERIFIED",
        securityRegressionEvidence: {
          evidenceId: "fresh-security-evidence",
          exactHeadSha: EXACT_HEAD,
          capturedAtUtc: "2026-09-11T09:59:00Z",
          previewDeploymentId: PREVIEW_DEPLOYMENT_ID,
          verification: "VERIFIED",
        },
        rollbackEvidence: {
          evidenceId: "fresh-rollback-evidence",
          exactHeadSha: EXACT_HEAD,
          capturedAtUtc: "2026-09-11T09:59:00Z",
          previewDeploymentId: PREVIEW_DEPLOYMENT_ID,
          verification: "VERIFIED",
        },
        countryVerifications: FIRST_WAVE_COUNTRY_CODES.map((countryCode) => ({
          countryCode,
          authenticatedSmokeTest: "VERIFIED" as const,
          localizationBrowserRegression: "VERIFIED" as const,
        })),
      },
      EVALUATED_AT,
    );

    expect(result.blockers).toContain("FIRST_WAVE_RELEASE_NOT_READY");
    expect(result.safeForProductionReview).toBe(false);

    for (const country of result.releaseReadiness.countries) {
      expect(country.evidenceBindingBlockers).toContain("COUNTRY_EVIDENCE_STALE");
    }
  });
});
