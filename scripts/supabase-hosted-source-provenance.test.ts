import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  compareHostedSourceFingerprints,
  normalizeMigrationSource,
  sha256MigrationSource,
} from "./supabase-hosted-source-provenance.mjs";

const snapshotPath = "scripts/supabase-hosted-source-fingerprints-20260908.json";
const migrationDir = "supabase/migrations";

function loadCurrentEvidence() {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const localMigrations = fs
    .readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => ({
      basename: entry.name,
      source: fs.readFileSync(path.join(migrationDir, entry.name), "utf8"),
    }));
  return compareHostedSourceFingerprints({ snapshot, localMigrations });
}

describe("Hosted migration source provenance", () => {
  it("normalizes line endings and boundary whitespace without changing SQL content", () => {
    expect(normalizeMigrationSource("\r\n  select 1;\r\n\r\n")).toBe("select 1;");
    expect(sha256MigrationSource("select 1;\n")).toBe(
      sha256MigrationSource("\r\nselect 1;\r\n"),
    );
  });

  it("distinguishes timestamp drift from source-content drift", () => {
    const source = "create table public.example(id bigint);";
    const snapshot = {
      captured_at: "synthetic",
      project_ref: "test",
      migrations: [
        {
          version: "20260902000000",
          name: "same_source_new_timestamp",
          source_sha256: sha256MigrationSource(source),
        },
        {
          version: "20260903000000",
          name: "different_source",
          source_sha256: sha256MigrationSource("select 2;"),
        },
      ],
    };

    const report = compareHostedSourceFingerprints({
      snapshot,
      localMigrations: [
        {
          basename: "20260901000000_same_source_new_timestamp.sql",
          source,
        },
        {
          basename: "20260903000000_different_source.sql",
          source: "select 1;",
        },
      ],
    });

    expect(report.checked.map((row) => [row.name, row.timestamp_drift, row.source_status])).toEqual([
      ["different_source", false, "MISMATCH"],
      ["same_source_new_timestamp", true, "MATCH"],
    ]);
    expect(report.ready_for_provenance_reconciliation).toBe(false);
    expect(report.ready_for_apply).toBe(false);
  });

  it("resolves every captured same-name Hosted fingerprint against the current checkout without treating it as apply approval", () => {
    const report = loadCurrentEvidence();

    console.info("HOSTED_SOURCE_PROVENANCE", JSON.stringify(report));
    expect(report.counts.fingerprinted_remote).toBe(4);
    expect(report.counts.checked).toBe(4);
    expect(report.missing_local_names).toEqual([]);
    expect(report.duplicate_local_names).toEqual([]);
    expect(report.checked.every((row) => row.timestamp_drift)).toBe(true);
    expect(report.checked.every((row) => ["MATCH", "MISMATCH"].includes(row.source_status))).toBe(true);
    expect(report.ready_for_apply).toBe(false);
  });
});
