import { describe, expect, it } from "vitest";
import type { HostedLaunchCriticalSnapshotEvidence } from "./hostedLaunchCriticalSnapshotGate";
import {
  evaluateHostedSnapshotFreshness,
  HOSTED_SNAPSHOT_MAX_AGE_MINUTES,
  HOSTED_SNAPSHOT_MAX_FUTURE_SKEW_MINUTES,
} from "./hostedSnapshotFreshnessGate";

const EVALUATED_AT = "2026-09-11T15:50:00Z";

function snapshot(capturedAtUtc: string): HostedLaunchCriticalSnapshotEvidence {
  return {
    evidenceId: "hosted-freshness-test",
    exactHeadSha: "38151cd13a7c9c779aeda14c12eae5541970a42c",
    capturedAtUtc,
    projectRef: "aygawkavujjmybekswrg",
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
    requiredMigrations: {} as HostedLaunchCriticalSnapshotEvidence["requiredMigrations"],
    firstWave: [],
  };
}

describe("Hosted snapshot freshness gate", () => {
  it("accepts recent read-back evidence", () => {
    const result = evaluateHostedSnapshotFreshness(
      snapshot("2026-09-11T15:40:00Z"),
      EVALUATED_AT,
    );

    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.ageMinutes).toBe(10);
  });

  it("fails closed once the Hosted read-back is older than the allowed window", () => {
    const result = evaluateHostedSnapshotFreshness(
      snapshot("2026-09-11T14:49:00Z"),
      EVALUATED_AT,
    );

    expect(HOSTED_SNAPSHOT_MAX_AGE_MINUTES).toBe(60);
    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(["HOSTED_SNAPSHOT_FRESHNESS_STALE"]);
  });

  it("rejects evidence timestamped too far in the future", () => {
    const result = evaluateHostedSnapshotFreshness(
      snapshot("2026-09-11T15:56:00Z"),
      EVALUATED_AT,
    );

    expect(HOSTED_SNAPSHOT_MAX_FUTURE_SKEW_MINUTES).toBe(5);
    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(["HOSTED_SNAPSHOT_FRESHNESS_FROM_FUTURE"]);
  });

  it("fails closed for invalid timestamps and missing evidence", () => {
    expect(evaluateHostedSnapshotFreshness(snapshot("not-a-time"), EVALUATED_AT)).toMatchObject({
      ready: false,
      blockers: ["HOSTED_SNAPSHOT_FRESHNESS_CAPTURE_TIMESTAMP_INVALID"],
    });

    expect(
      evaluateHostedSnapshotFreshness(snapshot("2026-09-11T15:40:00Z"), "not-a-time"),
    ).toMatchObject({
      ready: false,
      blockers: ["HOSTED_SNAPSHOT_FRESHNESS_EVALUATION_TIMESTAMP_INVALID"],
    });

    expect(evaluateHostedSnapshotFreshness(undefined, EVALUATED_AT)).toEqual({
      ready: false,
      blockers: ["HOSTED_SNAPSHOT_FRESHNESS_EVIDENCE_MISSING"],
      ageMinutes: null,
    });
  });
});
