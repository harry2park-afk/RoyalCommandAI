import { FIRST_WAVE_COUNTRY_CODES, type FirstWaveCountryCode } from "./firstWaveCountryOperationalAggregation";
import type {
  HostedFirstWaveCountrySnapshot,
  HostedLaunchCriticalSnapshotEvidence,
} from "./hostedLaunchCriticalSnapshotGate";

export const HOSTED_SNAPSHOT_CONTRACT_VERSION = 4;

export type HostedProvenanceCountrySnapshot = HostedFirstWaveCountrySnapshot & {
  reviewerProvenTerms: number;
  approvedActiveLocalCurrencyProviderOffers: number;
  reviewerProvenProviderOffers: number;
};

export type HostedSnapshotProvenanceEvidence = Omit<
  HostedLaunchCriticalSnapshotEvidence,
  "operations" | "firstWave"
> & {
  snapshotContractVersion: number;
  operations: HostedLaunchCriticalSnapshotEvidence["operations"] & {
    countryTermsReviewProvenanceColumnsExist: boolean;
    providerOffersReviewerProvenanceColumnsExist: boolean;
    recordingLegalBasisColumnExists: boolean;
  };
  firstWave: readonly HostedProvenanceCountrySnapshot[];
};

export type HostedSnapshotProvenanceBlocker =
  | "HOSTED_SNAPSHOT_PROVENANCE_MISSING"
  | "HOSTED_SNAPSHOT_CONTRACT_VERSION_MISMATCH"
  | "HOSTED_TERMS_REVIEW_PROVENANCE_SCHEMA_NOT_READY"
  | "HOSTED_PROVIDER_REVIEW_PROVENANCE_SCHEMA_NOT_READY"
  | "HOSTED_RECORDING_LEGAL_BASIS_SCHEMA_NOT_READY"
  | "HOSTED_FIRST_WAVE_TERMS_REVIEW_NOT_READY"
  | "HOSTED_FIRST_WAVE_PROVIDER_OFFER_REVIEW_NOT_READY";

export type HostedSnapshotProvenanceDecision = {
  ready: boolean;
  blockers: HostedSnapshotProvenanceBlocker[];
};

function pushUnique(
  blockers: HostedSnapshotProvenanceBlocker[],
  blocker: HostedSnapshotProvenanceBlocker,
): void {
  if (!blockers.includes(blocker)) blockers.push(blocker);
}

/**
 * Fail-closed provenance supplement for the Hosted launch-critical snapshot.
 *
 * The machine snapshot already emits contract version 4 plus reviewer-proven
 * commercial fields. This gate ensures those fields cannot be discarded during
 * normalization before the final Production-review composition runs.
 *
 * This is pure decision logic: it performs no SQL, provider calls, deployment,
 * country activation, or Hosted mutation.
 */
export function evaluateHostedSnapshotProvenance(
  evidence: HostedLaunchCriticalSnapshotEvidence | null | undefined,
): HostedSnapshotProvenanceDecision {
  if (!evidence) {
    return { ready: false, blockers: ["HOSTED_SNAPSHOT_PROVENANCE_MISSING"] };
  }

  const blockers: HostedSnapshotProvenanceBlocker[] = [];
  const extended = evidence as HostedSnapshotProvenanceEvidence;

  if (extended.snapshotContractVersion !== HOSTED_SNAPSHOT_CONTRACT_VERSION) {
    blockers.push("HOSTED_SNAPSHOT_CONTRACT_VERSION_MISMATCH");
  }

  if (extended.operations.countryTermsReviewProvenanceColumnsExist !== true) {
    blockers.push("HOSTED_TERMS_REVIEW_PROVENANCE_SCHEMA_NOT_READY");
  }
  if (extended.operations.providerOffersReviewerProvenanceColumnsExist !== true) {
    blockers.push("HOSTED_PROVIDER_REVIEW_PROVENANCE_SCHEMA_NOT_READY");
  }
  if (extended.operations.recordingLegalBasisColumnExists !== true) {
    blockers.push("HOSTED_RECORDING_LEGAL_BASIS_SCHEMA_NOT_READY");
  }

  const countries = new Map<FirstWaveCountryCode, HostedProvenanceCountrySnapshot>();
  for (const row of extended.firstWave ?? []) {
    const countryCode = row.countryCode.trim().toUpperCase() as FirstWaveCountryCode;
    if ((FIRST_WAVE_COUNTRY_CODES as readonly string[]).includes(countryCode) && !countries.has(countryCode)) {
      countries.set(countryCode, row);
    }
  }

  for (const countryCode of FIRST_WAVE_COUNTRY_CODES) {
    const row = countries.get(countryCode);
    if (!row) continue; // base Hosted gate owns coverage/duplicate/unsupported blockers.

    if (row.reviewerProvenTerms <= 0) {
      pushUnique(blockers, "HOSTED_FIRST_WAVE_TERMS_REVIEW_NOT_READY");
    }
    if (
      row.approvedActiveLocalCurrencyProviderOffers <= 0 ||
      row.reviewerProvenProviderOffers <= 0
    ) {
      pushUnique(blockers, "HOSTED_FIRST_WAVE_PROVIDER_OFFER_REVIEW_NOT_READY");
    }
  }

  return { ready: blockers.length === 0, blockers };
}
