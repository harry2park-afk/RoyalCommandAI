import type { HostedLaunchCriticalSnapshotEvidence } from "./hostedLaunchCriticalSnapshotGate";

export const HOSTED_SNAPSHOT_MAX_AGE_MINUTES = 60;
export const HOSTED_SNAPSHOT_MAX_FUTURE_SKEW_MINUTES = 5;

export type HostedSnapshotFreshnessBlocker =
  | "HOSTED_SNAPSHOT_FRESHNESS_EVIDENCE_MISSING"
  | "HOSTED_SNAPSHOT_FRESHNESS_CAPTURE_TIMESTAMP_INVALID"
  | "HOSTED_SNAPSHOT_FRESHNESS_EVALUATION_TIMESTAMP_INVALID"
  | "HOSTED_SNAPSHOT_FRESHNESS_STALE"
  | "HOSTED_SNAPSHOT_FRESHNESS_FROM_FUTURE";

export type HostedSnapshotFreshnessDecision = {
  ready: boolean;
  blockers: HostedSnapshotFreshnessBlocker[];
  ageMinutes: number | null;
};

function parseTimestamp(value: string): number | null {
  const timestamp = Date.parse(value.trim());
  return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * Prevents a previously valid Hosted read-back from being reused after the
 * underlying Supabase project may have drifted.
 *
 * This is deliberately separate from the structural Hosted snapshot gate: the
 * structural gate proves what was observed, while this gate proves the evidence
 * is still recent enough to be considered for a Production review.
 *
 * Pure decision logic only. No Hosted mutation, deployment, payment call or
 * country activation is performed here.
 */
export function evaluateHostedSnapshotFreshness(
  evidence: HostedLaunchCriticalSnapshotEvidence | null | undefined,
  evaluatedAtUtc = new Date().toISOString(),
  maxAgeMinutes = HOSTED_SNAPSHOT_MAX_AGE_MINUTES,
  maxFutureSkewMinutes = HOSTED_SNAPSHOT_MAX_FUTURE_SKEW_MINUTES,
): HostedSnapshotFreshnessDecision {
  if (!evidence) {
    return {
      ready: false,
      blockers: ["HOSTED_SNAPSHOT_FRESHNESS_EVIDENCE_MISSING"],
      ageMinutes: null,
    };
  }

  const capturedAt = parseTimestamp(evidence.capturedAtUtc);
  if (capturedAt === null) {
    return {
      ready: false,
      blockers: ["HOSTED_SNAPSHOT_FRESHNESS_CAPTURE_TIMESTAMP_INVALID"],
      ageMinutes: null,
    };
  }

  const evaluatedAt = parseTimestamp(evaluatedAtUtc);
  if (evaluatedAt === null) {
    return {
      ready: false,
      blockers: ["HOSTED_SNAPSHOT_FRESHNESS_EVALUATION_TIMESTAMP_INVALID"],
      ageMinutes: null,
    };
  }

  const ageMinutes = (evaluatedAt - capturedAt) / 60_000;
  const blockers: HostedSnapshotFreshnessBlocker[] = [];

  if (ageMinutes > maxAgeMinutes) {
    blockers.push("HOSTED_SNAPSHOT_FRESHNESS_STALE");
  }
  if (ageMinutes < -maxFutureSkewMinutes) {
    blockers.push("HOSTED_SNAPSHOT_FRESHNESS_FROM_FUTURE");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    ageMinutes,
  };
}
