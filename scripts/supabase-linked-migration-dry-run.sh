#!/usr/bin/env bash
set -euo pipefail

# Evidence-only helper for launch blocker #662.
# Remote-mutating commands are intentionally absent. This script may link the
# local checkout to the expected project, then only reads migration history and
# asks Supabase CLI for the db-push apply set with --dry-run.

EXPECTED_PROJECT_REF="aygawkavujjmybekswrg"
EVIDENCE_DIR="${1:-artifacts/supabase-linked-dry-run}"
EXPECTED_APPLY_MIGRATIONS="${EXPECTED_APPLY_MIGRATIONS:-20260901025800_room_factory_atomic_non_encounter.sql}"

fail() {
  printf 'BLOCKED: %s\n' "$*" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v supabase >/dev/null 2>&1 || fail "Supabase CLI is required"

[[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]] || fail "SUPABASE_ACCESS_TOKEN is not set"
[[ -n "${SUPABASE_DB_PASSWORD:-}" ]] || fail "SUPABASE_DB_PASSWORD is not set"
[[ -n "$EXPECTED_APPLY_MIGRATIONS" ]] || fail "EXPECTED_APPLY_MIGRATIONS must not be empty"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || fail "run from a Git checkout"
cd "$repo_root"

# Do not collect release evidence from a dirty checkout.
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  fail "tracked files are dirty; use an exact clean candidate checkout"
fi

mkdir -p "$EVIDENCE_DIR"

head_sha="$(git rev-parse HEAD)"
branch_name="$(git rev-parse --abbrev-ref HEAD)"
cli_version="$(supabase --version)"

{
  printf 'git_head=%s\n' "$head_sha"
  printf 'git_branch=%s\n' "$branch_name"
  printf 'expected_project_ref=%s\n' "$EXPECTED_PROJECT_REF"
  printf 'expected_apply_migrations=%s\n' "$EXPECTED_APPLY_MIGRATIONS"
  printf 'supabase_cli=%s\n' "$cli_version"
  printf 'generated_at_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$EVIDENCE_DIR/metadata.txt"

find supabase/migrations -maxdepth 1 -type f -name '*.sql' -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  > "$EVIDENCE_DIR/local-migration-sha256.txt"

# `supabase link` changes only local CLI link state. The DB password is supplied
# via environment so it is not placed on the command line or echoed here.
supabase link --project-ref "$EXPECTED_PROJECT_REF"

linked_ref_file="supabase/.temp/project-ref"
[[ -f "$linked_ref_file" ]] || fail "Supabase CLI did not write a linked project ref"
linked_ref="$(tr -d '[:space:]' < "$linked_ref_file")"
[[ "$linked_ref" == "$EXPECTED_PROJECT_REF" ]] \
  || fail "linked project ref mismatch: expected $EXPECTED_PROJECT_REF, got $linked_ref"

printf 'linked_project_ref=%s\n' "$linked_ref" | tee -a "$EVIDENCE_DIR/metadata.txt"

# Read-only history comparison. Never substitute migration repair for this step.
set +e
supabase migration list --linked 2>&1 | tee "$EVIDENCE_DIR/migration-list.txt"
list_status=${PIPESTATUS[0]}
set -e
[[ $list_status -eq 0 ]] || fail "supabase migration list --linked failed"

# Critical safety boundary: --dry-run is mandatory and --include-all is absent.
# This prints what would be applied but must not apply migrations.
set +e
supabase db push --linked --dry-run 2>&1 | tee "$EVIDENCE_DIR/db-push-dry-run.txt"
dry_run_status=${PIPESTATUS[0]}
set -e
[[ $dry_run_status -eq 0 ]] || fail "supabase db push --linked --dry-run failed"

# Fail closed unless the dry-run exposes exactly the explicitly allow-listed local
# migration versions. The default allow-list is the current Room Factory schema-
# stage migration. Later candidates must override EXPECTED_APPLY_MIGRATIONS
# deliberately with a comma-separated list; an empty or unrecognizable apply set
# is never treated as safe.
IFS=',' read -r -a expected_apply <<< "$EXPECTED_APPLY_MIGRATIONS"
set +e
node scripts/supabase-dry-run-apply-set.mjs \
  "$EVIDENCE_DIR/db-push-dry-run.txt" \
  "supabase/migrations" \
  "${expected_apply[@]}" \
  2>&1 | tee "$EVIDENCE_DIR/apply-set-verification.txt"
apply_set_status=${PIPESTATUS[0]}
set -e
[[ $apply_set_status -eq 0 ]] || fail "dry-run apply set does not exactly match the allow-list"

printf 'VERIFIED_EVIDENCE_CAPTURED git_head=%s project_ref=%s\n' \
  "$head_sha" "$linked_ref"
printf 'Review %s/migration-list.txt, %s/db-push-dry-run.txt and %s/apply-set-verification.txt before any Hosted staging.\n' \
  "$EVIDENCE_DIR" "$EVIDENCE_DIR" "$EVIDENCE_DIR"
