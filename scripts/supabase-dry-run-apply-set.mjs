import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MIGRATION_FILE_RE = /^(\d{14})_(.+)\.sql$/;
const VERSION_TOKEN_RE = /\b\d{14}\b/g;

export function buildMigrationCatalog(paths) {
  const byVersion = new Map();

  for (const migrationPath of paths) {
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

export function extractLocalApplySet(dryRunText, localMigrationPaths) {
  const catalog = buildMigrationCatalog(localMigrationPaths);
  const versions = new Set(dryRunText.match(VERSION_TOKEN_RE) ?? []);

  return [...versions]
    .filter((version) => catalog.has(version))
    .sort()
    .map((version) => catalog.get(version));
}

export function verifyExactApplySet({ dryRunText, localMigrationPaths, expectedBasenames }) {
  if (!Array.isArray(expectedBasenames) || expectedBasenames.length === 0) {
    throw new Error("expected migration allow-list is empty");
  }

  const catalog = buildMigrationCatalog(localMigrationPaths);
  const knownBasenames = new Set(catalog.values());
  const expected = [...new Set(expectedBasenames)].sort();

  for (const basename of expected) {
    if (!knownBasenames.has(basename)) {
      throw new Error(`expected migration is not present in local checkout: ${basename}`);
    }
  }

  const actual = extractLocalApplySet(dryRunText, localMigrationPaths);
  if (actual.length === 0) {
    throw new Error("dry-run output did not identify any local migration version; refusing to infer a safe apply set");
  }

  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(
      `dry-run apply set mismatch; expected [${expected.join(", ")}], detected [${actual.join(", ")}]`,
    );
  }

  return actual;
}

function runCli() {
  const [dryRunPath, migrationDir, ...expectedBasenames] = process.argv.slice(2);
  if (!dryRunPath || !migrationDir || expectedBasenames.length === 0) {
    throw new Error(
      "usage: node scripts/supabase-dry-run-apply-set.mjs <db-push-dry-run.txt> <migration-dir> <expected.sql> [expected.sql ...]",
    );
  }

  const dryRunText = fs.readFileSync(dryRunPath, "utf8");
  const localMigrationPaths = fs
    .readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => path.join(migrationDir, entry.name));

  const actual = verifyExactApplySet({ dryRunText, localMigrationPaths, expectedBasenames });
  process.stdout.write(`VERIFIED_EXACT_APPLY_SET ${actual.join(" ")}\n`);
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
