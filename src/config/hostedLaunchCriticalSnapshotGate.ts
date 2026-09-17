import { FIRST_WAVE_COUNTRY_CODES, type FirstWaveCountryCode } from "./firstWaveCountryOperationalAggregation";

export const ROYAL_COMMAND_HOSTED_PROJECT_REF = "aygawkavujjmybekswrg";

export const HOSTED_REQUIRED_LAUNCH_MIGRATIONS = [
  "scope_matter_staff_access",
  "room_factory_atomic_non_encounter",
  "room_factory_manifest_atomic_only",
  "harden_profile_role_authority",
  "country_compliance_evidence_registry",
  "harden_commercial_review_provenance",
  "payment_operational_safeguards",
  "harden_incident_event_client_boundary",
] as const;

export type HostedRequiredLaunchMigration = (typeof HOSTED_REQUIRED_LAUNCH_MIGRATIONS)[number];

export type HostedFirstWaveCountrySnapshot = {
  countryCode: string;
  currency: string;
  termsRows: number;
  positiveAvailableLocalPrices: number;
  providerOffers: number;
  recordingReviewerProvenApproved: number;
};

export type HostedLaunchCriticalSnapshotEvidence = {
  evidenceId: string;
  exactHeadSha: string;
  capturedAtUtc: string;
  projectRef: string;
  authAndIsolation: {
    profilesRoleUpdateAuthenticated: boolean;
    profileRoleGuardFunctionExists: boolean;
    profileRoleGuardTriggerExists: boolean;
    handleNewUserReadsRoleMetadata: boolean;
    mattersClientIdUpdateAuthenticated: boolean;
    mattersAssignedStaffIdUpdateAuthenticated: boolean;
  };
  roomFactory: {
    privateAtomicExists: boolean;
    privateAtomicRejectsNullEncounter: boolean;
    manifestAnonInsert: boolean;
    manifestAuthenticatedInsert: boolean;
    manifestAuthenticatedUpdate: boolean;
    manifestAuthenticatedDelete: boolean;
  };
  operations: {
    providersActive: number;
    paymentProviderRegistryExists: boolean;
    paymentEventLedgerExists: boolean;
    serviceOrderIdempotencyKeyExists: boolean;
  };
  requiredMigrations: Record<HostedRequiredLaunchMigration, boolean>;
  firstWave: readonly HostedFirstWaveCountrySnapshot[];
};

export type HostedLaunchCriticalSnapshotBlocker =
  | "HOSTED_SNAPSHOT_MISSING"
  | "HOSTED_SNAPSHOT_EVIDENCE_ID_MISSING"
  | "HOSTED_SNAPSHOT_HEAD_SHA_INVALID"
  | "HOSTED_SNAPSHOT_HEAD_SHA_MISMATCH"
  | "HOSTED_SNAPSHOT_TIMESTAMP_INVALID"
  | "HOSTED_SNAPSHOT_PROJECT_REF_MISMATCH"
  | "HOSTED_PROFILE_ROLE_AUTHORITY_UNSAFE"
  | "HOSTED_MATTER_ASSIGNMENT_AUTHORITY_UNSAFE"
  | "HOSTED_ROOM_FACTORY_NON_ENCOUNTER_NOT_READY"
  | "HOSTED_ROOM_FACTORY_MANIFEST_ACL_UNSAFE"
  | "HOSTED_PAYMENT_PROVIDER_NOT_READY"
  | "HOSTED_PAYMENT_LEDGER_NOT_READY"
  | "HOSTED_PAYMENT_IDEMPOTENCY_NOT_READY"
  | "HOSTED_REQUIRED_MIGRATION_MISSING"
  | "HOSTED_FIRST_WAVE_COUNTRY_COVERAGE_INCOMPLETE"
  | "HOSTED_FIRST_WAVE_COUNTRY_DUPLICATE"
  | "HOSTED_FIRST_WAVE_COUNTRY_UNSUPPORTED"
  | "HOSTED_FIRST_WAVE_COUNTRY_CURRENCY_MISMATCH"
  | "HOSTED_FIRST_WAVE_TERMS_NOT_READY"
  | "HOSTED_FIRST_WAVE_LOCAL_PRICE_NOT_READY"
  | "HOSTED_FIRST_WAVE_PROVIDER_OFFER_NOT_READY"
  | "HOSTED_FIRST_WAVE_RECORDING_REVIEW_NOT_READY";

export type HostedLaunchCriticalSnapshotDecision = {
  ready: boolean;
  blockers: HostedLaunchCriticalSnapshotBlocker[];
};

const EXACT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const FIRST_WAVE_COUNTRY_SET = new Set<string>(FIRST_WAVE_COUNTRY_CODES);
const FIRST_WAVE_CURRENCIES: Record<FirstWaveCountryCode, string> = {
  AU: "AUD",
  US: "USD",
  CA: "CAD",
  KR: "KRW",
  JP: "JPY",
  GB: "GBP",
};

function pushUnique(
  blockers: HostedLaunchCriticalSnapshotBlocker[],
  blocker: HostedLaunchCriticalSnapshotBlocker,
): void {
  if (!blockers.includes(blocker)) blockers.push(blocker);
}

function validUtcTimestamp(value: string): boolean {
  return UTC_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Fail-closed machine-evidence gate for launch-critical Hosted Supabase state.
 *
 * Country/operator status strings cannot substitute for this read-back. The
 * snapshot must be bound to the exact candidate SHA and expected Hosted project,
 * and must prove the authorization, Room Factory, payment safeguard, required
 * migration, and first-wave commercial/recording boundaries needed before a
 * Production review may be considered.
 *
 * This function is pure decision logic. It does not execute SQL, mutate Hosted
 * state, apply migrations, call payment providers, activate countries, or deploy.
 */
export function evaluateHostedLaunchCriticalSnapshot(
  expectedExactHeadSha: string,
  evidence: HostedLaunchCriticalSnapshotEvidence | null | undefined,
  expectedProjectRef = ROYAL_COMMAND_HOSTED_PROJECT_REF,
): HostedLaunchCriticalSnapshotDecision {
  const blockers: HostedLaunchCriticalSnapshotBlocker[] = [];
  const expectedHead = expectedExactHeadSha.trim();

  if (!evidence) {
    return { ready: false, blockers: ["HOSTED_SNAPSHOT_MISSING"] };
  }

  if (!evidence.evidenceId.trim()) {
    blockers.push("HOSTED_SNAPSHOT_EVIDENCE_ID_MISSING");
  }

  const evidenceHead = evidence.exactHeadSha.trim();
  if (!EXACT_SHA_PATTERN.test(evidenceHead)) {
    blockers.push("HOSTED_SNAPSHOT_HEAD_SHA_INVALID");
  } else if (!EXACT_SHA_PATTERN.test(expectedHead) || evidenceHead.toLowerCase() !== expectedHead.toLowerCase()) {
    blockers.push("HOSTED_SNAPSHOT_HEAD_SHA_MISMATCH");
  }

  if (!validUtcTimestamp(evidence.capturedAtUtc.trim())) {
    blockers.push("HOSTED_SNAPSHOT_TIMESTAMP_INVALID");
  }

  if (evidence.projectRef.trim() !== expectedProjectRef.trim()) {
    blockers.push("HOSTED_SNAPSHOT_PROJECT_REF_MISMATCH");
  }

  const auth = evidence.authAndIsolation;
  if (
    auth.profilesRoleUpdateAuthenticated ||
    !auth.profileRoleGuardFunctionExists ||
    !auth.profileRoleGuardTriggerExists ||
    auth.handleNewUserReadsRoleMetadata
  ) {
    blockers.push("HOSTED_PROFILE_ROLE_AUTHORITY_UNSAFE");
  }

  if (auth.mattersClientIdUpdateAuthenticated || auth.mattersAssignedStaffIdUpdateAuthenticated) {
    blockers.push("HOSTED_MATTER_ASSIGNMENT_AUTHORITY_UNSAFE");
  }

  const roomFactory = evidence.roomFactory;
  if (!roomFactory.privateAtomicExists || roomFactory.privateAtomicRejectsNullEncounter) {
    blockers.push("HOSTED_ROOM_FACTORY_NON_ENCOUNTER_NOT_READY");
  }
  if (
    roomFactory.manifestAnonInsert ||
    roomFactory.manifestAuthenticatedInsert ||
    roomFactory.manifestAuthenticatedUpdate ||
    roomFactory.manifestAuthenticatedDelete
  ) {
    blockers.push("HOSTED_ROOM_FACTORY_MANIFEST_ACL_UNSAFE");
  }

  if (evidence.operations.providersActive <= 0) {
    blockers.push("HOSTED_PAYMENT_PROVIDER_NOT_READY");
  }
  if (!evidence.operations.paymentProviderRegistryExists) {
    pushUnique(blockers, "HOSTED_PAYMENT_PROVIDER_NOT_READY");
  }
  if (!evidence.operations.paymentEventLedgerExists) {
    blockers.push("HOSTED_PAYMENT_LEDGER_NOT_READY");
  }
  if (!evidence.operations.serviceOrderIdempotencyKeyExists) {
    blockers.push("HOSTED_PAYMENT_IDEMPOTENCY_NOT_READY");
  }

  if (HOSTED_REQUIRED_LAUNCH_MIGRATIONS.some((name) => evidence.requiredMigrations[name] !== true)) {
    blockers.push("HOSTED_REQUIRED_MIGRATION_MISSING");
  }

  const countries = new Map<FirstWaveCountryCode, HostedFirstWaveCountrySnapshot>();
  for (const row of evidence.firstWave) {
    const countryCode = row.countryCode.trim().toUpperCase();
    if (!FIRST_WAVE_COUNTRY_SET.has(countryCode)) {
      pushUnique(blockers, "HOSTED_FIRST_WAVE_COUNTRY_UNSUPPORTED");
      continue;
    }
    const code = countryCode as FirstWaveCountryCode;
    if (countries.has(code)) {
      pushUnique(blockers, "HOSTED_FIRST_WAVE_COUNTRY_DUPLICATE");
      continue;
    }
    countries.set(code, row);
  }

  for (const countryCode of FIRST_WAVE_COUNTRY_CODES) {
    const row = countries.get(countryCode);
    if (!row) {
      pushUnique(blockers, "HOSTED_FIRST_WAVE_COUNTRY_COVERAGE_INCOMPLETE");
      continue;
    }
    if (row.currency.trim().toUpperCase() !== FIRST_WAVE_CURRENCIES[countryCode]) {
      pushUnique(blockers, "HOSTED_FIRST_WAVE_COUNTRY_CURRENCY_MISMATCH");
    }
    if (row.termsRows <= 0) pushUnique(blockers, "HOSTED_FIRST_WAVE_TERMS_NOT_READY");
    if (row.positiveAvailableLocalPrices <= 0) {
      pushUnique(blockers, "HOSTED_FIRST_WAVE_LOCAL_PRICE_NOT_READY");
    }
    if (row.providerOffers <= 0) {
      pushUnique(blockers, "HOSTED_FIRST_WAVE_PROVIDER_OFFER_NOT_READY");
    }
    if (row.recordingReviewerProvenApproved <= 0) {
      pushUnique(blockers, "HOSTED_FIRST_WAVE_RECORDING_REVIEW_NOT_READY");
    }
  }

  return { ready: blockers.length === 0, blockers };
}
