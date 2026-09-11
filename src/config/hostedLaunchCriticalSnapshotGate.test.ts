import { describe, expect, it } from "vitest";
import { FIRST_WAVE_COUNTRY_CODES, type FirstWaveCountryCode } from "./firstWaveCountryOperationalAggregation";
import {
  evaluateHostedLaunchCriticalSnapshot,
  HOSTED_REQUIRED_LAUNCH_MIGRATIONS,
  ROYAL_COMMAND_HOSTED_PROJECT_REF,
  type HostedLaunchCriticalSnapshotEvidence,
} from "./hostedLaunchCriticalSnapshotGate";

const EXACT_HEAD = "38151cd13a7c9c779aeda14c12eae5541970a42c";

const currencies: Record<FirstWaveCountryCode, string> = {
  AU: "AUD",
  US: "USD",
  CA: "CAD",
  KR: "KRW",
  JP: "JPY",
  GB: "GBP",
};

function verifiedSnapshot(): HostedLaunchCriticalSnapshotEvidence {
  return {
    evidenceId: "hosted-critical-readback-001",
    exactHeadSha: EXACT_HEAD,
    capturedAtUtc: "2026-09-11T14:55:00Z",
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
    },
    requiredMigrations: Object.fromEntries(
      HOSTED_REQUIRED_LAUNCH_MIGRATIONS.map((name) => [name, true]),
    ) as HostedLaunchCriticalSnapshotEvidence["requiredMigrations"],
    firstWave: FIRST_WAVE_COUNTRY_CODES.map((countryCode) => ({
      countryCode,
      currency: currencies[countryCode],
      termsRows: 1,
      positiveAvailableLocalPrices: 1,
      providerOffers: 1,
      recordingReviewerProvenApproved: 1,
    })),
  };
}

describe("Hosted launch-critical snapshot gate", () => {
  it("accepts only a fully verified exact-head Hosted read-back", () => {
    const result = evaluateHostedLaunchCriticalSnapshot(EXACT_HEAD, verifiedSnapshot());

    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("fails closed for the currently observed unsafe Hosted boundaries", () => {
    const snapshot = verifiedSnapshot();
    snapshot.authAndIsolation = {
      profilesRoleUpdateAuthenticated: true,
      profileRoleGuardFunctionExists: false,
      profileRoleGuardTriggerExists: false,
      handleNewUserReadsRoleMetadata: true,
      mattersClientIdUpdateAuthenticated: true,
      mattersAssignedStaffIdUpdateAuthenticated: true,
    };
    snapshot.roomFactory = {
      privateAtomicExists: true,
      privateAtomicRejectsNullEncounter: true,
      manifestAnonInsert: true,
      manifestAuthenticatedInsert: true,
      manifestAuthenticatedUpdate: true,
      manifestAuthenticatedDelete: true,
    };
    snapshot.operations = {
      providersActive: 0,
      paymentProviderRegistryExists: false,
      paymentEventLedgerExists: false,
      serviceOrderIdempotencyKeyExists: false,
    };
    snapshot.requiredMigrations = Object.fromEntries(
      HOSTED_REQUIRED_LAUNCH_MIGRATIONS.map((name) => [name, false]),
    ) as HostedLaunchCriticalSnapshotEvidence["requiredMigrations"];
    snapshot.firstWave = snapshot.firstWave.map((row) => ({
      ...row,
      termsRows: 0,
      positiveAvailableLocalPrices: 0,
      providerOffers: 0,
      recordingReviewerProvenApproved: 0,
    }));

    const result = evaluateHostedLaunchCriticalSnapshot(EXACT_HEAD, snapshot);

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "HOSTED_PROFILE_ROLE_AUTHORITY_UNSAFE",
        "HOSTED_MATTER_ASSIGNMENT_AUTHORITY_UNSAFE",
        "HOSTED_ROOM_FACTORY_NON_ENCOUNTER_NOT_READY",
        "HOSTED_ROOM_FACTORY_MANIFEST_ACL_UNSAFE",
        "HOSTED_PAYMENT_PROVIDER_NOT_READY",
        "HOSTED_PAYMENT_LEDGER_NOT_READY",
        "HOSTED_PAYMENT_IDEMPOTENCY_NOT_READY",
        "HOSTED_REQUIRED_MIGRATION_MISSING",
        "HOSTED_FIRST_WAVE_TERMS_NOT_READY",
        "HOSTED_FIRST_WAVE_LOCAL_PRICE_NOT_READY",
        "HOSTED_FIRST_WAVE_PROVIDER_OFFER_NOT_READY",
        "HOSTED_FIRST_WAVE_RECORDING_REVIEW_NOT_READY",
      ]),
    );
  });

  it("rejects stale SHA, wrong project, duplicate and incomplete first-wave coverage", () => {
    const snapshot = verifiedSnapshot();
    snapshot.exactHeadSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    snapshot.projectRef = "wrong-project";
    snapshot.firstWave = [snapshot.firstWave[0], snapshot.firstWave[0], ...snapshot.firstWave.slice(1, -1)];

    const result = evaluateHostedLaunchCriticalSnapshot(EXACT_HEAD, snapshot);

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "HOSTED_SNAPSHOT_HEAD_SHA_MISMATCH",
        "HOSTED_SNAPSHOT_PROJECT_REF_MISMATCH",
        "HOSTED_FIRST_WAVE_COUNTRY_DUPLICATE",
        "HOSTED_FIRST_WAVE_COUNTRY_COVERAGE_INCOMPLETE",
      ]),
    );
  });

  it("fails closed when the machine snapshot is omitted", () => {
    expect(evaluateHostedLaunchCriticalSnapshot(EXACT_HEAD, undefined)).toEqual({
      ready: false,
      blockers: ["HOSTED_SNAPSHOT_MISSING"],
    });
  });
});
