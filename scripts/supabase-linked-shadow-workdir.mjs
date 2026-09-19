import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const VERSION_RE = /^\d{14}$/;
const MIGRATION_FILE_RE = /^(\d{14})_(.+)\.sql$/;

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function sameStrings(left, right) {
  const a = sorted(left);
  const b = sorted(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function assertUnique(rows, key, label) {
  const seen = new Set();
  for (const row of rows) {
    const value = row[key];
    if (seen.has(value)) throw new Error(`duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function safeMigrationName(name) {
  const safe = String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return safe || "hosted_migration";
}

export function gitBlobSha(content) {
  const body = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const header = Buffer.from(`blob ${body.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(body).digest("hex");
}

function readLocalCatalog(migrationDir) {
  const rows = fs
    .readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .flatMap((entry) => {
      const match = MIGRATION_FILE_RE.exec(entry.name);
      if (!match) return [];
      return [{ version: match[1], name: match[2], basename: entry.name }];
    });
  assertUnique(rows, "version", "local migration version");
  return rows;
}

export function buildShadowWorkdir({ snapshot, manifest, canonicalSupabaseDir, shadowRoot }) {
  if (!snapshot || !Array.isArray(snapshot.migrations)) {
    throw new Error("Hosted migration snapshot is missing migrations");
  }
  if (!manifest || !Array.isArray(manifest.entries)) {
    throw new Error("migration classification manifest is missing entries");
  }
  if (!snapshot.project_ref || snapshot.project_ref !== manifest.project_ref) {
    throw new Error(
      `project_ref mismatch: snapshot=${snapshot.project_ref ?? "missing"} manifest=${manifest.project_ref ?? "missing"}`,
    );
  }

  const canonicalRoot = path.resolve(canonicalSupabaseDir);
  const shadow = path.resolve(shadowRoot);
  if (shadow === canonicalRoot || shadow.startsWith(`${canonicalRoot}${path.sep}`)) {
    throw new Error("shadow workdir must not overwrite the canonical Supabase directory");
  }

  const canonicalMigrationDir = path.join(canonicalRoot, "migrations");
  const canonicalConfig = path.join(canonicalRoot, "config.toml");
  if (!fs.existsSync(canonicalConfig)) throw new Error("canonical supabase/config.toml is missing");
  if (!fs.existsSync(canonicalMigrationDir)) throw new Error("canonical supabase/migrations is missing");

  const remote = snapshot.migrations.map((row) => ({
    version: String(row.version ?? ""),
    name: String(row.name ?? ""),
  }));
  for (const row of remote) {
    if (!VERSION_RE.test(row.version) || !row.name) {
      throw new Error(`invalid Hosted migration row: ${JSON.stringify(row)}`);
    }
  }
  assertUnique(remote, "version", "Hosted migration version");

  const expected = manifest.expected_apply_migrations ?? [];
  if (!Array.isArray(expected) || expected.length === 0) {
    throw new Error("expected_apply_migrations is empty");
  }
  if (new Set(expected).size !== expected.length) {
    throw new Error("expected_apply_migrations contains duplicates");
  }

  const candidateEntries = manifest.entries.filter(
    (entry) => entry.classification === "NEW_CANDIDATE_EXPECTED_APPLY" && entry.expected_apply === true,
  );
  const candidateBasenames = candidateEntries.map((entry) => entry.local_basename);
  if (!sameStrings(expected, candidateBasenames)) {
    throw new Error(
      `candidate allow-list mismatch: expected=[${sorted(expected).join(", ")}] classified=[${sorted(candidateBasenames).join(", ")}]`,
    );
  }

  const local = readLocalCatalog(canonicalMigrationDir);
  const remoteVersions = new Set(remote.map((row) => row.version));
  const remoteNames = new Set(remote.map((row) => row.name));
  const localOnly = local.filter((row) => !remoteVersions.has(row.version));
  const sameNameTimestampDrift = localOnly.filter((row) => remoteNames.has(row.name));
  const unresolvedLocal = localOnly.filter((row) => !remoteNames.has(row.name));
  const manifestBasenames = manifest.entries.map((entry) => entry.local_basename);

  if (!sameStrings(unresolvedLocal.map((row) => row.basename), manifestBasenames)) {
    throw new Error(
      `unresolved LOCAL-only inventory drift: local=[${sorted(unresolvedLocal.map((row) => row.basename)).join(", ")}] manifest=[${sorted(manifestBasenames).join(", ")}]`,
    );
  }

  const localByBasename = new Map(local.map((row) => [row.basename, row]));
  const candidates = [];
  for (const entry of candidateEntries) {
    const basename = entry.local_basename;
    const localRow = localByBasename.get(basename);
    if (!localRow) throw new Error(`candidate is missing from canonical migration tree: ${basename}`);
    if (remoteVersions.has(localRow.version)) {
      throw new Error(`candidate version is already present in Hosted history: ${localRow.version}`);
    }
    if (!/^[0-9a-f]{40}$/.test(entry.source_blob_sha ?? "")) {
      throw new Error(`candidate has invalid source_blob_sha: ${basename}`);
    }
    const sourcePath = path.join(canonicalMigrationDir, basename);
    const source = fs.readFileSync(sourcePath);
    const actualBlobSha = gitBlobSha(source);
    if (actualBlobSha !== entry.source_blob_sha) {
      throw new Error(
        `candidate Git blob SHA mismatch for ${basename}: expected ${entry.source_blob_sha}, got ${actualBlobSha}`,
      );
    }
    candidates.push({
      version: localRow.version,
      name: localRow.name,
      basename,
      source_blob_sha: actualBlobSha,
      source_path: sourcePath,
    });
  }
  assertUnique(candidates, "version", "candidate migration version");

  const remoteHead = sorted(remote.map((row) => row.version)).at(-1);
  const olderThanRemoteHead = candidates.filter((row) => row.version < remoteHead);
  const candidateSet = new Set(candidates.map((row) => row.basename));
  const quarantinedHistoricalLocal = localOnly.filter((row) => !candidateSet.has(row.basename));

  fs.rmSync(shadow, { recursive: true, force: true });
  const shadowSupabaseDir = path.join(shadow, "supabase");
  const shadowMigrationDir = path.join(shadowSupabaseDir, "migrations");
  fs.mkdirSync(shadowMigrationDir, { recursive: true });
  fs.copyFileSync(canonicalConfig, path.join(shadowSupabaseDir, "config.toml"));

  const markerFiles = [];
  for (const row of remote) {
    const basename = `${row.version}_${safeMigrationName(row.name)}.sql`;
    const marker = [
      `-- Evidence-only no-op marker for Hosted migration ${row.version} (${row.name}).`,
      "-- Supabase CLI compares migration history by timestamp; this marker mirrors an already-recorded Hosted version.",
      "-- Never copy this marker into the canonical migration tree or use it to repair Hosted history.",
      "",
    ].join("\n");
    fs.writeFileSync(path.join(shadowMigrationDir, basename), marker, "utf8");
    markerFiles.push(basename);
  }

  for (const candidate of candidates) {
    fs.copyFileSync(candidate.source_path, path.join(shadowMigrationDir, candidate.basename));
  }

  const report = {
    contract_version: 1,
    project_ref: snapshot.project_ref,
    evidence_scope:
      "Temporary Supabase CLI workdir for linked migration-list/db-push --dry-run evidence only. It mirrors already-recorded Hosted timestamps with comment-only markers and carries only the exact reviewed candidate SQL. It never authorizes migration apply/repair, Hosted mutation, Production deploy, provider/payment activation, legal/compliance approval, or Country READY.",
    canonical_supabase_dir: canonicalRoot,
    shadow_supabase_dir: shadowSupabaseDir,
    counts: {
      hosted_history_markers: markerFiles.length,
      exact_reviewed_candidates: candidates.length,
      shadow_migrations_total: markerFiles.length + candidates.length,
      canonical_timestamped_migrations: local.length,
      canonical_local_only_by_version: localOnly.length,
      canonical_same_name_timestamp_drift: sameNameTimestampDrift.length,
      canonical_unresolved_local_names: unresolvedLocal.length,
      quarantined_historical_local: quarantinedHistoricalLocal.length,
      candidates_older_than_hosted_head: olderThanRemoteHead.length,
    },
    hosted_head_version: remoteHead,
    expected_apply_migrations: expected,
    older_than_hosted_head: olderThanRemoteHead.map((row) => row.basename),
    candidates: candidates.map(({ source_path: _sourcePath, ...row }) => row),
    hosted_marker_files: markerFiles,
    quarantined_historical_local: quarantinedHistoricalLocal.map((row) => row.basename),
    ready_for_linked_dry_run: true,
    ready_for_apply: false,
  };

  return report;
}

function runCli() {
  const [snapshotPath, manifestPath, canonicalSupabaseDir, shadowRoot, reportPath] = process.argv.slice(2);
  if (!snapshotPath || !manifestPath || !canonicalSupabaseDir || !shadowRoot || !reportPath) {
    throw new Error(
      "usage: node scripts/supabase-linked-shadow-workdir.mjs <hosted-snapshot.json> <classification-manifest.json> <canonical-supabase-dir> <shadow-root> <report.json>",
    );
  }

  const repoRoot = path.resolve(process.cwd());
  const resolvedShadow = path.resolve(shadowRoot);
  const allowedArtifactsRoot = path.join(repoRoot, "artifacts");
  if (resolvedShadow !== allowedArtifactsRoot && !resolvedShadow.startsWith(`${allowedArtifactsRoot}${path.sep}`)) {
    throw new Error("CLI shadow workdir must be created under repository artifacts/");
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const report = buildShadowWorkdir({ snapshot, manifest, canonicalSupabaseDir, shadowRoot });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(
    `VERIFIED_SHADOW_MIGRATION_WORKDIR hosted_markers=${report.counts.hosted_history_markers} candidates=${report.counts.exact_reviewed_candidates} quarantined_historical=${report.counts.quarantined_historical_local} older_candidates=${report.counts.candidates_older_than_hosted_head}\n`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    runCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`BLOCKED: ${message}\n`);
    process.exitCode = 1;
  }
}
