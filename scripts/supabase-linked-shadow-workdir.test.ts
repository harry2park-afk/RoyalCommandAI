import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildShadowWorkdir, gitBlobSha } from "./supabase-linked-shadow-workdir.mjs";

const roots: string[] = [];

function tempRoot(prefix: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
}

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("Supabase linked shadow migration workdir", () => {
  const snapshotPath = "scripts/supabase-hosted-ledger-snapshot-20260920.json";
  const manifestPath = "scripts/supabase-unresolved-local-migration-classification-20260920.json";
  const canonicalSupabaseDir = "supabase";

  it("mirrors 75 Hosted timestamps and exposes only the eight reviewed candidates", () => {
    const root = tempRoot("rc-shadow-workdir-");
    const shadowRoot = path.join(root, "shadow");
    const snapshot = readJson(snapshotPath);
    const manifest = readJson(manifestPath);

    const report = buildShadowWorkdir({ snapshot, manifest, canonicalSupabaseDir, shadowRoot });
    const migrationDir = path.join(shadowRoot, "supabase", "migrations");
    const files = fs.readdirSync(migrationDir).sort();

    expect(report.ready_for_linked_dry_run).toBe(true);
    expect(report.ready_for_apply).toBe(false);
    expect(report.counts.hosted_history_markers).toBe(75);
    expect(report.counts.exact_reviewed_candidates).toBe(8);
    expect(report.counts.shadow_migrations_total).toBe(83);
    expect(report.counts.canonical_local_only_by_version).toBe(49);
    expect(report.counts.canonical_same_name_timestamp_drift).toBe(35);
    expect(report.counts.canonical_unresolved_local_names).toBe(14);
    expect(report.counts.quarantined_historical_local).toBe(41);
    expect(report.counts.candidates_older_than_hosted_head).toBe(8);
    expect(files).toHaveLength(83);

    const candidateSet = new Set(report.expected_apply_migrations);
    for (const marker of report.hosted_marker_files) {
      expect(candidateSet.has(marker)).toBe(false);
      const text = fs.readFileSync(path.join(migrationDir, marker), "utf8");
      const executable = text
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "" && !line.trim().startsWith("--"));
      expect(executable).toEqual([]);
    }

    for (const candidate of report.candidates) {
      const canonical = fs.readFileSync(path.join(canonicalSupabaseDir, "migrations", candidate.basename));
      const shadow = fs.readFileSync(path.join(migrationDir, candidate.basename));
      expect(shadow.equals(canonical)).toBe(true);
      expect(gitBlobSha(shadow)).toBe(candidate.source_blob_sha);
    }
  });

  it("fails closed when reviewed candidate blob provenance is stale", () => {
    const root = tempRoot("rc-shadow-tamper-");
    const snapshot = readJson(snapshotPath);
    const manifest = readJson(manifestPath);
    const candidate = manifest.entries.find(
      (entry: { classification?: string }) => entry.classification === "NEW_CANDIDATE_EXPECTED_APPLY",
    );
    expect(candidate).toBeTruthy();
    candidate.source_blob_sha = "0".repeat(40);

    expect(() =>
      buildShadowWorkdir({
        snapshot,
        manifest,
        canonicalSupabaseDir,
        shadowRoot: path.join(root, "shadow"),
      }),
    ).toThrow(/candidate Git blob SHA mismatch/);
  });

  it("fails closed if a reviewed candidate timestamp appears in Hosted history", () => {
    const root = tempRoot("rc-shadow-hosted-collision-");
    const snapshot = readJson(snapshotPath);
    const manifest = readJson(manifestPath);
    const basename = manifest.expected_apply_migrations[0] as string;
    const version = basename.slice(0, 14);
    snapshot.migrations.push({ version, name: "unexpected_candidate_already_hosted" });

    expect(() =>
      buildShadowWorkdir({
        snapshot,
        manifest,
        canonicalSupabaseDir,
        shadowRoot: path.join(root, "shadow"),
      }),
    ).toThrow(/candidate version is already present in Hosted history/);
  });
});
