import {
  HOSTED_SNAPSHOT_MAX_AGE_MINUTES,
  HOSTED_SNAPSHOT_MAX_FUTURE_SKEW_MINUTES,
} from "./hostedSnapshotFreshnessGate";
import { ROYAL_COMMAND_HOSTED_PROJECT_REF } from "./hostedLaunchCriticalSnapshotGate";

export const HOSTED_SECURITY_POSTURE_CONTRACT_VERSION = 1;

export const HOSTED_SECURITY_SERVICE_ROLE_ONLY_TABLES = [
  "communication_recording_policies",
  "rc_service_provider_offers",
  "rc_service_providers",
] as const;

export type HostedSecurityServiceRoleOnlyTable =
  (typeof HOSTED_SECURITY_SERVICE_ROLE_ONLY_TABLES)[number];

export type HostedSecurityCatalogEvidenceRow = {
  tableName: string;
  rlsEnabled: boolean;
  anonSelect: boolean;
  anonInsert: boolean;
  anonUpdate: boolean;
  anonDelete: boolean;
  authenticatedSelect: boolean;
  authenticatedInsert: boolean;
  authenticatedUpdate: boolean;
  authenticatedDelete: boolean;
  serviceRoleSelect: boolean;
  clientPolicyExists: boolean;
};

export type HostedSecurityPostureEvidence = {
  contractVersion: number;
  evidenceId: string;
  exactHeadSha: string;
  capturedAtUtc: string;
  projectRef: string;
  serviceRoleOnlyCatalog: readonly HostedSecurityCatalogEvidenceRow[];
  launchCriticalBoundaries: {
    profileRoleClientWriteBlocked: boolean;
    matterAuthorityClientWriteBlocked: boolean;
    roomFactoryManifestClientWriteBlocked: boolean;
  };
  serviceRoleOnlyCatalogReady: boolean;
  launchCriticalClientWriteBoundariesReady: boolean;
  databaseSecurityPostureReady: boolean;
};

export type HostedSecurityPostureBlocker =
  | "HOSTED_SECURITY_POSTURE_MISSING"
  | "HOSTED_SECURITY_POSTURE_CONTRACT_VERSION_MISMATCH"
  | "HOSTED_SECURITY_POSTURE_EVIDENCE_ID_MISSING"
  | "HOSTED_SECURITY_POSTURE_HEAD_SHA_INVALID"
  | "HOSTED_SECURITY_POSTURE_HEAD_SHA_MISMATCH"
  | "HOSTED_SECURITY_POSTURE_TIMESTAMP_INVALID"
  | "HOSTED_SECURITY_POSTURE_EVALUATION_TIMESTAMP_INVALID"
  | "HOSTED_SECURITY_POSTURE_STALE"
  | "HOSTED_SECURITY_POSTURE_FROM_FUTURE"
  | "HOSTED_SECURITY_POSTURE_PROJECT_REF_MISMATCH"
  | "HOSTED_SECURITY_CATALOG_COVERAGE_INCOMPLETE"
  | "HOSTED_SECURITY_CATALOG_DUPLICATE"
  | "HOSTED_SECURITY_CATALOG_UNSUPPORTED"
  | "HOSTED_SECURITY_CATALOG_DEFAULT_DENY_UNSAFE"
  | "HOSTED_SECURITY_CLIENT_WRITE_BOUNDARY_UNSAFE"
  | "HOSTED_SECURITY_POSTURE_AGGREGATE_NOT_READY";

export type HostedSecurityPostureDecision = {
  ready: boolean;
  blockers: HostedSecurityPostureBlocker[];
  ageMinutes: number | null;
};

const EXACT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const EXPECTED_TABLES = new Set<string>(HOSTED_SECURITY_SERVICE_ROLE_ONLY_TABLES);

function pushUnique(
  blockers: HostedSecurityPostureBlocker[],
  blocker: HostedSecurityPostureBlocker,
): void {
  if (!blockers.includes(blocker)) blockers.push(blocker);
}

function isCatalogRowDefaultDeny(row: HostedSecurityCatalogEvidenceRow): boolean {
  return (
    row.rlsEnabled &&
    !row.anonSelect &&
    !row.anonInsert &&
    !row.anonUpdate &&
    !row.anonDelete &&
    !row.authenticatedSelect &&
    !row.authenticatedInsert &&
    !row.authenticatedUpdate &&
    !row.authenticatedDelete &&
    row.serviceRoleSelect &&
    !row.clientPolicyExists
  );
}

/**
 * Machine-bound fail-closed gate for the narrow Hosted database security
 * posture used by the October rollout review.
 *
 * The Supabase advisor may report RLS-enabled/no-policy tables even when those
 * tables are intentionally service-role-only. This gate never treats the
 * advisor label alone as proof of safety: each launch-critical catalog table
 * must independently prove RLS, zero anon/authenticated CRUD authority, service
 * role read authority, and zero client policy. Profile-role, Matter-assignment,
 * and Room Factory manifest write boundaries must also all be blocked.
 *
 * Evidence is bound to the exact candidate SHA, Hosted project and the same
 * one-hour freshness / five-minute future-skew window used by other Hosted
 * evidence. This function performs no SQL, migration, provider call, deploy,
 * country activation, or other side effect.
 */
export function evaluateHostedSecurityPosture(
  expectedExactHeadSha: string,
  evidence: HostedSecurityPostureEvidence | null | undefined,
  evaluatedAtUtc = new Date().toISOString(),
  expectedProjectRef = ROYAL_COMMAND_HOSTED_PROJECT_REF,
): HostedSecurityPostureDecision {
  if (!evidence) {
    return {
      ready: false,
      blockers: ["HOSTED_SECURITY_POSTURE_MISSING"],
      ageMinutes: null,
    };
  }

  const blockers: HostedSecurityPostureBlocker[] = [];
  let ageMinutes: number | null = null;

  if (evidence.contractVersion !== HOSTED_SECURITY_POSTURE_CONTRACT_VERSION) {
    blockers.push("HOSTED_SECURITY_POSTURE_CONTRACT_VERSION_MISMATCH");
  }

  if (!evidence.evidenceId.trim()) {
    blockers.push("HOSTED_SECURITY_POSTURE_EVIDENCE_ID_MISSING");
  }

  const expectedHead = expectedExactHeadSha.trim();
  const evidenceHead = evidence.exactHeadSha.trim();
  if (!EXACT_SHA_PATTERN.test(evidenceHead)) {
    blockers.push("HOSTED_SECURITY_POSTURE_HEAD_SHA_INVALID");
  } else if (
    !EXACT_SHA_PATTERN.test(expectedHead) ||
    evidenceHead.toLowerCase() !== expectedHead.toLowerCase()
  ) {
    blockers.push("HOSTED_SECURITY_POSTURE_HEAD_SHA_MISMATCH");
  }

  if (evidence.projectRef.trim() !== expectedProjectRef.trim()) {
    blockers.push("HOSTED_SECURITY_POSTURE_PROJECT_REF_MISMATCH");
  }

  const capturedAtMs = Date.parse(evidence.capturedAtUtc.trim());
  const evaluatedAtMs = Date.parse(evaluatedAtUtc.trim());
  if (Number.isNaN(capturedAtMs)) {
    blockers.push("HOSTED_SECURITY_POSTURE_TIMESTAMP_INVALID");
  }
  if (Number.isNaN(evaluatedAtMs)) {
    blockers.push("HOSTED_SECURITY_POSTURE_EVALUATION_TIMESTAMP_INVALID");
  }
  if (!Number.isNaN(capturedAtMs) && !Number.isNaN(evaluatedAtMs)) {
    ageMinutes = (evaluatedAtMs - capturedAtMs) / 60_000;
    if (ageMinutes > HOSTED_SNAPSHOT_MAX_AGE_MINUTES) {
      blockers.push("HOSTED_SECURITY_POSTURE_STALE");
    }
    if (ageMinutes < -HOSTED_SNAPSHOT_MAX_FUTURE_SKEW_MINUTES) {
      blockers.push("HOSTED_SECURITY_POSTURE_FROM_FUTURE");
    }
  }

  const observed = new Map<HostedSecurityServiceRoleOnlyTable, HostedSecurityCatalogEvidenceRow>();
  for (const row of evidence.serviceRoleOnlyCatalog) {
    const tableName = row.tableName.trim();
    if (!EXPECTED_TABLES.has(tableName)) {
      pushUnique(blockers, "HOSTED_SECURITY_CATALOG_UNSUPPORTED");
      continue;
    }
    const table = tableName as HostedSecurityServiceRoleOnlyTable;
    if (observed.has(table)) {
      pushUnique(blockers, "HOSTED_SECURITY_CATALOG_DUPLICATE");
      continue;
    }
    observed.set(table, row);
    if (!isCatalogRowDefaultDeny(row)) {
      pushUnique(blockers, "HOSTED_SECURITY_CATALOG_DEFAULT_DENY_UNSAFE");
    }
  }

  if (HOSTED_SECURITY_SERVICE_ROLE_ONLY_TABLES.some((table) => !observed.has(table))) {
    blockers.push("HOSTED_SECURITY_CATALOG_COVERAGE_INCOMPLETE");
  }

  const boundary = evidence.launchCriticalBoundaries;
  if (
    !boundary.profileRoleClientWriteBlocked ||
    !boundary.matterAuthorityClientWriteBlocked ||
    !boundary.roomFactoryManifestClientWriteBlocked
  ) {
    blockers.push("HOSTED_SECURITY_CLIENT_WRITE_BOUNDARY_UNSAFE");
  }

  if (
    !evidence.serviceRoleOnlyCatalogReady ||
    !evidence.launchCriticalClientWriteBoundariesReady ||
    !evidence.databaseSecurityPostureReady
  ) {
    blockers.push("HOSTED_SECURITY_POSTURE_AGGREGATE_NOT_READY");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    ageMinutes,
  };
}
