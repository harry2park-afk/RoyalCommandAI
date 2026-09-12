import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { reconcileHostedLedger } from "./supabase-hosted-ledger-reconciliation.mjs";
import { classifyUnresolvedLocalMigrations } from "./supabase-unresolved-local-migration-classification.mjs";

const ledgerSnapshotPath = "scripts/supabase-hosted-ledger-snapshot-20260908.json";
const classificationManifestPath =
  "scripts/supabase-unresolved-local-migration-classification-20260908.json";
const migrationDir = "supabase/migrations";

function currentReconciliation() {
  const snapshot = JSON.parse(fs.readFileSync(ledgerSnapshotPath, "utf8"));
  const localMigrationPaths = fs
    .readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => path.join(migrationDir, entry.name));
  return reconcileHostedLedger({ snapshot, localMigrationPaths });
}

describe("unresolved LOCAL-only migration provenance classification", () => {
  it("classifies all seven unresolved local names without authorizing an apply", () => {
    const manifest = JSON.parse(fs.readFileSync(classificationManifestPath, "utf8"));
    const report = classifyUnresolvedLocalMigrations({
      manifest,
      reconciliationReport: currentReconciliation(),
      migrationDir,
    });

    expect(report.classification_complete).toBe(true);
    expect(report.ready_for_apply).toBe(false);
    expect(report.blockers).toEqual([]);
    expect(report.counts).toEqual({
      unresolved_local: 7,
      classified: 7,
      equivalent_historical: 3,
      quarantined_diverged: 3,
      new_candidates: 1,
      blockers: 0,
    });
    expect(report.equivalent_historical).toEqual([
      "20260810065600_passkeys.sql",
      "20260829224000_service_provider_registry.sql",
      "20260830013500_allow_shared_service_scope.sql",
    ]);
    expect(report.quarantined_diverged).toEqual([
      "20260825041500_fix_room_member_insert_rls.sql",
      "20260829190000_global_service_commercial_terms.sql",
      "20260830020500_harden_room_household_insert.sql",
    ]);
    expect(report.new_candidates).toEqual([
      "20260831225500_scope_matter_staff_access.sql",
    ]);
    expect(report.expected_apply_migrations).toEqual([
      "20260831225500_scope_matter_staff_access.sql",
    ]);
  });

  it("fails closed if a captured equivalent fingerprint is tampered", () => {
    const manifest = JSON.parse(fs.readFileSync(classificationManifestPath, "utf8"));
    const tampered = structuredClone(manifest);
    tampered.entries[0].remote[0].diagnostic_sha256 = "0".repeat(64);

    const report = classifyUnresolvedLocalMigrations({
      manifest: tampered,
      reconciliationReport: currentReconciliation(),
      migrationDir,
    });

    expect(report.classification_complete).toBe(false);
    expect(report.ready_for_apply).toBe(false);
    expect(report.blockers).toContain(
      "20260810065600_passkeys.sql no longer matches its captured Hosted diagnostic fingerprint",
    );
  });

  it("fails closed if an unresolved local migration is missing from the manifest", () => {
    const manifest = JSON.parse(fs.readFileSync(classificationManifestPath, "utf8"));
    const incomplete = structuredClone(manifest);
    incomplete.entries = incomplete.entries.slice(1);

    const report = classifyUnresolvedLocalMigrations({
      manifest: incomplete,
      reconciliationReport: currentReconciliation(),
      migrationDir,
    });

    expect(report.classification_complete).toBe(false);
    expect(report.blockers.some((blocker: string) => blocker.includes("classification inventory mismatch"))).toBe(true);
  });
});
