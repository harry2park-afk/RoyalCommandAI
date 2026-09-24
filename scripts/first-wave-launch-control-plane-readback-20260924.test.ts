import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath = "scripts/first-wave-launch-control-plane-readback-20260924-0049.json";
const evidenceRaw = fs.readFileSync(evidencePath, "utf8");
const evidence = JSON.parse(evidenceRaw) as {
  source: {
    query_mode: string;
    hosted_mutation_performed: boolean;
    production_master_sha: string;
    pre_change_pr_head_sha: string;
    restore_ref: string;
  };
  exact_head_workflows: Record<string, string>;
  supabase_control_plane: {
    development_branch_count: number;
    security_advisor_rls_enabled_no_policy_count: number;
  };
  room_factory_runtime: Array<{
    country_code: string;
    expected_locale: string;
    manifest_rows: number;
    exact_locale_rows: number;
    encounter_backed_rows: number;
    exact_runtime_rows: number;
  }>;
  commercial_runtime: {
    service_country_terms_total: number;
    service_providers_total: number;
    service_provider_offers_total: number;
    service_connection_orders_total: number;
  };
  recording_policy_review: Array<{
    country_code: string;
    policy_rows: number;
    reviewer_proven_rows: number;
  }>;
  hosted_write_authority: {
    profile_role_direct_update_blocked: boolean;
    matter_assignment_direct_update_blocked: boolean;
    room_factory_manifest_direct_write_blocked: boolean;
  };
  interpretation: {
    non_production_staging_verified: boolean;
    room_factory_runtime_verified: boolean;
    country_commercial_catalog_verified: boolean;
    recording_review_authority_verified: boolean;
    profile_role_authority_verified: boolean;
    legal_matter_assignment_authority_verified: boolean;
    room_factory_write_authority_verified: boolean;
    deployment_provenance_verified: boolean;
    first_wave_disposition: string;
    country_ready_claimed: boolean;
  };
};

const firstWave = ["AU", "US", "CA", "KR", "JP", "GB"];
const locales = ["en-AU", "en-US", "en-CA", "ko-KR", "ja-JP", "en-GB"];

describe("2026-09-24 first-wave launch control-plane readback", () => {
  it("preserves the read-only boundary and stable restore point", () => {
    expect(evidence.source.query_mode).toBe("READ_ONLY");
    expect(evidence.source.hosted_mutation_performed).toBe(false);
    expect(evidence.source.production_master_sha).toBe(
      "33da2a917dc6adcf266f59f0b27d18a56f1271d8",
    );
    expect(evidence.source.pre_change_pr_head_sha).toBe(
      "b6353fd7af58ec69a4081c333b3478cab6a7eb05",
    );
    expect(evidence.source.restore_ref).toBe(
      "restore/2026-09-24-0049-pr696-pre-room-factory-country-gate",
    );
  });

  it("records exact-head verification without promoting the fail-closed linked dry-run", () => {
    expect(evidence.exact_head_workflows.quality_gate).toBe("SUCCESS");
    expect(evidence.exact_head_workflows.conflict_guard).toBe("SUCCESS");
    expect(evidence.exact_head_workflows.hosted_ledger_preflight).toBe("SUCCESS");
    expect(evidence.exact_head_workflows.clean_replay).toBe("SUCCESS");
    expect(evidence.exact_head_workflows.room_factory_concurrency).toBe("SUCCESS");
    expect(evidence.exact_head_workflows.legal_matter_tenant_isolation).toBe("SUCCESS");
    expect(evidence.exact_head_workflows.customer_account_authority).toBe("SUCCESS");
    expect(evidence.exact_head_workflows.payment_operational).toBe("SUCCESS");
    expect(evidence.exact_head_workflows.linked_dry_run).toBe(
      "FAIL_CLOSED_ON_UNRESOLVED_HOSTED_LEDGER_DRIFT",
    );
  });

  it("keeps non-production staging and security review fail-closed", () => {
    expect(evidence.supabase_control_plane.development_branch_count).toBe(0);
    expect(evidence.supabase_control_plane.security_advisor_rls_enabled_no_policy_count).toBe(21);
    expect(evidence.interpretation.non_production_staging_verified).toBe(false);
  });

  it("records that none of the first-wave countries has exact encounter-backed runtime", () => {
    expect(evidence.room_factory_runtime.map((row) => row.country_code)).toEqual(firstWave);
    expect(evidence.room_factory_runtime.map((row) => row.expected_locale)).toEqual(locales);
    for (const row of evidence.room_factory_runtime) {
      expect(row.exact_locale_rows).toBe(0);
      expect(row.encounter_backed_rows).toBe(0);
      expect(row.exact_runtime_rows).toBe(0);
    }
    expect(evidence.interpretation.room_factory_runtime_verified).toBe(false);
  });

  it("records the commercial catalog as not yet populated", () => {
    expect(evidence.commercial_runtime).toEqual({
      service_country_terms_total: 0,
      service_providers_total: 0,
      service_provider_offers_total: 0,
      service_connection_orders_total: 0,
    });
    expect(evidence.interpretation.country_commercial_catalog_verified).toBe(false);
  });

  it("does not treat placeholder recording-policy rows as reviewer-proven compliance", () => {
    expect(evidence.recording_policy_review.map((row) => row.country_code)).toEqual(firstWave);
    for (const row of evidence.recording_policy_review) {
      expect(row.policy_rows).toBe(1);
      expect(row.reviewer_proven_rows).toBe(0);
    }
    expect(evidence.interpretation.recording_review_authority_verified).toBe(false);
  });

  it("keeps auth, legal assignment, and Room Factory write authority unverified", () => {
    expect(evidence.hosted_write_authority.profile_role_direct_update_blocked).toBe(false);
    expect(evidence.hosted_write_authority.matter_assignment_direct_update_blocked).toBe(false);
    expect(evidence.hosted_write_authority.room_factory_manifest_direct_write_blocked).toBe(false);
    expect(evidence.interpretation.profile_role_authority_verified).toBe(false);
    expect(evidence.interpretation.legal_matter_assignment_authority_verified).toBe(false);
    expect(evidence.interpretation.room_factory_write_authority_verified).toBe(false);
  });

  it("keeps deployment provenance and all first-wave countries on HOLD", () => {
    expect(evidence.interpretation.deployment_provenance_verified).toBe(false);
    expect(evidence.interpretation.first_wave_disposition).toBe("HOLD");
    expect(evidence.interpretation.country_ready_claimed).toBe(false);
  });

  it("contains no customer identifiers", () => {
    expect(evidenceRaw).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    );
    expect(evidenceRaw).not.toMatch(/\bRC\s+[0-9]{7}\b/);
  });
});
