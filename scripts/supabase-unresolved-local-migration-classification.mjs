import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function diagnosticNormalizeMigrationSource(source) {
  return source
    .replace(/\r\n?/g, "\n")
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "" && !/^\s*--/.test(line))
    .join("\n")
    .trim();
}

export function sha256DiagnosticMigrationSource(source) {
  return crypto
    .createHash("sha256")
    .update(diagnosticNormalizeMigrationSource(source), "utf8")
    .digest("hex");
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function sameStrings(left, right) {
  const a = sorted(left);
  const b = sorted(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function classifyUnresolvedLocalMigrations({ manifest, reconciliationReport, migrationDir }) {
  const reconciliation = reconciliationReport.reconciliation ?? reconciliationReport;
  const unresolved = reconciliation.unresolved_local_names ?? [];
  const entries = manifest.entries ?? [];
  const blockers = [];
  const checked = [];

  if (manifest.project_ref !== reconciliationReport.snapshot?.project_ref && reconciliationReport.snapshot?.project_ref) {
    blockers.push(
      `project_ref mismatch: manifest=${manifest.project_ref ?? "missing"} reconciliation=${reconciliationReport.snapshot.project_ref}`,
    );
  }

  const unresolvedBasenames = unresolved.map((row) => row.basename);
  const manifestBasenames = entries.map((entry) => entry.local_basename);
  if (!sameStrings(unresolvedBasenames, manifestBasenames)) {
    blockers.push(
      `classification inventory mismatch; unresolved=[${sorted(unresolvedBasenames).join(", ")}] manifest=[${sorted(manifestBasenames).join(", ")}]`,
    );
  }

  const duplicateBasenames = manifestBasenames.filter(
    (basename, index) => manifestBasenames.indexOf(basename) !== index,
  );
  if (duplicateBasenames.length > 0) {
    blockers.push(`duplicate classification basename(s): ${sorted(new Set(duplicateBasenames)).join(", ")}`);
  }

  for (const entry of entries) {
    const localPath = path.join(migrationDir, entry.local_basename ?? "");
    if (!entry.local_basename || !fs.existsSync(localPath)) {
      blockers.push(`classified local migration missing from checkout: ${entry.local_basename ?? "<missing>"}`);
      continue;
    }

    const localSource = fs.readFileSync(localPath, "utf8");
    const localDiagnosticSha256 = sha256DiagnosticMigrationSource(localSource);
    const remoteDiagnosticHashes = (entry.remote ?? []).map((remote) => remote.diagnostic_sha256);
    let classificationVerified = false;

    switch (entry.classification) {
      case "REMOTE_EQUIVALENT_AFTER_COMMENT_BLANK_NORMALIZATION": {
        classificationVerified =
          remoteDiagnosticHashes.length === 1 && localDiagnosticSha256 === remoteDiagnosticHashes[0];
        if (!classificationVerified) {
          blockers.push(
            `${entry.local_basename} no longer matches its captured Hosted diagnostic fingerprint`,
          );
        }
        break;
      }
      case "REMOTE_EQUIVALENT_TO_ORDERED_REMOTE_SEQUENCE": {
        classificationVerified =
          typeof entry.expected_combined_diagnostic_sha256 === "string" &&
          localDiagnosticSha256 === entry.expected_combined_diagnostic_sha256;
        if (!classificationVerified) {
          blockers.push(
            `${entry.local_basename} no longer matches its captured ordered Hosted migration sequence`,
          );
        }
        break;
      }
      case "REMOTE_DIVERGED_DO_NOT_REPLAY": {
        classificationVerified =
          remoteDiagnosticHashes.length > 0 && !remoteDiagnosticHashes.includes(localDiagnosticSha256);
        if (!classificationVerified) {
          blockers.push(
            `${entry.local_basename} divergence classification is stale; refresh Hosted/local provenance before proceeding`,
          );
        }
        break;
      }
      case "NEW_CANDIDATE_EXPECTED_APPLY": {
        classificationVerified =
          entry.expected_apply === true && (entry.remote ?? []).length === 0;
        if (!classificationVerified) {
          blockers.push(`${entry.local_basename} is not a valid isolated new-candidate classification`);
        }
        break;
      }
      default:
        blockers.push(
          `${entry.local_basename} has unsupported classification ${entry.classification ?? "<missing>"}`,
        );
    }

    checked.push({
      local_basename: entry.local_basename,
      local_name: entry.local_name ?? null,
      classification: entry.classification ?? null,
      local_diagnostic_sha256: localDiagnosticSha256,
      remote: entry.remote ?? [],
      classification_verified: classificationVerified,
    });
  }

  const expectedApplyFromEntries = entries
    .filter((entry) => entry.classification === "NEW_CANDIDATE_EXPECTED_APPLY" && entry.expected_apply === true)
    .map((entry) => entry.local_basename);
  if (!sameStrings(expectedApplyFromEntries, manifest.expected_apply_migrations ?? [])) {
    blockers.push(
      `expected apply classification mismatch; entries=[${sorted(expectedApplyFromEntries).join(", ")}] manifest=[${sorted(manifest.expected_apply_migrations ?? []).join(", ")}]`,
    );
  }

  const equivalentHistorical = checked.filter((row) =>
    row.classification?.startsWith("REMOTE_EQUIVALENT_"),
  );
  const quarantinedDiverged = checked.filter(
    (row) => row.classification === "REMOTE_DIVERGED_DO_NOT_REPLAY",
  );
  const newCandidates = checked.filter(
    (row) => row.classification === "NEW_CANDIDATE_EXPECTED_APPLY",
  );

  return {
    contract_version: 1,
    evidence_scope:
      "Unresolved LOCAL-only migration provenance classification only. Historical equivalence or divergence does not authorize migration-history repair, db push, Hosted mutation, Production deployment, or Country READY.",
    captured_at: manifest.captured_at ?? null,
    project_ref: manifest.project_ref ?? null,
    counts: {
      unresolved_local: unresolved.length,
      classified: checked.length,
      equivalent_historical: equivalentHistorical.length,
      quarantined_diverged: quarantinedDiverged.length,
      new_candidates: newCandidates.length,
      blockers: blockers.length,
    },
    classification_complete: blockers.length === 0 && checked.length === unresolved.length,
    ready_for_apply: false,
    expected_apply_migrations: manifest.expected_apply_migrations ?? [],
    equivalent_historical: equivalentHistorical.map((row) => row.local_basename),
    quarantined_diverged: quarantinedDiverged.map((row) => row.local_basename),
    new_candidates: newCandidates.map((row) => row.local_basename),
    checked,
    blockers,
  };
}

function main() {
  const [manifestPath, reconciliationPath, migrationDir, outputPath] = process.argv.slice(2);
  if (!manifestPath || !reconciliationPath || !migrationDir) {
    throw new Error(
      "usage: node scripts/supabase-unresolved-local-migration-classification.mjs <manifest.json> <reconciliation.json> <migration-dir> [output.json]",
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const reconciliationReport = JSON.parse(fs.readFileSync(reconciliationPath, "utf8"));
  const report = classifyUnresolvedLocalMigrations({ manifest, reconciliationReport, migrationDir });
  const text = `${JSON.stringify(report, null, 2)}\n`;

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, text, "utf8");
  }
  process.stdout.write(text);
  process.exitCode = report.classification_complete ? 0 : 1;
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
