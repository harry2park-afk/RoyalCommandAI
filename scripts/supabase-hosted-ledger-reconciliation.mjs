import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const VERSION_RE = /^\d{14}$/;
const MIGRATION_FILE_RE = /^(\d{14})_(.+)\.sql$/;

function assertUniqueVersions(rows, label) {
  const seen = new Set();
  for (const row of rows) {
    if (!VERSION_RE.test(row.version)) {
      throw new Error(`${label} migration has invalid version: ${row.version}`);
    }
    if (!row.name || typeof row.name !== "string") {
      throw new Error(`${label} migration ${row.version} has no name`);
    }
    if (seen.has(row.version)) {
      throw new Error(`duplicate ${label} migration version: ${row.version}`);
    }
    seen.add(row.version);
  }
}

export function buildLocalMigrationCatalog(localMigrationPaths) {
  const rows = [];

  for (const migrationPath of localMigrationPaths) {
    const basename = path.basename(migrationPath);
    const match = MIGRATION_FILE_RE.exec(basename);
    if (!match) continue;
    const [, version, name] = match;
    rows.push({ version, name, basename });
  }

  assertUniqueVersions(rows, "local");
  return rows;
}

export function reconcileHostedLedger({ snapshot, localMigrationPaths }) {
  if (!snapshot || !Array.isArray(snapshot.migrations)) {
    throw new Error("Hosted ledger snapshot is missing migrations");
  }

  const remote = snapshot.migrations.map((row) => ({
    version: String(row.version ?? ""),
    name: String(row.name ?? ""),
  }));
  assertUniqueVersions(remote, "Hosted");

  const local = buildLocalMigrationCatalog(localMigrationPaths);
  const localByVersion = new Map(local.map((row) => [row.version, row]));
  const remoteByVersion = new Map(remote.map((row) => [row.version, row]));

  const remoteVersionsByName = new Map();
  for (const row of remote) {
    const versions = remoteVersionsByName.get(row.name) ?? [];
    versions.push(row.version);
    remoteVersionsByName.set(row.name, versions);
  }

  const localNames = new Set(local.map((row) => row.name));

  const exact = local
    .filter((row) => remoteByVersion.has(row.version))
    .sort((a, b) => a.version.localeCompare(b.version));

  const localOnly = local
    .filter((row) => !remoteByVersion.has(row.version))
    .sort((a, b) => a.version.localeCompare(b.version));

  const remoteOnly = remote
    .filter((row) => !localByVersion.has(row.version))
    .sort((a, b) => a.version.localeCompare(b.version));

  const sameNameTimestampDrift = localOnly
    .flatMap((row) => {
      const remoteVersions = remoteVersionsByName.get(row.name) ?? [];
      if (remoteVersions.length === 0) return [];
      return [{
        local_version: row.version,
        local_basename: row.basename,
        name: row.name,
        remote_versions: [...remoteVersions].sort(),
      }];
    })
    .sort((a, b) => a.local_version.localeCompare(b.local_version));

  const unresolvedLocalNames = localOnly
    .filter((row) => !(remoteVersionsByName.get(row.name)?.length))
    .map((row) => ({ version: row.version, basename: row.basename, name: row.name }));

  const unresolvedRemoteNames = remoteOnly
    .filter((row) => !localNames.has(row.name))
    .map((row) => ({ version: row.version, name: row.name }));

  return {
    snapshot: {
      contract_version: snapshot.contract_version ?? null,
      captured_at: snapshot.captured_at ?? null,
      project_ref: snapshot.project_ref ?? null,
    },
    counts: {
      local_timestamped: local.length,
      hosted: remote.length,
      exact_by_version: exact.length,
      local_only_by_version: localOnly.length,
      remote_only_by_version: remoteOnly.length,
      same_name_timestamp_drift: sameNameTimestampDrift.length,
      unresolved_local_names: unresolvedLocalNames.length,
      unresolved_hosted_names: unresolvedRemoteNames.length,
    },
    exact,
    local_only: localOnly,
    remote_only: remoteOnly,
    same_name_timestamp_drift: sameNameTimestampDrift,
    unresolved_local_names: unresolvedLocalNames,
    unresolved_hosted_names: unresolvedRemoteNames,
  };
}

export function assessKnownLedgerForApplySet({ reconciliation, expectedBasenames }) {
  if (!Array.isArray(expectedBasenames) || expectedBasenames.length === 0) {
    throw new Error("expected migration allow-list is empty");
  }

  const expected = [...new Set(expectedBasenames)].sort();
  const localOnlyBasenames = reconciliation.local_only.map((row) => row.basename).sort();
  const localOnlySet = new Set(localOnlyBasenames);
  const expectedSet = new Set(expected);

  const unexpectedLocalOnly = localOnlyBasenames.filter((basename) => !expectedSet.has(basename));
  const missingExpected = expected.filter((basename) => !localOnlySet.has(basename));

  const blockers = [];
  if (reconciliation.counts.remote_only_by_version > 0) {
    blockers.push(
      `known Hosted ledger has ${reconciliation.counts.remote_only_by_version} REMOTE-only version(s); source/Hosted parity is unresolved`,
    );
  }
  if (unexpectedLocalOnly.length > 0) {
    blockers.push(
      `known checkout has ${unexpectedLocalOnly.length} LOCAL-only migration(s) outside the explicit allow-list`,
    );
  }
  if (missingExpected.length > 0) {
    blockers.push(`allow-listed migration(s) are not LOCAL-only in the known snapshot: ${missingExpected.join(", ")}`);
  }

  return {
    ready: blockers.length === 0,
    expected_apply_migrations: expected,
    blockers,
    unexpected_local_only: unexpectedLocalOnly,
    missing_expected: missingExpected,
  };
}

function runCli() {
  const [snapshotPath, migrationDir, outputPath, ...expectedBasenames] = process.argv.slice(2);
  if (!snapshotPath || !migrationDir || !outputPath || expectedBasenames.length === 0) {
    throw new Error(
      "usage: node scripts/supabase-hosted-ledger-reconciliation.mjs <snapshot.json> <migration-dir> <output.json> <expected.sql> [expected.sql ...]",
    );
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const localMigrationPaths = fs
    .readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => path.join(migrationDir, entry.name));

  const reconciliation = reconcileHostedLedger({ snapshot, localMigrationPaths });
  const assessment = assessKnownLedgerForApplySet({ reconciliation, expectedBasenames });
  const output = { reconciliation, assessment };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  process.stdout.write(
    `KNOWN_HOSTED_LEDGER_RECONCILIATION exact=${reconciliation.counts.exact_by_version} local_only=${reconciliation.counts.local_only_by_version} remote_only=${reconciliation.counts.remote_only_by_version} same_name_drift=${reconciliation.counts.same_name_timestamp_drift}\n`,
  );

  if (!assessment.ready) {
    for (const blocker of assessment.blockers) {
      process.stderr.write(`BLOCKED: ${blocker}\n`);
    }
    process.exitCode = 1;
  } else {
    process.stdout.write(`VERIFIED_KNOWN_LEDGER_APPLY_SET ${assessment.expected_apply_migrations.join(" ")}\n`);
  }
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
