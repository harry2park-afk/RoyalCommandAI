import type { FirstWaveCountryEvidenceInput } from "./firstWaveCountryOperationalAggregation";
import {
  evaluateFirstWavePaymentRuntimeEvidence,
  type FirstWavePaymentRuntimeEvidence,
  type FirstWavePaymentRuntimeEvidenceGate,
} from "./firstWavePaymentRuntimeEvidence";
import {
  evaluateFirstWavePreviewPromotion,
  type FirstWavePreviewPromotionDecision,
  type FirstWavePreviewPromotionEvidence,
} from "./firstWavePreviewPromotionGate";

export type FirstWaveProductionReviewBlocker =
  | "PREVIEW_PROMOTION_NOT_READY"
  | "PAYMENT_RUNTIME_NOT_READY";

export type FirstWaveProductionReviewDecision = {
  candidateSha: string;
  previewDeploymentId: string;
  decision: "READY_FOR_PRODUCTION_REVIEW" | "HOLD";
  safeForProductionReview: boolean;
  blockers: FirstWaveProductionReviewBlocker[];
  previewPromotion: FirstWavePreviewPromotionDecision;
  paymentRuntime: FirstWavePaymentRuntimeEvidenceGate;
};

/**
 * Final fail-closed composition point for first-wave Production review.
 *
 * The existing Preview promotion gate validates country-bound operational,
 * legal/compliance, auth/data-isolation, QA/security, browser and rollback
 * evidence. Payment runtime evidence is deliberately separate because real
 * sandbox payment proof has its own country/currency/provider lifecycle.
 *
 * This wrapper requires both gates to pass for the same exact candidate SHA
 * and the same Preview deployment ID. It never calls a payment provider,
 * deploys code, mutates Hosted Supabase, activates a country, or grants
 * Production deployment approval; it only decides whether the evidence bundle
 * is complete enough to enter human Production review.
 */
export function evaluateFirstWaveProductionReview(
  expectedExactHeadSha: string,
  countryInputs: readonly FirstWaveCountryEvidenceInput[],
  previewEvidence: FirstWavePreviewPromotionEvidence,
  paymentEvidence: readonly FirstWavePaymentRuntimeEvidence[],
): FirstWaveProductionReviewDecision {
  const candidateSha = expectedExactHeadSha.trim();
  const previewDeploymentId = previewEvidence.previewDeploymentId.trim();

  const previewPromotion = evaluateFirstWavePreviewPromotion(
    candidateSha,
    countryInputs,
    previewEvidence,
  );

  const paymentRuntime = evaluateFirstWavePaymentRuntimeEvidence(
    candidateSha,
    previewDeploymentId,
    paymentEvidence,
  );

  const blockers: FirstWaveProductionReviewBlocker[] = [];
  if (!previewPromotion.safeForProductionReview) {
    blockers.push("PREVIEW_PROMOTION_NOT_READY");
  }
  if (!paymentRuntime.ready) {
    blockers.push("PAYMENT_RUNTIME_NOT_READY");
  }

  const safeForProductionReview = blockers.length === 0;

  return {
    candidateSha,
    previewDeploymentId,
    decision: safeForProductionReview ? "READY_FOR_PRODUCTION_REVIEW" : "HOLD",
    safeForProductionReview,
    blockers,
    previewPromotion,
    paymentRuntime,
  };
}
