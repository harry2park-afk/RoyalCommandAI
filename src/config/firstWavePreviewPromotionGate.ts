import type { FirstWaveCountryEvidenceInput } from "./firstWaveCountryOperationalAggregation";
import {
  buildFirstWaveReleaseReadinessReport,
  type FirstWaveReleaseReadinessReport,
} from "./firstWaveReleaseReadinessReport";

export type PreviewVerificationState = "VERIFIED" | "NOT_VERIFIED";

export type FirstWavePreviewPromotionEvidence = {
  exactHeadSha: string;
  evidenceId: string;
  capturedAtUtc: string;
  previewDeploymentId: string;
  authenticatedSmokeTest: PreviewVerificationState;
  localizationBrowserRegression: PreviewVerificationState;
  securityRegression: PreviewVerificationState;
  rollbackVerification: PreviewVerificationState;
};

export type FirstWavePreviewPromotionBlocker =
  | "FIRST_WAVE_RELEASE_NOT_READY"
  | "PREVIEW_EVIDENCE_ID_MISSING"
  | "PREVIEW_EVIDENCE_HEAD_SHA_INVALID"
  | "PREVIEW_EVIDENCE_HEAD_SHA_MISMATCH"
  | "PREVIEW_EVIDENCE_TIMESTAMP_INVALID"
  | "PREVIEW_DEPLOYMENT_ID_MISSING"
  | "PREVIEW_AUTHENTICATED_SMOKE_NOT_VERIFIED"
  | "PREVIEW_LOCALIZATION_REGRESSION_NOT_VERIFIED"
  | "PREVIEW_SECURITY_REGRESSION_NOT_VERIFIED"
  | "PREVIEW_ROLLBACK_NOT_VERIFIED";

export type FirstWavePreviewPromotionDecision = {
  candidateSha: string;
  decision: "READY_FOR_PRODUCTION_REVIEW" | "HOLD";
  safeForProductionReview: boolean;
  releaseReadiness: FirstWaveReleaseReadinessReport;
  blockers: FirstWavePreviewPromotionBlocker[];
};

const EXACT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function isValidUtcTimestamp(value: string): boolean {
  return UTC_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Fail-closed bridge between first-wave country readiness and Preview-first
 * release review.
 *
 * This function never deploys, mutates Hosted state, activates a country, or
 * grants Production approval. It only permits the next human/release-review
 * step when both the existing six-country launch contract and exact-head
 * Preview verification evidence are complete.
 */
export function evaluateFirstWavePreviewPromotion(
  expectedExactHeadSha: string,
  countryInputs: readonly FirstWaveCountryEvidenceInput[],
  previewEvidence: FirstWavePreviewPromotionEvidence,
): FirstWavePreviewPromotionDecision {
  const candidateSha = expectedExactHeadSha.trim();
  const releaseReadiness = buildFirstWaveReleaseReadinessReport(candidateSha, countryInputs);
  const blockers: FirstWavePreviewPromotionBlocker[] = [];

  if (!releaseReadiness.safeToPromote) {
    blockers.push("FIRST_WAVE_RELEASE_NOT_READY");
  }

  if (!previewEvidence.evidenceId.trim()) {
    blockers.push("PREVIEW_EVIDENCE_ID_MISSING");
  }

  const previewHeadSha = previewEvidence.exactHeadSha.trim();
  if (!EXACT_SHA_PATTERN.test(previewHeadSha)) {
    blockers.push("PREVIEW_EVIDENCE_HEAD_SHA_INVALID");
  } else if (previewHeadSha !== candidateSha) {
    blockers.push("PREVIEW_EVIDENCE_HEAD_SHA_MISMATCH");
  }

  if (!isValidUtcTimestamp(previewEvidence.capturedAtUtc.trim())) {
    blockers.push("PREVIEW_EVIDENCE_TIMESTAMP_INVALID");
  }

  if (!previewEvidence.previewDeploymentId.trim()) {
    blockers.push("PREVIEW_DEPLOYMENT_ID_MISSING");
  }

  if (previewEvidence.authenticatedSmokeTest !== "VERIFIED") {
    blockers.push("PREVIEW_AUTHENTICATED_SMOKE_NOT_VERIFIED");
  }

  if (previewEvidence.localizationBrowserRegression !== "VERIFIED") {
    blockers.push("PREVIEW_LOCALIZATION_REGRESSION_NOT_VERIFIED");
  }

  if (previewEvidence.securityRegression !== "VERIFIED") {
    blockers.push("PREVIEW_SECURITY_REGRESSION_NOT_VERIFIED");
  }

  if (previewEvidence.rollbackVerification !== "VERIFIED") {
    blockers.push("PREVIEW_ROLLBACK_NOT_VERIFIED");
  }

  const safeForProductionReview = blockers.length === 0;

  return {
    candidateSha,
    decision: safeForProductionReview ? "READY_FOR_PRODUCTION_REVIEW" : "HOLD",
    safeForProductionReview,
    releaseReadiness,
    blockers,
  };
}
