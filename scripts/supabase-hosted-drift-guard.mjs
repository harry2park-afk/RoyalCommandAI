import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DRIFT_EVIDENCE = "scripts/supabase-hosted-drift-evidence-20260921.json";
const DEFAULT_TRUSTED_SNAPSHOT = "scripts/supabase-hosted-ledger-snapshot-20260920.json";

const ALLOWED_RESOLUTION_METHODS = new Set([
  "APPROVED_PRIVATE_DEPLOYMENT_ARTIFACT",
  "APPROVED_CHANGE_RECORD_WITH_PRIVATE_ARTIFACT",
  "RECONSTRUCTED_SCHEMA_PLUS_PRIVATE_BACKFILL_EVIDENCE",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isOffsetAwareTimestamp(value) {
  if (!isNonEmptyString(value)) return false;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function assertSanitizedFingerprint(fingerprint, label) {
  assert(typeof fingerprint?.version === "string", `${label} version is missing`);
  assert(typeof fingerprint?.name === "string", `${label} name is missing`);
  assert(Number.isInteger(fingerprint.statement_count) && fingerprint.statement_count > 0, `${label} statement count is invalid`);
  assert(/^[0-9a-f]{32}$/i.test(fingerprint.statements_md5 ?? ""), `${label} digest is invalid`);
  assert(Number.isInteger(fingerprint.statements_bytes) && fingerprint.statements_bytes > 0, `${label} byte count is invalid`);
}

function assertPostBlockingSourceEquivalence({ observed, driftEvidence, blockerFingerprint }) {
  const entries = driftEvidence?.post_blocking_migrations ?? [];
  const previousCount = observed.previous_snapshot_count;
  const expectedCount = Number.isInteger(previousCount)
    ? observed.observed_count - previousCount - 1
    : null;

  if (observed.observed_head_version === blockerFingerprint.version) {
    assert(entries.length === 0, "post-blocking migration evidence must be empty when the blocker is the Hosted head");
    return;
  }

  assert(Array.isArray(entries) && entries.length > 0, "post-blocking Hosted migrations are missing repository provenance evidence");
  if (Number.isInteger(expectedCount) && expectedCount >= 0) {
    assert(entries.length === expectedCount, "post-blocking migration evidence count does not reconcile with the Hosted ledger");
  }

  const versions = new Set();
  let priorVersion = blockerFingerprint.version;
  for (const entry of entries) {
    assert(typeof entry?.version === "string" && entry.version > blockerFingerprint.version, "post-blocking migration version is invalid");
    assert(!versions.has(entry.version), "post-blocking migration evidence contains a duplicate version");
    assert(entry.version > priorVersion, "post-blocking migration evidence must be strictly ordered by version");
    versions.add(entry.version);
    priorVersion = entry.version;

    assert(isNonEmptyString(entry.name), "post-blocking migration name is missing");
    assert(entry.exact_path_present_on_source_head === true, `post-blocking migration ${entry.version} source path is not present on the recorded source head`);
    assert(entry.exact_source_equivalent === true, `post-blocking migration ${entry.version} has not been proven source-equivalent`);
    assert(entry.customer_specific_row_values_present === false, `post-blocking migration ${entry.version} must not carry customer-specific row values in public provenance evidence`);
    assert(/^[0-9a-f]{32}$/i.test(entry.hosted_statement_md5 ?? ""), `post-blocking migration ${entry.version} Hosted digest is invalid`);
    assert(/^[0-9a-f]{32}$/i.test(entry.repository_statement_md5 ?? ""), `post-blocking migration ${entry.version} repository digest is invalid`);
    assert(entry.repository_statement_md5 === entry.hosted_statement_md5, `post-blocking migration ${entry.version} repository/Hosted digest mismatch`);
    assert(Number.isInteger(entry.hosted_statement_bytes) && entry.hosted_statement_bytes > 0, `post-blocking migration ${entry.version} Hosted byte count is invalid`);
    assert(entry.repository_statement_bytes === entry.hosted_statement_bytes, `post-blocking migration ${entry.version} repository/Hosted byte count mismatch`);
  }

  const last = entries.at(-1);
  assert(last.version === observed.observed_head_version, "post-blocking provenance does not reach the observed Hosted head version");
  assert(last.name === observed.observed_head_name, "post-blocking provenance does not reach the observed Hosted head name");
}

export function verifyHostedLedgerTrustBoundary({ driftEvidence, trustedSnapshot }) {
  const observed = driftEvidence?.hosted_migration_ledger ?? {};
  const provenance = driftEvidence?.git_provenance ?? {};
  const blockerFingerprint =
    driftEvidence?.blocking_migration_sanitized_fingerprint ?? driftEvidence?.head_migration_sanitized_fingerprint ?? {};
  const migrationMetadata = driftEvidence?.migration_record_metadata ?? {};
  const safety = driftEvidence?.safety ?? {};

  assert(driftEvidence?.project_ref, "drift evidence project_ref is missing");
  assert(trustedSnapshot?.project_ref === driftEvidence.project_ref, "trusted snapshot project_ref mismatch");
  assert(Number.isInteger(observed.observed_count), "observed Hosted migration count is missing");
  assert(typeof observed.observed_head_version === "string", "observed Hosted head version is missing");
  assert(typeof observed.observed_head_name === "string", "observed Hosted head name is missing");

  assertSanitizedFingerprint(blockerFingerprint, "blocking migration sanitized fingerprint");
  if (isNonEmptyString(provenance.blocking_migration_version)) {
    assert(provenance.blocking_migration_version === blockerFingerprint.version, "blocking migration fingerprint version does not match provenance blocker");
  }
  if (isNonEmptyString(provenance.blocking_migration_name)) {
    assert(provenance.blocking_migration_name === blockerFingerprint.name, "blocking migration fingerprint name does not match provenance blocker");
  }
  assert(blockerFingerprint.exact_sql_copied_to_repository === false, "customer-bearing blocking Hosted SQL must not be copied into the public repository");
  assert(safety.customer_row_values_recorded === false, "drift evidence must not record customer row values");
  assert(migrationMetadata.customer_row_values_recorded === false, "migration metadata evidence must not record customer row values");
  assert(migrationMetadata.created_by_value_recorded === false, "migration metadata evidence must not record raw created_by values");

  assertPostBlockingSourceEquivalence({ observed, driftEvidence, blockerFingerprint });

  if (observed.drift_detected && !observed.trusted_baseline_advanced) {
    throw new Error(
      `unresolved Hosted ledger drift: trusted ${trustedSnapshot.migration_count}/${trustedSnapshot.last_version}, observed ${observed.observed_count}/${observed.observed_head_version}; provenance blocker ${blockerFingerprint.version}/${blockerFingerprint.name}`,
    );
  }

  assert(provenance.status === "RESOLVED", "Hosted blocking migration provenance is not RESOLVED");
  assert(provenance.fingerprint_version_name_verified === true, "Hosted blocking migration fingerprint identity has not been verified");
  assert(ALLOWED_RESOLUTION_METHODS.has(provenance.resolution_method), "Hosted blocking migration provenance resolution method is not approved");
  assert(isNonEmptyString(provenance.resolution_evidence_ref), "Hosted blocking migration provenance resolution evidence reference is missing");
  assert(isNonEmptyString(provenance.reviewed_by), "Hosted blocking migration provenance reviewer identity is missing");
  assert(isOffsetAwareTimestamp(provenance.reviewed_at), "Hosted blocking migration provenance review timestamp is missing or invalid");
  assert(observed.trusted_baseline_advanced === true, "Hosted trusted baseline has not been advanced by reviewed evidence");
  assert(trustedSnapshot.migration_count === observed.observed_count, "trusted snapshot migration count does not match observed Hosted ledger");
  assert(trustedSnapshot.last_version === observed.observed_head_version, "trusted snapshot head does not match observed Hosted ledger");
  assert(safety.hosted_mutation_performed === false, "drift evidence must not require Hosted mutation");

  return {
    project_ref: driftEvidence.project_ref,
    trusted_migration_count: trustedSnapshot.migration_count,
    trusted_head_version: trustedSnapshot.last_version,
    provenance_blocker_version: blockerFingerprint.version,
    provenance_status: provenance.status,
    provenance_resolution_method: provenance.resolution_method,
    post_blocking_migrations_verified: (driftEvidence?.post_blocking_migrations ?? []).length,
    ready_for_linked_dry_run: true,
  };
}

function main() {
  try {
    const report = verifyHostedLedgerTrustBoundary({
      driftEvidence: loadJson(process.argv[2] ?? DEFAULT_DRIFT_EVIDENCE),
      trustedSnapshot: loadJson(process.argv[3] ?? DEFAULT_TRUSTED_SNAPSHOT),
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`BLOCKED: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) main();
