import { describe, expect, it } from "vitest";
import { FIRST_WAVE_COUNTRY_CODES, type FirstWaveCountryCode } from "./firstWaveCountryOperationalAggregation";
import {
  HOSTED_REQUIRED_LAUNCH_MIGRATIONS,
  ROYAL_COMMAND_HOSTED_PROJECT_REF,
} from "./hostedLaunchCriticalSnapshotGate";
import {
  evaluateHostedSnapshotProvenance,
  HOSTED_SNAPSHOT_CONTRACT_VERSION,
  type HostedSnapshotProvenanceEvidence,
} from "./hostedSnapshotProvenanceGate";

const EXACT_HEAD = "38151cd13a7c9c779aeda14c12eae5541970a42c";
const currencies: Record<FirstWaveCountryCode, string> = {
  AU: "AUD",
  US: "USD",
  CA: "CAD",
  KR: "KRW",
  JP: "JPY",
  GB: "GBP",
};

function verifiedEvidence(): HostedSnapshotProvenanceEvidence {
  return {
    snapshotContractVersion: HOSTED_SNAPSHOT_CONTRACT_VERSION,
    evidenceId: "hosted-provenance-001",
    exactHeadSha: EXACT_HEAD,
    capturedAtUtc: "2026-09-11T16:45:00Z",
    projectRef: ROYAL_COMMAND_HOSTED_PROJECT_REF,
    authAndIsolation: {
      profilesRoleUpdateAuthenticated: false,
      profileRoleGuardFunctionExists: true,
      profileRoleGuardTriggerExists: true,
      handleNewUserReadsRoleMetadata: false,
      mattersClientIdUpdateAuthenticated: false,
      mattersAssignedStaffIdUpdateAuthenticated: false,
    },
    roomFactory: {
      privateAtomicExists: true,
      privateAtomicRejectsNullEncounter: false,
      manifestAnonInsert: false,
      manifestAuthenticatedInsert: false,
      manifestAuthenticatedUpdate: false,
      manifestAuthenticatedDelete: false,
    },
    operations: {
      providersActive: 1,
      paymentProviderRegistryExists: true,
      paymentEventLedgerExists: true,
      serviceOrderIdempotencyKeyExists: true,
      countryTermsReviewProvenanceColumnsExist: true,
      providerOffersReviewerProvenanceColumnsExist: true,
      recordingLegalBasisColumnExists: true,
    },
    requiredMigrations: Object.fromEntries(
      HOSTED_REQUIRED_LAUNCH_MIGRATIONS.map((name) => [name, true]),
    ) as HostedSnapshotProvenanceEvidence["requiredMigrations"],
    firstWave: FIRST_WAVE_COUNTRY_CODES.map((countryCode) => ({
      countryCode,
      currency: currencies[countryCode],
      termsRows: 1,
      positiveAvailableLocalPrices: 1,
      providerOffers: 1,
      recordingReviewerProvenApproved: 1,
      reviewerProvenTerms: 1,
      approvedActiveLocalCurrencyProviderOffers: 1,
      reviewerProvenProviderOffers: 1,
    })),
  };
}

describe("Hosted snapshot provenance gate", () => {
  it("accepts the current machine-snapshot contract only when reviewer provenance is preserved", () => {
    const result = evaluateHostedSnapshotProvenance(verifiedEvidence());

    expect(HOSTED_SNAPSHOT_CONTRACT_VERSION).toBe(4);
    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("fails closed for an old contract or missing provenance schema", () => {
    const evidence = verifiedEvidence();
    evidence.snapshotContractVersion = 3;
    evidence.operations.countryTermsReviewProvenanceColumnsExist = false;
    evidence.operations.providerOffersReviewerProvenanceColumnsExist = false;
    evidence.operations.recordingLegalBasisColumnExists = false;

    const result = evaluateHostedSnapshotProvenance(evidence);

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "HOSTED_SNAPSHOT_CONTRACT_VERSION_MISMATCH",
        "HOSTED_TERMS_REVIEW_PROVENANCE_SCHEMA_NOT_READY",
        "HOSTED_PROVIDER_REVIEW_PROVENANCE_SCHEMA_NOT_READY",
        "HOSTED_RECORDING_LEGAL_BASIS_SCHEMA_NOT_READY",
      ]),
    );
  });

  it("does not allow unreviewed terms or provider offers to satisfy Hosted readiness", () => {
    const evidence = verifiedEvidence();
    evidence.firstWave = evidence.firstWave.map((row) =>
      row.countryCode === "US"
        ? {
            ...row,
            reviewerProvenTerms: 0,
            approvedActiveLocalCurrencyProviderOffers: 0,
            reviewerProvenProviderOffers: 0,
          }
        : row,
    );

    const result = evaluateHostedSnapshotProvenance(evidence);

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "HOSTED_FIRST_WAVE_TERMS_REVIEW_NOT_READY",
        "HOSTED_FIRST_WAVE_PROVIDER_OFFER_REVIEW_NOT_READY",
      ]),
    );
  });
});
