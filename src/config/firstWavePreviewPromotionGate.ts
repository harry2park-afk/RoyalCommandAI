import {
  FIRST_WAVE_COUNTRY_CODES,
  type FirstWaveCountryCode,
  type FirstWaveCountryEvidenceInput,
} from "./firstWaveCountryOperationalAggregation";
import {
  buildFirstWaveReleaseReadinessReport,
  type FirstWaveReleaseReadinessReport,
} from "./firstWaveReleaseReadinessReport";

export type PreviewVerificationState = "VERIFIED" | "NOT_VERIFIED";

export type FirstWaveCountryPreviewVerification = {
  countryCode: string;
  authenticatedSmokeTest: PreviewVerificationState;
  localizationBrowserRegression: PreviewVerificationState;
};

export type FirstWavePreviewPromotionEvidence = {
  exactHeadSha: string;
  evidenceId: string;
  capturedAtUtc: string;
  previewDeploymentId: string;
  authenticatedSmokeTest: PreviewVerificationState;
  localizationBrowserRegression: PreviewVerificationState;
  securityRegression: PreviewVerificationState;
  rollbackVerification: PreviewVerificationState;
  countryVerifications: readonly FirstWaveCountryPreviewVerification[];
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
  | "PREVIEW_ROLLBACK_NOT_VERIFIED"
  | "PREVIEW_FIRST_WAVE_COUNTRY_COVERAGE_INCOMPLETE"
  | "PREVIEW_FIRST_WAVE_COUNTRY_DUPLICATE"
  | "PREVIEW_FIRST_WAVE_COUNTRY_UNSUPPORTED"
  | "PREVIEW_FIRST_WAVE_COUNTRY_AUTHENTICATED_SMOKE_NOT_VERIFIED"
  | "PREVIEW_FIRST_WAVE_COUNTRY_LOCALIZATION_REGRESSION_NOT_VERIFIED";

export type FirstWavePreviewCountryVerificationRow = {
  countryCode: FirstWaveCountryCode;
  evaluated: boolean;
  authenticatedSmokeTest: PreviewVerificationState;
  localizationBrowserRegression: PreviewVerificationState;
  ready: boolean;
};

export type FirstWavePreviewPromotionDecision = {
  candidateSha: string;
  decision: "READY_FOR_PRODUCTION_REVIEW" | "HOLD";
  safeForProductionReview: boolean;
  releaseReadiness: FirstWaveReleaseReadinessReport;
  countryVerifications: FirstWavePreviewCountryVerificationRow[];
  blockers: FirstWavePreviewPromotionBlocker[];
};

const EXACT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const FIRST_WAVE_COUNTRY_SET = new Set<string>(FIRST_WAVE_COUNTRY_CODES);

function isValidUtcTimestamp(value: string): boolean {
  return UTC_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

function pushUnique(
  blockers: FirstWavePreviewPromotionBlocker[],
  blocker: FirstWavePreviewPromotionBlocker,
): void {
  if (!blockers.includes(blocker)) {
    blockers.push(blocker);
  }
}

/**
 * Fail-closed bridge between first-wave country readiness and Preview-first
 * release review.
 *
 * This function never deploys, mutates Hosted state, activates a country, or
 * grants Production approval. It only permits the next human/release-review
 * step when both the existing six-country launch contract and exact-head
 * Preview verification evidence are complete.
 *
 * Preview evidence is required both globally and per first-wave country. A
 * single successful browser/smoke pass cannot stand in for AU, US, CA, KR, JP
 * and GB independently, and duplicate/unsupported country rows fail closed.
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

  const countryEvidence = new Map<FirstWaveCountryCode, FirstWaveCountryPreviewVerification>();

  for (const verification of previewEvidence.countryVerifications) {
    const countryCode = verification.countryCode.trim().toUpperCase();
    if (!FIRST_WAVE_COUNTRY_SET.has(countryCode)) {
      pushUnique(blockers, "PREVIEW_FIRST_WAVE_COUNTRY_UNSUPPORTED");
      continue;
    }

    const firstWaveCountryCode = countryCode as FirstWaveCountryCode;
    if (countryEvidence.has(firstWaveCountryCode)) {
      pushUnique(blockers, "PREVIEW_FIRST_WAVE_COUNTRY_DUPLICATE");
      continue;
    }

    countryEvidence.set(firstWaveCountryCode, verification);
  }

  const countryVerifications = FIRST_WAVE_COUNTRY_CODES.map((countryCode) => {
    const verification = countryEvidence.get(countryCode);
    if (!verification) {
      pushUnique(blockers, "PREVIEW_FIRST_WAVE_COUNTRY_COVERAGE_INCOMPLETE");
      return {
        countryCode,
        evaluated: false,
        authenticatedSmokeTest: "NOT_VERIFIED" as const,
        localizationBrowserRegression: "NOT_VERIFIED" as const,
        ready: false,
      };
    }

    if (verification.authenticatedSmokeTest !== "VERIFIED") {
      pushUnique(blockers, "PREVIEW_FIRST_WAVE_COUNTRY_AUTHENTICATED_SMOKE_NOT_VERIFIED");
    }

    if (verification.localizationBrowserRegression !== "VERIFIED") {
      pushUnique(blockers, "PREVIEW_FIRST_WAVE_COUNTRY_LOCALIZATION_REGRESSION_NOT_VERIFIED");
    }

    return {
      countryCode,
      evaluated: true,
      authenticatedSmokeTest: verification.authenticatedSmokeTest,
      localizationBrowserRegression: verification.localizationBrowserRegression,
      ready:
        verification.authenticatedSmokeTest === "VERIFIED" &&
        verification.localizationBrowserRegression === "VERIFIED",
    };
  });

  const safeForProductionReview = blockers.length === 0;

  return {
    candidateSha,
    decision: safeForProductionReview ? "READY_FOR_PRODUCTION_REVIEW" : "HOLD",
    safeForProductionReview,
    releaseReadiness,
    countryVerifications,
    blockers,
  };
}
