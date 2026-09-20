import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DRIFT_EVIDENCE = "scripts/supabase-hosted-drift-evidence-20260921.json";
const DEFAULT_TRUSTED_SNAPSHOT = "scripts/supabase-hosted-ledger-snapshot-20260920.json";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function verifyHostedLedgerTrustBoundary({ driftEvidence, trustedSnapshot }) {
  const observed = driftEvidence?.hosted_migration_ledger ?? {};
  const provenance = driftEvidence?.git_provenance ?? {};

  assert(driftEvidence?.project_ref, "drift evidence project_ref is missing");
  assert(trustedSnapshot?.project_ref === driftEvidence.project_ref, "trusted snapshot project_ref mismatch");
  assert(Number.isInteger(observed.observed_count), "observed Hosted migration count is missing");
  assert(typeof observed.observed_head_version === "string", "observed Hosted head version is missing");

  if (observed.drift_detected && !observed.trusted_baseline_advanced) {
    throw new Error(
      `unresolved Hosted ledger drift: trusted ${trustedSnapshot.migration_count}/${trustedSnapshot.last_version}, observed ${observed.observed_count}/${observed.observed_head_version}`,
    );
  }

  assert(provenance.status === "RESOLVED", "Hosted head migration provenance is not RESOLVED");
  assert(observed.trusted_baseline_advanced === true, "Hosted trusted baseline has not been advanced by reviewed evidence");
  assert(trustedSnapshot.migration_count === observed.observed_count, "trusted snapshot migration count does not match observed Hosted ledger");
  assert(trustedSnapshot.last_version === observed.observed_head_version, "trusted snapshot head does not match observed Hosted ledger");
  assert(driftEvidence?.safety?.hosted_mutation_performed === false, "drift evidence must not require Hosted mutation");

  return {
    project_ref: driftEvidence.project_ref,
    trusted_migration_count: trustedSnapshot.migration_count,
    trusted_head_version: trustedSnapshot.last_version,
    provenance_status: provenance.status,
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
