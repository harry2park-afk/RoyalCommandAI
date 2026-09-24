#!/usr/bin/env bash
set -euo pipefail

# Evidence-only helper for launch blocker #662.
# Remote-mutating commands are intentionally absent. This script links a
# temporary evidence-only Supabase CLI workdir to the expected project, reads
# migration history, and asks Supabase CLI for the db-push apply set with
# --dry-run. The canonical migration tree is never used as a push workdir.

EXPECTED_PROJECT_REF="aygawkavujjmybekswrg"
EVIDENCE_DIR="${1:-artifacts/supabase-linked-dry-run}"
EXPECTED_APPLY_MIGRATIONS="${EXPECTED_APPLY_MIGRATIONS:-}"
HOSTED_LEDGER_SNAPSHOT="scripts/supabase-hosted-ledger-snapshot-20260920.json"
HOSTED_DRIFT_EVIDENCE="scripts/supabase-hosted-drift-evidence-20260921.json"
CLASSIFICATION_MANIFEST="scripts/supabase-unresolved-local-migration-classification-20260920.json"

fail() {
  printf 'BLOCKED: %s\n' "$*" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v supabase >/dev/null 2>&1 || fail "Supabase CLI is required"

[[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]] || fail "SUPABASE_ACCESS_TOKEN is not set"
[[ -n "${SUPABASE_DB_PASSWORD:-}" ]] || fail "SUPABASE_DB_PASSWORD is not set"
[[ -n "$EXPECTED_APPLY_MIGRATIONS" ]] || fail "EXPECTED_APPLY_MIGRATIONS must explicitly name the only migration(s) allowed by this dry-run"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || fail "run from a Git checkout"
cd "$repo_root"

# Project identity is a release-safety boundary. Refuse to link if the canonical
# repository config and this evidence harness do not name the same Hosted project.
config_file="supabase/config.toml"
[[ -f "$config_file" ]] || fail "supabase/config.toml is missing"
configured_project_ref="$(awk -F'"' '/^[[:space:]]*project_id[[:space:]]*=/{print $2; exit}' "$config_file")"
[[ "$configured_project_ref" =~ ^[a-z0-9]+$ ]] || fail "configured project ref is missing or malformed"
[[ "$configured_project_ref" == "$EXPECTED_PROJECT_REF" ]] \
  || fail "configured project ref mismatch: expected $EXPECTED_PROJECT_REF, got $configured_project_ref"

# Do not collect release evidence from a dirty checkout.
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  fail "tracked files are dirty; use an exact clean candidate checkout"
fi

# A linked dry-run must never be built from a known-stale Hosted history. The
# observed 76th migration remains provenance-unresolved, so this guard currently
# blocks before any Supabase link or credentialed Hosted read. It can pass only
# after reviewed evidence advances the trusted snapshot to the exact observed
# count/head and marks provenance RESOLVED.
node scripts/supabase-hosted-drift-guard.mjs \
  "$HOSTED_DRIFT_EVIDENCE" \
  "$HOSTED_LEDGER_SNAPSHOT"

mkdir -p "$EVIDENCE_DIR"

head_sha="$(git rev-parse HEAD)"
branch_name="$(git rev-parse --abbrev-ref HEAD)"
cli_version="$(supabase --version)"

{
  printf 'git_head=%s\n' "$head_sha"
  printf 'git_branch=%s\n' "$branch_name"
  printf 'expected_project_ref=%s\n' "$EXPECTED_PROJECT_REF"
  printf 'configured_project_ref=%s\n' "$configured_project_ref"
  printf 'expected_apply_migrations=%s\n' "$EXPECTED_APPLY_MIGRATIONS"
  printf 'trusted_hosted_ledger_snapshot=%s\n' "$HOSTED_LEDGER_SNAPSHOT"
  printf 'hosted_drift_evidence=%s\n' "$HOSTED_DRIFT_EVIDENCE"
  printf 'supabase_cli=%s\n' "$cli_version"
  printf 'generated_at_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$EVIDENCE_DIR/metadata.txt"

find supabase/migrations -maxdepth 1 -type f -name '*.sql' -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  > "$EVIDENCE_DIR/canonical-local-migration-sha256.txt"

# Re-prove that the environment allow-list exactly matches the reviewed
# NEW_CANDIDATE_EXPECTED_APPLY entries before constructing any CLI workdir.
node scripts/supabase-linked-allowlist-provenance.mjs \
  "$CLASSIFICATION_MANIFEST" \
  "$EXPECTED_APPLY_MIGRATIONS" \
  > "$EVIDENCE_DIR/allowlist-provenance.txt"

# Build a disposable CLI history view. It contains one comment-only marker for
# each trusted Hosted timestamp plus byte-identical SQL for only the reviewed
# candidate migrations. Historical local-only files are deliberately
# quarantined and never exposed to db push.
shadow_root="$repo_root/artifacts/supabase-linked-shadow-workdir-${head_sha}"
node scripts/supabase-linked-shadow-workdir.mjs \
  "$HOSTED_LEDGER_SNAPSHOT" \
  "$CLASSIFICATION_MANIFEST" \
  supabase \
  "$shadow_root" \
  "$EVIDENCE_DIR/shadow-workdir-plan.json"

export SUPABASE_WORKDIR="$shadow_root"
shadow_migration_dir="$SUPABASE_WORKDIR/supabase/migrations"

# `supabase link` changes only local CLI link state. The DB password is supplied
# via environment so it is not placed on the command line or echoed here.
supabase link --project-ref "$EXPECTED_PROJECT_REF"

linked_ref_file="$SUPABASE_WORKDIR/supabase/.temp/project-ref"
[[ -f "$linked_ref_file" ]] || fail "Supabase CLI did not write a linked project ref in the isolated workdir"
linked_ref="$(tr -d '[:space:]' < "$linked_ref_file")"
[[ "$linked_ref" == "$EXPECTED_PROJECT_REF" ]] \
  || fail "linked project ref mismatch: expected $EXPECTED_PROJECT_REF, got $linked_ref"

printf 'linked_project_ref=%s\n' "$linked_ref" | tee -a "$EVIDENCE_DIR/metadata.txt"
printf 'supabase_workdir=%s\n' "$SUPABASE_WORKDIR" | tee -a "$EVIDENCE_DIR/metadata.txt"

# Read-only history comparison. Never substitute migration repair for this step.
set +e
supabase migration list --linked 2>&1 | tee "$EVIDENCE_DIR/migration-list.txt"
list_status=${PIPESTATUS[0]}
set -e
[[ $list_status -eq 0 ]] || fail "supabase migration list --linked failed"

# Convert the exact CLI table into a deterministic exact/local-only/remote-only
# map using only the isolated shadow migration inventory.
set +e
node scripts/supabase-migration-reconciliation.mjs \
  "$EVIDENCE_DIR/migration-list.txt" \
  "$shadow_migration_dir" \
  "$EVIDENCE_DIR/migration-reconciliation.json" \
  2>&1 | tee "$EVIDENCE_DIR/migration-reconciliation-summary.txt"
reconciliation_status=${PIPESTATUS[0]}
set -e
[[ $reconciliation_status -eq 0 ]] || fail "migration-list reconciliation could not be proven from exact CLI output"

# Some reviewed candidates predate the current Hosted migration head. Supabase
# CLI explicitly requires --include-all to show such missing-remote migrations.
# This flag is safe here only because the disposable workdir contains trusted
# Hosted history markers plus exactly the explicit reviewed allow-list. The
# canonical local history is not in SUPABASE_WORKDIR, --dry-run is mandatory,
# and the output is independently checked against the allow-list before evidence
# can pass.
set +e
supabase db push --linked --dry-run --include-all 2>&1 | tee "$EVIDENCE_DIR/db-push-dry-run.txt"
dry_run_status=${PIPESTATUS[0]}
set -e
[[ $dry_run_status -eq 0 ]] || fail "supabase db push --linked --dry-run --include-all failed"

IFS=',' read -r -a expected_apply_raw <<< "$EXPECTED_APPLY_MIGRATIONS"
expected_apply=()
for migration in "${expected_apply_raw[@]}"; do
  migration="${migration#"${migration%%[![:space:]]*}"}"
  migration="${migration%"${migration##*[![:space:]]}"}"
  [[ -n "$migration" ]] || fail "EXPECTED_APPLY_MIGRATIONS contains an empty entry"
  expected_apply+=("$migration")
done

set +e
node scripts/supabase-dry-run-apply-set.mjs \
  "$EVIDENCE_DIR/db-push-dry-run.txt" \
  "$shadow_migration_dir" \
  "${expected_apply[@]}" \
  2>&1 | tee "$EVIDENCE_DIR/apply-set-verification.txt"
apply_set_status=${PIPESTATUS[0]}
set -e
[[ $apply_set_status -eq 0 ]] || fail "dry-run apply set does not exactly match the reviewed allow-list"

printf 'VERIFIED_EVIDENCE_CAPTURED git_head=%s project_ref=%s\n' \
  "$head_sha" "$linked_ref"
printf 'Review %s/shadow-workdir-plan.json, %s/migration-list.txt, %s/migration-reconciliation.json, %s/db-push-dry-run.txt and %s/apply-set-verification.txt before any Hosted staging.\n' \
  "$EVIDENCE_DIR" "$EVIDENCE_DIR" "$EVIDENCE_DIR" "$EVIDENCE_DIR" "$EVIDENCE_DIR"
