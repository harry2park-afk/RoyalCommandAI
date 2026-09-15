import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compareHostedSourceFingerprints } from "./supabase-hosted-source-provenance.mjs";

const DEFAULT_SNAPSHOT = "scripts/supabase-hosted-source-fingerprints-20260908.json";
const DEFAULT_MIGRATION_DIR = "supabase/migrations";
const SIMPLE_EVIDENCE = "scripts/supabase-residual-simple-source-equivalence-20260911.json";
const LEGAL_SPLIT_EVIDENCE = "scripts/supabase-legal-story-split-history-equivalence-20260911.json";
const PLPGSQL_EVIDENCE = "scripts/supabase-room-factory-plpgsql-token-equivalence-20260911.json";
const EXPECTED_RESIDUAL_NAMES = [
  "add_room_work_records",
  "legal_case_file_numbers",
  "legal_story_entries",
  "room_factory_evidence_review",
  "room_factory_start_execution",
];
const TOKEN_SEPARATOR = "\x1f";
const AUDIO_DECLARATION_LINE =
  "  audio_document_id uuid null references public.documents(id) on delete set null,\n";
const LOCAL_COMMENT_METADATA = {
  room_factory_evidence_review: [],
  room_factory_start_execution: [
    `comment on function public.start_room_factory_lane_execution(uuid, uuid, text, integer) is\n  'Checks dependency PASS state, acquires one Work Lane persistent locks, and marks that lane running. No code execution occurs inside this RPC.';`,
    `comment on function public.fail_room_factory_lane_execution(uuid, uuid, text, uuid[], text) is\n  'Token-verified failed execution cleanup: releases the lane leases and records failed state.';`,
  ],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function gitBlobSha(value) {
  const byteLength = Buffer.byteLength(value, "utf8");
  return crypto
    .createHash("sha1")
    .update(`blob ${byteLength}\0`, "utf8")
    .update(value, "utf8")
    .digest("hex");
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function normalizeAllowlistedSimpleSql(source) {
  const normalized = source.replace(/\r\n?/g, "\n");
  assert(!/\/\*/.test(normalized), "simple proof rejects block comments");
  assert(!/\$[A-Za-z_0-9]*\$/.test(normalized), "simple proof rejects dollar-quoted bodies");

  const executable = normalized
    .split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n")
    .trim();
  const quoted = executable.match(/'(?:''|[^'])*'|"(?:""|[^"])*"/g) ?? [];
  for (const literal of quoted) {
    assert(!/\s/.test(literal), "simple proof rejects whitespace-bearing quoted literals");
  }
  return executable.replace(/\s+/g, " ");
}

function stripExplicitLocalCommentMetadata(name, source) {
  let stripped = source;
  for (const statement of LOCAL_COMMENT_METADATA[name] ?? []) {
    assert(stripped.split(statement).length === 2, `${name}: expected exact local COMMENT metadata once`);
    stripped = stripped.replace(statement, "");
  }
  return stripped;
}

function tokenizeAllowlistedSqlPlpgsql(source) {
  const normalized = source.replace(/\r\n?/g, "\n");
  assert(!/\/\*/.test(normalized), "PLpgSQL proof rejects block comments");
  assert(!/\$[A-Za-z_0-9]+\$/.test(normalized), "PLpgSQL proof rejects tagged dollar quotes");

  const tokenPattern = /(--[^\n]*(?:\n|$)|'(?:''|[^'])*'|"(?:""|[^"])*"|\$\$|::|:=|<>|<=|>=|!=|\|\||->>|->|#>>|#>|[A-Za-z_][A-Za-z_0-9]*|[0-9]+(?:\.[0-9]+)?|\S)/g;
  return Array.from(normalized.matchAll(tokenPattern), (match) => match[1]).filter(
    (token) => !token.startsWith("--"),
  );
}

function localSourceFor(entry) {
  const source = fs.readFileSync(entry.local_path, "utf8");
  if (entry.local_blob_sha) {
    assert(gitBlobSha(source) === entry.local_blob_sha, `${entry.name}: local Git blob SHA changed`);
  }
  if (entry.blob_sha) {
    assert(gitBlobSha(source) === entry.blob_sha, `${entry.name}: local Git blob SHA changed`);
  }
  return source;
}

function verifySimpleEvidence(evidence, projectRef) {
  assert(evidence.project_ref === projectRef, "simple proof project ref mismatch");
  assert(evidence.summary.ready_for_linked_apply === false, "simple proof must remain non-apply evidence");
  assert(evidence.summary.ledger_identity_verified === 0, "simple proof must not claim ledger identity");

  const proven = [];
  for (const entry of evidence.entries ?? []) {
    const source = fs.readFileSync(entry.local_path, "utf8");
    const canonicalHash = sha256(normalizeAllowlistedSimpleSql(source));
    assert(canonicalHash === entry.remote_whitespace_canonical_sha256, `${entry.name}: simple canonical hash mismatch`);
    assert(entry.source_provenance_equivalent === true, `${entry.name}: simple proof is not affirmative`);
    assert(entry.ledger_identity_claimed === false, `${entry.name}: simple proof claims ledger identity`);
    proven.push(entry.name);
  }
  return proven;
}

function verifyLegalSplitEvidence(evidence, projectRef) {
  assert(evidence.project_ref === projectRef, "legal split proof project ref mismatch");
  assert(evidence.summary.ready_for_linked_apply === false, "legal split proof must remain non-apply evidence");
  assert(evidence.summary.ledger_identity_verified === 0, "legal split proof must not claim ledger identity");
  assert(evidence.composition_contract.source_composition_equivalent === true, "legal split proof is not affirmative");
  assert(evidence.composition_contract.ledger_identity_claimed === false, "legal split proof claims ledger identity");
  assert(evidence.composition_contract.execution_order_identity_claimed === false, "legal split proof claims execution-order identity");

  const source = localSourceFor(evidence.local);
  assert(source.split(AUDIO_DECLARATION_LINE).length === 2, "legal split folded audio declaration must occur exactly once");
  const hostedBaseCandidate = source.replace(AUDIO_DECLARATION_LINE, "");
  assert(sha256(hostedBaseCandidate) === evidence.hosted_base.statements_sha256, "legal split Hosted base hash mismatch");

  const declaration = AUDIO_DECLARATION_LINE.trim().replace(/,$/, "");
  assert(declaration === evidence.composition_contract.folded_local_declaration, "legal split folded declaration changed");
  const followupCandidate =
    `alter table public.legal_story_entries\n` +
    `  add column if not exists ${declaration};`;
  assert(sha256(followupCandidate) === evidence.hosted_followup.statements_sha256, "legal split Hosted follow-up hash mismatch");
  return [evidence.local.name];
}

function verifyPlpgsqlEvidence(evidence, projectRef) {
  assert(evidence.project_ref === projectRef, "PLpgSQL proof project ref mismatch");
  assert(evidence.summary.ready_for_linked_apply === false, "PLpgSQL proof must remain non-apply evidence");
  assert(evidence.summary.ledger_identity_verified === 0, "PLpgSQL proof must not claim ledger identity");

  const proven = [];
  for (const entry of evidence.entries ?? []) {
    const source = localSourceFor(entry);
    const metadata = LOCAL_COMMENT_METADATA[entry.name] ?? [];
    assert(
      (entry.excluded_local_comment_metadata ?? []).length === metadata.length,
      `${entry.name}: excluded COMMENT metadata count mismatch`,
    );
    const executableSource = stripExplicitLocalCommentMetadata(entry.name, source);
    const tokens = tokenizeAllowlistedSqlPlpgsql(executableSource);
    assert(tokens.length === entry.remote_token_count, `${entry.name}: PLpgSQL token count mismatch`);
    assert(sha256(tokens.join(TOKEN_SEPARATOR)) === entry.remote_token_sha256, `${entry.name}: PLpgSQL token hash mismatch`);
    assert(entry.executable_token_source_equivalent === true, `${entry.name}: PLpgSQL proof is not affirmative`);
    assert(entry.ledger_identity_claimed === false, `${entry.name}: PLpgSQL proof claims ledger identity`);
    proven.push(entry.name);
  }
  return proven;
}

export function buildSupplementalProvenanceReport({
  snapshotPath = DEFAULT_SNAPSHOT,
  migrationDir = DEFAULT_MIGRATION_DIR,
  simpleEvidencePath = SIMPLE_EVIDENCE,
  legalSplitEvidencePath = LEGAL_SPLIT_EVIDENCE,
  plpgsqlEvidencePath = PLPGSQL_EVIDENCE,
} = {}) {
  const snapshot = loadJson(snapshotPath);
  const base = compareHostedSourceFingerprints({
    snapshot,
    localMigrations: loadLocalMigrations(migrationDir),
  });

  assert(base.missing_local_names.length === 0, "base provenance has missing local migration names");
  assert(base.duplicate_local_names.length === 0, "base provenance has duplicate local migration names");

  const unresolved = base.checked
    .filter((row) => !row.provenance_equivalent)
    .map((row) => row.name)
    .sort();
  const expected = [...EXPECTED_RESIDUAL_NAMES].sort();
  assert(JSON.stringify(unresolved) === JSON.stringify(expected), `unexpected base residual set: ${unresolved.join(",")}`);

  const projectRef = snapshot.project_ref;
  const supplemental = [
    ...verifySimpleEvidence(loadJson(simpleEvidencePath), projectRef),
    ...verifyLegalSplitEvidence(loadJson(legalSplitEvidencePath), projectRef),
    ...verifyPlpgsqlEvidence(loadJson(plpgsqlEvidencePath), projectRef),
  ].sort();
  assert(JSON.stringify(supplemental) === JSON.stringify(expected), `supplemental proof coverage mismatch: ${supplemental.join(",")}`);

  return {
    contract_version: 1,
    evidence_scope:
      "Hosted same-name migration source provenance only. Five conservative residuals are accepted only through narrow machine-verified supplemental proofs. No proof here establishes migration-version/ledger identity or authorizes repair, push, deploy, Hosted mutation, or Country READY.",
    project_ref: projectRef,
    snapshot_captured_at: snapshot.captured_at ?? null,
    base_counts: base.counts,
    base_ready_for_provenance_reconciliation: base.ready_for_provenance_reconciliation,
    base_unresolved_names: unresolved,
    supplemental_proven_names: supplemental,
    supplemental_proof_count: supplemental.length,
    ledger_identity_verified: 0,
    ready_for_provenance_reconciliation: true,
    ready_for_apply: false,
  };
}

function main() {
  try {
    const report = buildSupplementalProvenanceReport({
      snapshotPath: process.argv[2] ?? DEFAULT_SNAPSHOT,
      migrationDir: process.argv[3] ?? DEFAULT_MIGRATION_DIR,
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({ ready_for_provenance_reconciliation: false, ready_for_apply: false, error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`,
    );
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) main();
