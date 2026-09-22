import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath =
  "scripts/october-first-wave-launch-evidence-20260922-1047.json";
const raw = fs.readFileSync(evidencePath, "utf8");
const evidence = JSON.parse(raw) as {
  stable_baseline: {
    production_master_sha: string;
    pre_increment_pr_head_sha: string;
    restore_branch: string;
    production_mutation_performed: boolean;
    hosted_mutation_performed: boolean;
  };
  hosted_ledger: {
    rows: number;
    migration_20260920091809_rows: number;
    max_version: string;
    migration_source_provenance_verified: boolean;
    migration_reviewer_provenance_verified: boolean;
    trusted_baseline_may_advance: boolean;
  };
  migration_76_source_scan: {
    checkpoint_commit_changed_only_session_log: boolean;
    exact_sql_path_present_at_checkpoint_commit: boolean;
    exact_sql_path_present_at_checkpoint_parent: boolean;
    exact_sql_path_present_at_restore_2330_source: boolean;
    exact_sql_path_present_at_restore_2330_pr748_preview: boolean;
    default_branch_exact_name_code_search_count: number;
    default_branch_code_search_complete: boolean;
    exact_name_commit_search_count: number;
    deployment_checkpoint_verified: boolean;
    original_sql_artifact_verified: boolean;
    independent_reviewer_verified: boolean;
    safe_for_historical_replay: boolean;
    status: string;
  };
  first_wave: Array<{
    country_code: string;
    expected_locale: string;
    manifest_rows: number;
    exact_locale_rows: number;
    exact_runtime_rows: number;
    country_terms_rows: number;
    positive_local_terms_rows: number;
    provider_offers_rows: number;
    recording_policy_rows: number;
    reviewer_proven_recording_approvals: number;
    disposition: string;
  }>;
  authorization_and_data_isolation: {
    room_factory_manifests_anon_privileges: string[];
    room_factory_manifests_authenticated_privileges: string[];
    rc_customer_accounts_authenticated_privileges: string[];
    hosted_least_privilege_verified: boolean;
  };
  payments_and_operations: {
    providers_rows: number;
    active_providers_rows: number;
    service_connection_orders_rows: number;
    payment_named_tables_rows: number;
    service_order_idempotency_columns: number;
    payment_runtime_verified: boolean;
  };
  security_advisor: {
    rls_enabled_no_policy_count: number;
    level: string;
    classification: string;
    tables_with_anon_privileges: number;
    tables_with_authenticated_privileges: number;
    tables_with_service_role_privileges: number;
    direct_client_exposure_from_this_finding_family: boolean;
    security_regression_verified: boolean;
  };
  repository_verification_before_increment: Record<string, string>;
  release_decision: {
    first_wave_ready: boolean;
    country_ready_claimed: boolean;
    required_next_gate: string;
  };
};

const expectedLocales = new Map([
  ["AU", "en-AU"],
  ["US", "en-US"],
  ["CA", "en-CA"],
  ["KR", "ko-KR"],
  ["JP", "ja-JP"],
  ["GB", "en-GB"],
]);

const broadWritePrivileges = ["DELETE", "INSERT", "TRUNCATE", "UPDATE"];

describe("October first-wave launch evidence 2026-09-22 10:47", () => {
  it("preserves the stable baseline and proves this increment did not mutate Production or Hosted", () => {
    expect(evidence.stable_baseline.production_master_sha).toBe(
      "33da2a917dc6adcf266f59f0b27d18a56f1271d8",
    );
    expect(evidence.stable_baseline.pre_increment_pr_head_sha).toBe(
      "bab8925a871f9731be5ac633a51d09b4831d4fe3",
    );
    expect(evidence.stable_baseline.restore_branch).toBe(
      "restore/2026-09-22-1047-pr696-pre-post-migration-source-scan",
    );
    expect(evidence.stable_baseline.production_mutation_performed).toBe(false);
    expect(evidence.stable_baseline.hosted_mutation_performed).toBe(false);
  });

  it("keeps migration 76 quarantined despite the deployment checkpoint", () => {
    expect(evidence.hosted_ledger.rows).toBe(79);
    expect(evidence.hosted_ledger.migration_20260920091809_rows).toBe(1);
    expect(evidence.hosted_ledger.max_version).toBe("20260921052125");
    expect(evidence.migration_76_source_scan.deployment_checkpoint_verified).toBe(true);
    expect(evidence.migration_76_source_scan.checkpoint_commit_changed_only_session_log).toBe(
      true,
    );
    expect(evidence.migration_76_source_scan.exact_sql_path_present_at_checkpoint_commit).toBe(
      false,
    );
    expect(evidence.migration_76_source_scan.exact_sql_path_present_at_checkpoint_parent).toBe(
      false,
    );
    expect(evidence.migration_76_source_scan.exact_sql_path_present_at_restore_2330_source).toBe(
      false,
    );
    expect(
      evidence.migration_76_source_scan.exact_sql_path_present_at_restore_2330_pr748_preview,
    ).toBe(false);
    expect(evidence.migration_76_source_scan.default_branch_exact_name_code_search_count).toBe(0);
    expect(evidence.migration_76_source_scan.default_branch_code_search_complete).toBe(false);
    expect(evidence.migration_76_source_scan.exact_name_commit_search_count).toBe(0);
    expect(evidence.migration_76_source_scan.original_sql_artifact_verified).toBe(false);
    expect(evidence.migration_76_source_scan.independent_reviewer_verified).toBe(false);
    expect(evidence.migration_76_source_scan.safe_for_historical_replay).toBe(false);
    expect(evidence.hosted_ledger.migration_source_provenance_verified).toBe(false);
    expect(evidence.hosted_ledger.migration_reviewer_provenance_verified).toBe(false);
    expect(evidence.hosted_ledger.trusted_baseline_may_advance).toBe(false);
    expect(evidence.migration_76_source_scan.status).toBe(
      "DEPLOYMENT_CHECKPOINT_VERIFIED_ORIGINAL_SOURCE_AND_REVIEWER_UNRESOLVED",
    );
  });

  it("requires exact locale and encounter-backed runtime for every first-wave country", () => {
    expect(evidence.first_wave).toHaveLength(6);
    for (const country of evidence.first_wave) {
      expect(expectedLocales.get(country.country_code)).toBe(country.expected_locale);
      expect(country.exact_locale_rows).toBe(0);
      expect(country.exact_runtime_rows).toBe(0);
      expect(country.country_terms_rows).toBe(0);
      expect(country.positive_local_terms_rows).toBe(0);
      expect(country.provider_offers_rows).toBe(0);
      expect(country.recording_policy_rows).toBe(1);
      expect(country.reviewer_proven_recording_approvals).toBe(0);
      expect(country.disposition).toBe("HOLD");
    }
    expect(evidence.first_wave.find((country) => country.country_code === "AU")?.manifest_rows).toBe(
      7,
    );
  });

  it("fails closed while broad direct-write grants remain on Room Factory and customer accounts", () => {
    for (const privilege of broadWritePrivileges) {
      expect(evidence.authorization_and_data_isolation.room_factory_manifests_anon_privileges).toContain(
        privilege,
      );
      expect(
        evidence.authorization_and_data_isolation.room_factory_manifests_authenticated_privileges,
      ).toContain(privilege);
      expect(
        evidence.authorization_and_data_isolation.rc_customer_accounts_authenticated_privileges,
      ).toContain(privilege);
    }
    expect(evidence.authorization_and_data_isolation.hosted_least_privilege_verified).toBe(false);
  });

  it("fails closed on payment and operational readiness", () => {
    expect(evidence.payments_and_operations.providers_rows).toBe(0);
    expect(evidence.payments_and_operations.active_providers_rows).toBe(0);
    expect(evidence.payments_and_operations.service_connection_orders_rows).toBe(0);
    expect(evidence.payments_and_operations.payment_named_tables_rows).toBe(0);
    expect(evidence.payments_and_operations.service_order_idempotency_columns).toBe(0);
    expect(evidence.payments_and_operations.payment_runtime_verified).toBe(false);
  });

  it("classifies the current advisor family as service-role-only without promoting overall security readiness", () => {
    expect(evidence.security_advisor.rls_enabled_no_policy_count).toBe(19);
    expect(evidence.security_advisor.level).toBe("INFO");
    expect(evidence.security_advisor.classification).toBe("REVIEWED_SERVICE_ROLE_ONLY");
    expect(evidence.security_advisor.tables_with_anon_privileges).toBe(0);
    expect(evidence.security_advisor.tables_with_authenticated_privileges).toBe(0);
    expect(evidence.security_advisor.tables_with_service_role_privileges).toBe(19);
    expect(evidence.security_advisor.direct_client_exposure_from_this_finding_family).toBe(false);
    expect(evidence.security_advisor.security_regression_verified).toBe(false);
  });

  it("records completed repository evidence without promoting the Draft to launch-ready", () => {
    const checks = evidence.repository_verification_before_increment;
    expect(checks.quality_gate).toBe("SUCCESS");
    expect(checks.conflict_guard).toBe("SUCCESS");
    expect(checks.hosted_ledger_preflight).toBe("SUCCESS");
    expect(checks.clean_replay).toBe("SUCCESS");
    expect(checks.room_factory_concurrency).toBe("SUCCESS");
    expect(checks.legal_matter_tenant_isolation).toBe("SUCCESS");
    expect(checks.customer_account_authority).toBe("SUCCESS");
    expect(checks.linked_dry_run).toBe("EXPECTED_FAIL_CLOSED_ON_UNRESOLVED_LEDGER_DRIFT");
    expect(checks.change_control).toBe("SKIPPED_DRAFT_NOT_PASS");
    expect(evidence.release_decision.first_wave_ready).toBe(false);
    expect(evidence.release_decision.country_ready_claimed).toBe(false);
  });

  it("contains no customer number or email address", () => {
    expect(raw).not.toMatch(/\bRC\s+[0-9]{7}\b/);
    expect(raw).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });
});
