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

export function verifyLinkedDryRunAllowlist({ manifest, requestedAllowlist }) {
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

  if (manifest?.ready_for_apply !== false) {
    blockers.push("provenance manifest must remain ready_for_apply=false; this gate authorizes dry-run evidence only");
  }

  return {
    contract_version: 1,
    evidence_scope:
      "Binds the linked dry-run allow-list to independently classified migration provenance. Passing this gate authorizes only evidence capture; it does not authorize migration apply, repair, Hosted mutation, merge, deploy, or Country READY.",
    requested_allowlist: parsed.migrations,
    manifest_expected_apply: manifestExpected,
    provenance_authorized_dry_run: provenanceAuthorized,
    quarantined_historical: quarantined,
    dry_run_allowlist_verified: blockers.length === 0,
    ready_for_apply: false,
    blockers,
  };
}

function main() {
  const [manifestPath, requestedAllowlist] = process.argv.slice(2);
  if (!manifestPath || requestedAllowlist === undefined) {
    throw new Error(
      "usage: node scripts/supabase-linked-allowlist-provenance.mjs <classification-manifest.json> <comma-separated-expected-apply-migrations>",
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const report = verifyLinkedDryRunAllowlist({ manifest, requestedAllowlist });
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
