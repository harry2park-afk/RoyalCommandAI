import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath =
  "scripts/supabase-hosted-migration-20260920091809-body-evidence.json";

const raw = fs.readFileSync(evidencePath, "utf8");
const evidence = JSON.parse(raw) as {
  migration: {
    version: string;
    name: string;
    statement_count: number;
    statement_md5: string;
    exact_statement_recovered_from_hosted_ledger: boolean;
    exact_statement_copied_to_public_repository: boolean;
  };
  source: {
    query_mode: string;
    hosted_mutation_performed: boolean;
  };
  verified_structural_facts: Record<string, boolean>;
  hosted_acl_root_cause: {
    table_owner_role: string;
    postgres_public_table_default_acl_grants_authenticated_all: boolean;
    postgres_public_table_default_acl_grants_anon_all: boolean;
    migration_explicitly_revokes_anon: boolean;
    migration_explicitly_revokes_authenticated: boolean;
    current_authenticated_privileges: string[];
    current_anon_table_privileges: number;
    root_cause_verified: boolean;
    root_cause: string;
  };
  deployment_checkpoint: {
    repository: string;
    commit_sha: string;
    commit_timestamp_utc: string;
    commit_message: string;
    file: string;
    branch_observed: string;
    migration_version_timestamp_utc: string;
    checkpoint_seconds_after_migration_version: number;
    states_named_migration_was_applied_to_royalcommand_supabase: boolean;
    states_internal_uuid_remains_security_identity: boolean;
    states_customer_number_is_not_access_authority: boolean;
    copies_customer_specific_value_into_this_evidence: boolean;
    checkpoint_is_original_sql_artifact: boolean;
    checkpoint_is_independent_reviewer_approval: boolean;
  };
  deployment_trust: {
    hosted_statement_body_recovered: boolean;
    ledger_created_by_present: boolean;
    ledger_created_by_value_published: boolean;
    deployment_checkpoint_provenance_verified: boolean;
    original_git_source_provenance_verified: boolean;
    reviewer_provenance_verified: boolean;
    safe_for_replay: boolean;
    trusted_baseline_may_advance: boolean;
    status: string;
  };
  launch_implication: {
    previous_body_unknown_blocker_narrowed: boolean;
    deployment_checkpoint_blocker_narrowed: boolean;
    customer_account_acl_root_cause_verified: boolean;
    customer_account_authority_verified: boolean;
    allocator_verified: boolean;
    country_ready: boolean;
  };
};

describe("Hosted migration 20260920091809 redacted body evidence", () => {
  it("records the exact Hosted-ledger fingerprint without publishing customer identifiers", () => {
    expect(evidence.migration.version).toBe("20260920091809");
    expect(evidence.migration.name).toBe("add_secure_rc_customer_numbers");
    expect(evidence.migration.statement_count).toBe(1);
    expect(evidence.migration.statement_md5).toMatch(/^[0-9a-f]{32}$/);
    expect(evidence.migration.exact_statement_recovered_from_hosted_ledger).toBe(true);
    expect(evidence.migration.exact_statement_copied_to_public_repository).toBe(false);
    expect(raw).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    );
    expect(raw).not.toMatch(/\bRC\s+[0-9]{7}\b/);
    expect(raw).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });

  it("captures the authority and allocator defects observed in the exact Hosted statement", () => {
    expect(evidence.verified_structural_facts.creates_rc_customer_accounts).toBe(true);
    expect(evidence.verified_structural_facts.enables_rls).toBe(true);
    expect(
      evidence.verified_structural_facts.creates_authenticated_own_row_select_policy,
    ).toBe(true);
    expect(evidence.verified_structural_facts.grants_authenticated_select).toBe(true);
    expect(evidence.verified_structural_facts.revokes_anon_table_privileges).toBe(true);
    expect(evidence.verified_structural_facts.revokes_authenticated_table_privileges).toBe(false);
    expect(evidence.verified_structural_facts.contains_customer_specific_backfill).toBe(true);
    expect(evidence.verified_structural_facts.creates_allocator_function).toBe(false);
    expect(evidence.verified_structural_facts.creates_allocator_trigger).toBe(false);
    expect(evidence.verified_structural_facts.creates_allocator_default).toBe(false);
  });

  it("pins the current broad authenticated grants to the public-schema default ACL plus missing authenticated revoke", () => {
    const acl = evidence.hosted_acl_root_cause;

    expect(acl.table_owner_role).toBe("postgres");
    expect(acl.postgres_public_table_default_acl_grants_authenticated_all).toBe(true);
    expect(acl.postgres_public_table_default_acl_grants_anon_all).toBe(true);
    expect(acl.migration_explicitly_revokes_anon).toBe(true);
    expect(acl.migration_explicitly_revokes_authenticated).toBe(false);
    expect(acl.current_authenticated_privileges.sort()).toEqual(
      ["DELETE", "INSERT", "REFERENCES", "SELECT", "TRIGGER", "TRUNCATE", "UPDATE"].sort(),
    );
    expect(acl.current_anon_table_privileges).toBe(0);
    expect(acl.root_cause_verified).toBe(true);
    expect(evidence.launch_implication.customer_account_acl_root_cause_verified).toBe(true);
    expect(evidence.launch_implication.customer_account_authority_verified).toBe(false);
  });

  it("binds the contemporaneous GitHub checkpoint without misclassifying it as source or review approval", () => {
    const checkpoint = evidence.deployment_checkpoint;

    expect(checkpoint.repository).toBe("harry2park-afk/RoyalCommandAI");
    expect(checkpoint.commit_sha).toBe("f4a61d2e76adf481d5869a9501119bbf423f83f5");
    expect(checkpoint.commit_timestamp_utc).toBe("2026-09-20T09:20:20Z");
    expect(checkpoint.file).toBe("docs/continuity/SESSION_LOG.md");
    expect(checkpoint.migration_version_timestamp_utc).toBe("2026-09-20T09:18:09Z");
    expect(checkpoint.checkpoint_seconds_after_migration_version).toBe(131);
    expect(checkpoint.states_named_migration_was_applied_to_royalcommand_supabase).toBe(true);
    expect(checkpoint.states_internal_uuid_remains_security_identity).toBe(true);
    expect(checkpoint.states_customer_number_is_not_access_authority).toBe(true);
    expect(checkpoint.copies_customer_specific_value_into_this_evidence).toBe(false);
    expect(checkpoint.checkpoint_is_original_sql_artifact).toBe(false);
    expect(checkpoint.checkpoint_is_independent_reviewer_approval).toBe(false);
    expect(evidence.launch_implication.deployment_checkpoint_blocker_narrowed).toBe(true);
  });

  it("narrows deployment provenance without pretending source or reviewer provenance is closed", () => {
    expect(evidence.source.query_mode).toBe("READ_ONLY");
    expect(evidence.source.hosted_mutation_performed).toBe(false);
    expect(evidence.deployment_trust.hosted_statement_body_recovered).toBe(true);
    expect(evidence.deployment_trust.ledger_created_by_present).toBe(true);
    expect(evidence.deployment_trust.ledger_created_by_value_published).toBe(false);
    expect(evidence.deployment_trust.deployment_checkpoint_provenance_verified).toBe(true);
    expect(evidence.deployment_trust.original_git_source_provenance_verified).toBe(false);
    expect(evidence.deployment_trust.reviewer_provenance_verified).toBe(false);
    expect(evidence.deployment_trust.safe_for_replay).toBe(false);
    expect(evidence.deployment_trust.trusted_baseline_may_advance).toBe(false);
    expect(evidence.deployment_trust.status).toBe(
      "BODY_ACL_AND_DEPLOYMENT_CHECKPOINT_RECOVERED_SOURCE_AND_REVIEW_PROVENANCE_UNRESOLVED",
    );
    expect(evidence.launch_implication.previous_body_unknown_blocker_narrowed).toBe(true);
    expect(evidence.launch_implication.allocator_verified).toBe(false);
    expect(evidence.launch_implication.country_ready).toBe(false);
  });
});
