import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const VERSION_RE = /^\d{14}$/;
const MIGRATION_FILE_RE = /^(\d{14})_(.+)\.sql$/;

export function buildLocalMigrationCatalog(localMigrationPaths) {
  const byVersion = new Map();

  for (const migrationPath of localMigrationPaths) {
    const basename = path.basename(migrationPath);
    const match = MIGRATION_FILE_RE.exec(basename);
    if (!match) continue;

    const [, version] = match;
    if (byVersion.has(version)) {
      throw new Error(`duplicate local migration version: ${version}`);
    }
    byVersion.set(version, basename);
  }

  return byVersion;
}

export function parseMigrationList(migrationListText) {
  const rows = [];

  for (const line of migrationListText.split(/\r?\n/)) {
    if (!line.includes("│") && !line.includes("|")) continue;

    const parts = line.split(/[│|]/).map((part) => part.trim());
    if (parts.length < 2) continue;

    const [local, remote] = parts;
    if (/^LOCAL$/i.test(local) && /^REMOTE$/i.test(remote)) continue;

    const hasVersion = VERSION_RE.test(local) || VERSION_RE.test(remote);
    if (!hasVersion) continue;

    if (local && !VERSION_RE.test(local)) {
      throw new Error(`unrecognized local migration-list value: ${local}`);
    }
    if (remote && !VERSION_RE.test(remote)) {
      throw new Error(`unrecognized remote migration-list value: ${remote}`);
    }

    rows.push({ local: local || null, remote: remote || null });
  }

  if (rows.length === 0) {
    throw new Error("migration list did not contain any recognizable migration rows");
  }

  const localSeen = new Set();
  const remoteSeen = new Set();
  for (const row of rows) {
    if (row.local) {
      if (localSeen.has(row.local)) throw new Error(`duplicate local migration-list version: ${row.local}`);
      localSeen.add(row.local);
    }
    if (row.remote) {
      if (remoteSeen.has(row.remote)) throw new Error(`duplicate remote migration-list version: ${row.remote}`);
      remoteSeen.add(row.remote);
    }
  }

  return rows;
}

export function reconcileMigrationList({ migrationListText, localMigrationPaths }) {
  const catalog = buildLocalMigrationCatalog(localMigrationPaths);
  const rows = parseMigrationList(migrationListText);
  const localVersions = new Set(rows.flatMap((row) => (row.local ? [row.local] : [])));
  const remoteVersions = new Set(rows.flatMap((row) => (row.remote ? [row.remote] : [])));

  for (const version of localVersions) {
    if (!catalog.has(version)) {
      throw new Error(`migration list reported local version not present in exact checkout: ${version}`);
    }
  }

  const exactVersions = [...localVersions].filter((version) => remoteVersions.has(version)).sort();
  const localOnlyVersions = [...localVersions].filter((version) => !remoteVersions.has(version)).sort();
  const remoteOnlyVersions = [...remoteVersions].filter((version) => !localVersions.has(version)).sort();

  const withLocalBasename = (version) => ({ version, basename: catalog.get(version) });

  return {
    counts: {
      local: localVersions.size,
      remote: remoteVersions.size,
      exact: exactVersions.length,
      local_only: localOnlyVersions.length,
      remote_only: remoteOnlyVersions.length,
    },
    exact: exactVersions.map(withLocalBasename),
    local_only: localOnlyVersions.map(withLocalBasename),
    remote_only: remoteOnlyVersions.map((version) => ({ version })),
  };
}

function runCli() {
  const [migrationListPath, migrationDir, outputPath] = process.argv.slice(2);
  if (!migrationListPath || !migrationDir || !outputPath) {
    throw new Error(
      "usage: node scripts/supabase-migration-reconciliation.mjs <migration-list.txt> <migration-dir> <output.json>",
    );
  }

  const migrationListText = fs.readFileSync(migrationListPath, "utf8");
  const localMigrationPaths = fs
    .readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => path.join(migrationDir, entry.name));

  const reconciliation = reconcileMigrationList({ migrationListText, localMigrationPaths });
  fs.writeFileSync(outputPath, `${JSON.stringify(reconciliation, null, 2)}\n`, "utf8");
  process.stdout.write(
    `MIGRATION_RECONCILIATION exact=${reconciliation.counts.exact} local_only=${reconciliation.counts.local_only} remote_only=${reconciliation.counts.remote_only}\n`,
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
