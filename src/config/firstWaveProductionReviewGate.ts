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
import {
  buildFirstWaveReleaseReadinessReport,
  type FirstWaveReleaseReadinessReport,
} from "./firstWaveReleaseReadinessReport";
import {
  evaluateHostedLaunchCriticalSnapshot,
  type HostedLaunchCriticalSnapshotDecision,
  type HostedLaunchCriticalSnapshotEvidence,
} from "./hostedLaunchCriticalSnapshotGate";
import {
  evaluateHostedSnapshotFreshness,
  type HostedSnapshotFreshnessDecision,
} from "./hostedSnapshotFreshnessGate";
import {
  evaluateHostedSnapshotProvenance,
  type HostedSnapshotProvenanceDecision,
} from "./hostedSnapshotProvenanceGate";

export type FirstWaveProductionReviewBlocker =
  | "PREVIEW_PROMOTION_NOT_READY"
  | "COUNTRY_OPERATIONAL_EVIDENCE_NOT_FRESH"
  | "PAYMENT_RUNTIME_NOT_READY"
  | "HOSTED_CRITICAL_SNAPSHOT_NOT_READY";

export type FirstWaveProductionReviewDecision = {
  candidateSha: string;
  previewDeploymentId: string;
  decision: "READY_FOR_PRODUCTION_REVIEW" | "HOLD";
  safeForProductionReview: boolean;
  blockers: FirstWaveProductionReviewBlocker[];
  previewPromotion: FirstWavePreviewPromotionDecision;
  countryOperationalReadinessAtReviewTime: FirstWaveReleaseReadinessReport;
  paymentRuntime: FirstWavePaymentRuntimeEvidenceGate;
  hostedSnapshot: HostedLaunchCriticalSnapshotDecision;
  hostedSnapshotFreshness: HostedSnapshotFreshnessDecision;
  hostedSnapshotProvenance: HostedSnapshotProvenanceDecision;
};

const COUNTRY_FRESHNESS_BLOCKERS = new Set([
  "COUNTRY_EVIDENCE_EVALUATION_TIME_INVALID",
  "COUNTRY_EVIDENCE_STALE",
  "COUNTRY_EVIDENCE_FROM_FUTURE",
]);

/**
 * Final fail-closed composition point for first-wave Production review.
 *
 * The existing Preview promotion gate validates country-bound operational,
 * legal/compliance, auth/data-isolation, QA/security, browser and rollback
 * evidence. Payment runtime evidence is deliberately separate because real
 * sandbox payment proof has its own country/currency/provider lifecycle.
 * Preview and payment proof are evaluated against the same review clock used
 * for Hosted snapshot freshness so stale exact-SHA/exact-deployment browser,
 * security, rollback or provider-state evidence cannot be reused later.
 *
 * Country operational evidence is re-evaluated against that same explicit
 * review clock. Its provenance envelope is no longer allowed to remain valid
 * indefinitely merely because country/SHA/evidence-id binding is structurally
 * correct: evidence older than one hour, more than five minutes in the future,
 * or evaluated against an invalid review clock fails closed here.
 *
 * A machine-bound Hosted Supabase snapshot is also required so manually marked
 * operational statuses cannot stand in for actual authorization, Room Factory,
 * payment-safeguard, required-migration, and first-wave commercial/recording
 * read-back from the intended Hosted project. The snapshot must also be recent:
 * an older exact-SHA snapshot cannot be reused after Hosted state may have
 * drifted. Its machine contract version and reviewer-proven terms/provider
 * provenance must survive evidence normalization rather than being discarded.
 *
 * This wrapper requires all gates to pass for the same exact candidate SHA and
 * Preview deployment. It never calls a payment provider, deploys code, mutates
 * Hosted Supabase, activates a country, or grants Production deployment
 * approval; it only decides whether the evidence bundle is complete enough to
 * enter human Production review.
 */
export function evaluateFirstWaveProductionReview(
  expectedExactHeadSha: string,
  countryInputs: readonly FirstWaveCountryEvidenceInput[],
  previewEvidence: FirstWavePreviewPromotionEvidence,
  paymentEvidence: readonly FirstWavePaymentRuntimeEvidence[],
  hostedSnapshotEvidence?: HostedLaunchCriticalSnapshotEvidence | null,
  evaluatedAtUtc = new Date().toISOString(),
): FirstWaveProductionReviewDecision {
  const candidateSha = expectedExactHeadSha.trim();
  const previewDeploymentId = previewEvidence.previewDeploymentId.trim();

  const previewPromotion = evaluateFirstWavePreviewPromotion(
    candidateSha,
    countryInputs,
    previewEvidence,
    evaluatedAtUtc,
  );

  const countryOperationalReadinessAtReviewTime = buildFirstWaveReleaseReadinessReport(
    candidateSha,
    countryInputs,
    evaluatedAtUtc,
  );
  const countryOperationalEvidenceFresh = countryOperationalReadinessAtReviewTime.countries.every(
    ({ evidenceBindingBlockers }) =>
      !evidenceBindingBlockers.some((blocker) => COUNTRY_FRESHNESS_BLOCKERS.has(blocker)),
  );

  const paymentRuntime = evaluateFirstWavePaymentRuntimeEvidence(
    candidateSha,
    previewDeploymentId,
    paymentEvidence,
    evaluatedAtUtc,
  );

  const hostedSnapshot = evaluateHostedLaunchCriticalSnapshot(
    candidateSha,
    hostedSnapshotEvidence,
  );
  const hostedSnapshotFreshness = evaluateHostedSnapshotFreshness(
    hostedSnapshotEvidence,
    evaluatedAtUtc,
  );
  const hostedSnapshotProvenance = evaluateHostedSnapshotProvenance(
    hostedSnapshotEvidence,
  );

  const blockers: FirstWaveProductionReviewBlocker[] = [];
  if (!previewPromotion.safeForProductionReview) {
    blockers.push("PREVIEW_PROMOTION_NOT_READY");
  }
  if (!countryOperationalEvidenceFresh) {
    blockers.push("COUNTRY_OPERATIONAL_EVIDENCE_NOT_FRESH");
  }
  if (!paymentRuntime.ready) {
    blockers.push("PAYMENT_RUNTIME_NOT_READY");
  }
  if (
    !hostedSnapshot.ready ||
    !hostedSnapshotFreshness.ready ||
    !hostedSnapshotProvenance.ready
  ) {
    blockers.push("HOSTED_CRITICAL_SNAPSHOT_NOT_READY");
  }

  const safeForProductionReview = blockers.length === 0;

  return {
    candidateSha,
    previewDeploymentId,
    decision: safeForProductionReview ? "READY_FOR_PRODUCTION_REVIEW" : "HOLD",
    safeForProductionReview,
    blockers,
    previewPromotion,
    countryOperationalReadinessAtReviewTime,
    paymentRuntime,
    hostedSnapshot,
    hostedSnapshotFreshness,
    hostedSnapshotProvenance,
  };
}
