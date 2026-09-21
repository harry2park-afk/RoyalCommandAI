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
  deployment_trust: {
    hosted_statement_body_recovered: boolean;
    original_git_source_provenance_verified: boolean;
    reviewer_provenance_verified: boolean;
    safe_for_replay: boolean;
    trusted_baseline_may_advance: boolean;
    status: string;
  };
  launch_implication: {
    previous_body_unknown_blocker_narrowed: boolean;
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

  it("narrows the body-unknown blocker without pretending deployment provenance is closed", () => {
    expect(evidence.source.query_mode).toBe("READ_ONLY");
    expect(evidence.source.hosted_mutation_performed).toBe(false);
    expect(evidence.deployment_trust.hosted_statement_body_recovered).toBe(true);
    expect(evidence.deployment_trust.original_git_source_provenance_verified).toBe(false);
    expect(evidence.deployment_trust.reviewer_provenance_verified).toBe(false);
    expect(evidence.deployment_trust.safe_for_replay).toBe(false);
    expect(evidence.deployment_trust.trusted_baseline_may_advance).toBe(false);
    expect(evidence.deployment_trust.status).toBe(
      "BODY_RECOVERED_GIT_AND_REVIEW_PROVENANCE_UNRESOLVED",
    );
    expect(evidence.launch_implication.previous_body_unknown_blocker_narrowed).toBe(true);
    expect(evidence.launch_implication.customer_account_authority_verified).toBe(false);
    expect(evidence.launch_implication.allocator_verified).toBe(false);
    expect(evidence.launch_implication.country_ready).toBe(false);
  });
});
