import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function sameStrings(left, right) {
  const a = sorted(left);
  const b = sorted(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(buffer).digest("hex");
}

export function parseAllowlistCsv(raw) {
  const parts = String(raw ?? "")
    .split(",")
    .map((value) => value.trim());

  const blockers = [];
  if (parts.length === 0 || parts.every((value) => value.length === 0)) {
    blockers.push("dry-run allow-list is empty");
    return { migrations: [], blockers };
  }

  if (parts.some((value) => value.length === 0)) {
    blockers.push("dry-run allow-list contains an empty entry");
  }

  const migrations = parts.filter(Boolean);
  const duplicates = migrations.filter(
    (migration, index) => migrations.indexOf(migration) !== index,
  );
  if (duplicates.length > 0) {
    blockers.push(`dry-run allow-list contains duplicate migration(s): ${sorted(new Set(duplicates)).join(", ")}`);
  }

  return { migrations, blockers };
}

export function verifyLinkedDryRunAllowlist({ manifest, requestedAllowlist, migrationDir = null }) {
  const parsed = parseAllowlistCsv(requestedAllowlist);
  const blockers = [...parsed.blockers];
  const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];
  const manifestExpected = Array.isArray(manifest?.expected_apply_migrations)
    ? manifest.expected_apply_migrations
    : [];

  const provenanceAuthorized = entries
    .filter(
      (entry) =>
        entry?.classification === "NEW_CANDIDATE_EXPECTED_APPLY" &&
        entry?.expected_apply === true &&
        Array.isArray(entry?.remote) &&
        entry.remote.length === 0,
    )
    .map((entry) => entry.local_basename)
    .filter(Boolean);

  const quarantined = entries
    .filter((entry) => entry?.classification !== "NEW_CANDIDATE_EXPECTED_APPLY")
    .map((entry) => entry.local_basename)
    .filter(Boolean);

  const duplicateManifestEntries = entries
    .map((entry) => entry?.local_basename)
    .filter(Boolean)
    .filter((basename, index, values) => values.indexOf(basename) !== index);
  if (duplicateManifestEntries.length > 0) {
    blockers.push(
      `provenance manifest contains duplicate migration(s): ${sorted(new Set(duplicateManifestEntries)).join(", ")}`,
    );
  }

  if (!sameStrings(provenanceAuthorized, manifestExpected)) {
    blockers.push(
      `provenance manifest expected apply set does not match NEW_CANDIDATE_EXPECTED_APPLY entries; manifest=[${sorted(manifestExpected).join(", ")}] provenance=[${sorted(provenanceAuthorized).join(", ")}]`,
    );
  }

  if (!sameStrings(parsed.migrations, manifestExpected)) {
    blockers.push(
      `workflow dry-run allow-list does not exactly match provenance manifest; workflow=[${sorted(parsed.migrations).join(", ")}] manifest=[${sorted(manifestExpected).join(", ")}]`,
    );
  }

  const forbiddenRequested = parsed.migrations.filter((migration) => quarantined.includes(migration));
  if (forbiddenRequested.length > 0) {
    blockers.push(
      `dry-run allow-list includes quarantined historical migration(s): ${sorted(forbiddenRequested).join(", ")}`,
    );
  }

  const candidateEntries = entries.filter(
    (entry) =>
      entry?.classification === "NEW_CANDIDATE_EXPECTED_APPLY" &&
      entry?.expected_apply === true,
  );
  for (const entry of candidateEntries) {
    const basename = entry?.local_basename;
    const sourceBlobSha = String(entry?.source_blob_sha ?? "").toLowerCase();
    if (!basename || path.basename(basename) !== basename) {
      blockers.push(`candidate provenance has invalid migration basename: ${String(basename)}`);
      continue;
    }
    if (!sourceBlobSha) {
      blockers.push(`candidate provenance missing source blob SHA for ${basename}`);
      continue;
    }
    if (!/^[0-9a-f]{40}$/.test(sourceBlobSha)) {
      blockers.push(`candidate provenance has invalid source blob SHA for ${basename}`);
    }
  }

  const sourceBlobChecks = [];
  if (migrationDir) {
    for (const entry of candidateEntries) {
      const basename = entry?.local_basename;
      const expectedBlobSha = String(entry?.source_blob_sha ?? "").toLowerCase();
      if (!basename || path.basename(basename) !== basename) {
        continue;
      }
      if (!/^[0-9a-f]{40}$/.test(expectedBlobSha)) {
        continue;
      }

      const migrationPath = path.join(migrationDir, basename);
      if (!fs.existsSync(migrationPath)) {
        blockers.push(`candidate source migration is missing for blob verification: ${basename}`);
        sourceBlobChecks.push({ migration: basename, expected_blob_sha: expectedBlobSha, actual_blob_sha: null, verified: false });
        continue;
      }

      const actualBlobSha = gitBlobSha(fs.readFileSync(migrationPath));
      const verified = actualBlobSha === expectedBlobSha;
      sourceBlobChecks.push({
        migration: basename,
        expected_blob_sha: expectedBlobSha,
        actual_blob_sha: actualBlobSha,
        verified,
      });
      if (!verified) {
        blockers.push(
          `candidate source blob mismatch for ${basename}; expected=${expectedBlobSha} actual=${actualBlobSha}`,
        );
      }
    }
  }

  if (manifest?.ready_for_apply !== false) {
    blockers.push("provenance manifest must remain ready_for_apply=false; this gate authorizes dry-run evidence only");
  }

  return {
    contract_version: 2,
    evidence_scope:
      "Binds the linked dry-run allow-list to independently classified migration provenance and requires every expected-apply candidate to carry a verified Git source-blob SHA when source files are available. Passing this gate authorizes only evidence capture; it does not authorize migration apply, repair, Hosted mutation, merge, deploy, provider activation, or Country READY.",
    requested_allowlist: parsed.migrations,
    manifest_expected_apply: manifestExpected,
    provenance_authorized_dry_run: provenanceAuthorized,
    quarantined_historical: quarantined,
    source_blob_checks: sourceBlobChecks,
    dry_run_allowlist_verified: blockers.length === 0,
    ready_for_apply: false,
    blockers,
  };
}

function main() {
  const [manifestPath, requestedAllowlist, migrationDirArg] = process.argv.slice(2);
  if (!manifestPath || requestedAllowlist === undefined) {
    throw new Error(
      "usage: node scripts/supabase-linked-allowlist-provenance.mjs <classification-manifest.json> <comma-separated-expected-apply-migrations> [migration-dir]",
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const migrationDir = migrationDirArg ?? "supabase/migrations";
  const report = verifyLinkedDryRunAllowlist({ manifest, requestedAllowlist, migrationDir });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.dry_run_allowlist_verified ? 0 : 1;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`BLOCKED: ${message}\n`);
    process.exitCode = 1;
  }
}
