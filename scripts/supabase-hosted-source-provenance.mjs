import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SNAPSHOT = "scripts/supabase-hosted-source-fingerprints-20260908.json";
const DEFAULT_MIGRATION_DIR = "supabase/migrations";

export function normalizeMigrationSource(source) {
  return source.replace(/\r\n?/g, "\n").trim();
}

export function diagnosticNormalizeMigrationSource(source) {
  return normalizeMigrationSource(source)
    .split("\n")
    .filter((line) => line.trim() !== "" && !/^\s*--/.test(line))
    .join("\n")
    .trim();
}

function sha256Text(source) {
  return crypto.createHash("sha256").update(source, "utf8").digest("hex");
}

export function sha256MigrationSource(source) {
  return sha256Text(normalizeMigrationSource(source));
}

export function sha256DiagnosticMigrationSource(source) {
  return sha256Text(diagnosticNormalizeMigrationSource(source));
}

function parseLocalMigrationBasename(basename) {
  const match = /^(\d{14})_(.+)\.sql$/.exec(basename);
  if (!match) return null;
  return { version: match[1], name: match[2], basename };
}

export function compareHostedSourceFingerprints({ snapshot, localMigrations }) {
  const localByName = new Map();

  for (const migration of localMigrations) {
    const parsed = parseLocalMigrationBasename(migration.basename);
    if (!parsed) continue;
    const rows = localByName.get(parsed.name) ?? [];
    rows.push({ ...parsed, source: migration.source });
    localByName.set(parsed.name, rows);
  }

  const checked = [];
  const missing_local_names = [];
  const duplicate_local_names = [];

  for (const remote of snapshot.migrations ?? []) {
    const localRows = localByName.get(remote.name) ?? [];

    if (localRows.length === 0) {
      missing_local_names.push(remote.name);
      continue;
    }

    if (localRows.length > 1) {
      duplicate_local_names.push({
        name: remote.name,
        local_basenames: localRows.map((row) => row.basename).sort(),
      });
      continue;
    }

    const local = localRows[0];
    const localSha256 = sha256MigrationSource(local.source);
    const localDiagnosticSha256 = sha256DiagnosticMigrationSource(local.source);
    const sourceStatus = localSha256 === remote.source_sha256 ? "MATCH" : "MISMATCH";
    const diagnosticStatus =
      localDiagnosticSha256 === remote.diagnostic_nonblank_noncomment_sha256 ? "MATCH" : "MISMATCH";

    checked.push({
      name: remote.name,
      remote_version: remote.version,
      local_version: local.version,
      local_basename: local.basename,
      timestamp_drift: remote.version !== local.version,
      remote_source_sha256: remote.source_sha256,
      local_source_sha256: localSha256,
      source_status: sourceStatus,
      remote_diagnostic_nonblank_noncomment_sha256:
        remote.diagnostic_nonblank_noncomment_sha256 ?? null,
      local_diagnostic_nonblank_noncomment_sha256: localDiagnosticSha256,
      diagnostic_nonblank_noncomment_status: diagnosticStatus,
      diagnostic_difference_scope:
        sourceStatus === "MISMATCH" && diagnosticStatus === "MATCH"
          ? "FULL_LINE_COMMENTS_OR_BLANK_LINES_ONLY"
          : sourceStatus,
    });
  }

  checked.sort((a, b) => a.name.localeCompare(b.name));
  missing_local_names.sort();
  duplicate_local_names.sort((a, b) => a.name.localeCompare(b.name));

  const source_match_count = checked.filter((row) => row.source_status === "MATCH").length;
  const source_mismatch_count = checked.filter((row) => row.source_status === "MISMATCH").length;
  const comment_or_blank_only_count = checked.filter(
    (row) => row.diagnostic_difference_scope === "FULL_LINE_COMMENTS_OR_BLANK_LINES_ONLY",
  ).length;
  const ready_for_provenance_reconciliation =
    source_mismatch_count === 0 &&
    missing_local_names.length === 0 &&
    duplicate_local_names.length === 0 &&
    checked.length === (snapshot.migrations ?? []).length;

  return {
    contract_version: 1,
    evidence_scope:
      "Migration source provenance only. Diagnostic hashes may narrow raw source drift to full-line comments/blank lines but do not make a raw MISMATCH pass and do not authorize migration repair, push, deploy, or Country READY.",
    snapshot_captured_at: snapshot.captured_at ?? null,
    diagnostic_captured_at: snapshot.diagnostic_captured_at ?? null,
    project_ref: snapshot.project_ref ?? null,
    counts: {
      fingerprinted_remote: (snapshot.migrations ?? []).length,
      checked: checked.length,
      source_match: source_match_count,
      source_mismatch: source_mismatch_count,
      diagnostic_comment_or_blank_only: comment_or_blank_only_count,
      missing_local: missing_local_names.length,
      duplicate_local_name: duplicate_local_names.length,
    },
    ready_for_provenance_reconciliation,
    ready_for_apply: false,
    checked,
    missing_local_names,
    duplicate_local_names,
  };
}

function loadLocalMigrations(migrationDir) {
  return fs
    .readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => ({
      basename: entry.name,
      source: fs.readFileSync(path.join(migrationDir, entry.name), "utf8"),
    }));
}

function main() {
  const snapshotPath = process.argv[2] ?? DEFAULT_SNAPSHOT;
  const migrationDir = process.argv[3] ?? DEFAULT_MIGRATION_DIR;
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const report = compareHostedSourceFingerprints({
    snapshot,
    localMigrations: loadLocalMigrations(migrationDir),
  });

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.ready_for_provenance_reconciliation ? 0 : 1;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) main();
