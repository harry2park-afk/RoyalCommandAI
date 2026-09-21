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

export function verifyHostedLedgerTrustBoundary({ driftEvidence, trustedSnapshot }) {
  const observed = driftEvidence?.hosted_migration_ledger ?? {};
  const provenance = driftEvidence?.git_provenance ?? {};
  const fingerprint = driftEvidence?.head_migration_sanitized_fingerprint ?? {};
  const migrationMetadata = driftEvidence?.migration_record_metadata ?? {};
  const safety = driftEvidence?.safety ?? {};

  assert(driftEvidence?.project_ref, "drift evidence project_ref is missing");
  assert(trustedSnapshot?.project_ref === driftEvidence.project_ref, "trusted snapshot project_ref mismatch");
  assert(Number.isInteger(observed.observed_count), "observed Hosted migration count is missing");
  assert(typeof observed.observed_head_version === "string", "observed Hosted head version is missing");
  assert(typeof observed.observed_head_name === "string", "observed Hosted head name is missing");

  assert(fingerprint.version === observed.observed_head_version, "sanitized fingerprint version does not match observed Hosted head");
  assert(fingerprint.name === observed.observed_head_name, "sanitized fingerprint name does not match observed Hosted head");
  assert(Number.isInteger(fingerprint.statement_count) && fingerprint.statement_count > 0, "sanitized fingerprint statement count is invalid");
  assert(/^[0-9a-f]{32}$/i.test(fingerprint.statements_md5 ?? ""), "sanitized fingerprint digest is invalid");
  assert(Number.isInteger(fingerprint.statements_bytes) && fingerprint.statements_bytes > 0, "sanitized fingerprint byte count is invalid");
  assert(fingerprint.exact_sql_copied_to_repository === false, "customer-bearing Hosted SQL must not be copied into the public repository");
  assert(safety.customer_row_values_recorded === false, "drift evidence must not record customer row values");
  assert(migrationMetadata.customer_row_values_recorded === false, "migration metadata evidence must not record customer row values");
  assert(migrationMetadata.created_by_value_recorded === false, "migration metadata evidence must not record raw created_by values");

  if (observed.drift_detected && !observed.trusted_baseline_advanced) {
    throw new Error(
      `unresolved Hosted ledger drift: trusted ${trustedSnapshot.migration_count}/${trustedSnapshot.last_version}, observed ${observed.observed_count}/${observed.observed_head_version}`,
    );
  }

  assert(provenance.status === "RESOLVED", "Hosted head migration provenance is not RESOLVED");
  assert(provenance.fingerprint_version_name_verified === true, "Hosted head fingerprint identity has not been verified");
  assert(ALLOWED_RESOLUTION_METHODS.has(provenance.resolution_method), "Hosted head provenance resolution method is not approved");
  assert(isNonEmptyString(provenance.resolution_evidence_ref), "Hosted head provenance resolution evidence reference is missing");
  assert(isNonEmptyString(provenance.reviewed_by), "Hosted head provenance reviewer identity is missing");
  assert(isOffsetAwareTimestamp(provenance.reviewed_at), "Hosted head provenance review timestamp is missing or invalid");
  assert(observed.trusted_baseline_advanced === true, "Hosted trusted baseline has not been advanced by reviewed evidence");
  assert(trustedSnapshot.migration_count === observed.observed_count, "trusted snapshot migration count does not match observed Hosted ledger");
  assert(trustedSnapshot.last_version === observed.observed_head_version, "trusted snapshot head does not match observed Hosted ledger");
  assert(safety.hosted_mutation_performed === false, "drift evidence must not require Hosted mutation");

  return {
    project_ref: driftEvidence.project_ref,
    trusted_migration_count: trustedSnapshot.migration_count,
    trusted_head_version: trustedSnapshot.last_version,
    provenance_status: provenance.status,
    provenance_resolution_method: provenance.resolution_method,
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
