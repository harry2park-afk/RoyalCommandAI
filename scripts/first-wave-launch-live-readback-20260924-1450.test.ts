import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath = "scripts/first-wave-launch-live-readback-20260924-1450.json";
const evidenceRaw = fs.readFileSync(evidencePath, "utf8");
const evidence = JSON.parse(evidenceRaw) as {
  source: {
    query_mode: string;
    hosted_mutation_performed: boolean;
    production_master_sha: string;
    pre_change_pr_head_sha: string;
    restore_ref: string;
  };
  evidence_tooling: {
    room_factory_locale_column: string;
    stale_snapshot_reference_detected: string;
    stale_snapshot_file: string;
  };
  supabase_control_plane: {
    development_branch_count: number;
    security_advisor_rls_enabled_no_policy_count: number;
  };
  required_launch_hardening_migrations: Record<string, number>;
  auth_country_authority: {
    auth_users_total: number;
    trusted_app_country_count: number;
    legacy_user_country_count: number;
    requested_country_count: number;
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
    country_terms: Array<{
      country_code: string;
      currency: string;
      term_rows: number;
      positive_available_terms: number;
    }>;
    providers_total: number;
    providers_active: number;
    offers_total: number;
    orders_total: number;
  };
  recording_policy_review: Array<{
    country_code: string;
    policy_rows: number;
    reviewer_proven_approved_rows: number;
  }>;
  hosted_write_authority: {
    profile_role_updateable_by_authenticated: boolean;
    profile_role_guard_trigger_count: number;
    matter_client_updateable_by_authenticated: boolean;
    matter_assignment_updateable_by_authenticated: boolean;
    legal_assignment_helper_present: boolean;
    room_factory_insert_by_authenticated: boolean;
    room_factory_authenticated_insert_policy_count: number;
    payment_order_insert_by_authenticated: boolean;
    payment_order_authenticated_insert_policy_count: number;
  };
  payment_operational_schema: {
    provider_registry_present: boolean;
    provider_events_present: boolean;
    service_order_idempotency_key_present: boolean;
  };
  interpretation: {
    first_wave_disposition: string;
    country_ready_claimed: boolean;
    non_production_staging_verified: boolean;
    room_factory_runtime_verified: boolean;
    country_commercial_catalog_verified: boolean;
    recording_review_authority_verified: boolean;
    auth_data_isolation_cutover_verified: boolean;
    payment_operational_cutover_verified: boolean;
    deployment_provenance_verified: boolean;
  };
};

const firstWave = ["AU", "US", "CA", "KR", "JP", "GB"];
const locales = ["en-AU", "en-US", "en-CA", "ko-KR", "ja-JP", "en-GB"];
const currencies = ["AUD", "USD", "CAD", "KRW", "JPY", "GBP"];

describe("2026-09-24 14:50 first-wave Hosted launch readback", () => {
  it("preserves the read-only Hosted boundary and restore point", () => {
    expect(evidence.source.query_mode).toBe("READ_ONLY");
    expect(evidence.source.hosted_mutation_performed).toBe(false);
    expect(evidence.source.production_master_sha).toBe(
      "33da2a917dc6adcf266f59f0b27d18a56f1271d8",
    );
    expect(evidence.source.pre_change_pr_head_sha).toBe(
      "5d4b1fb69b15647e8e0a09ee2d035b5c26e4a27d",
    );
    expect(evidence.source.restore_ref).toBe(
      "restore/2026-09-24-1448-pr696-pre-launch-snapshot-fix",
    );
  });

  it("records the live Room Factory locale column instead of trusting the stale helper", () => {
    expect(evidence.evidence_tooling.room_factory_locale_column).toBe("language_tag");
    expect(evidence.evidence_tooling.stale_snapshot_reference_detected).toBe("m.locale");
    expect(evidence.evidence_tooling.stale_snapshot_file).toBe(
      "scripts/supabase-first-wave-launch-snapshot.sql",
    );
  });

  it("keeps the launch-hardening migration set fail-closed", () => {
    expect(Object.keys(evidence.required_launch_hardening_migrations)).toHaveLength(8);
    for (const count of Object.values(evidence.required_launch_hardening_migrations)) {
      expect(count).toBe(0);
    }
  });

  it("records no development branch and the current security-advisor count", () => {
    expect(evidence.supabase_control_plane.development_branch_count).toBe(0);
    expect(evidence.supabase_control_plane.security_advisor_rls_enabled_no_policy_count).toBe(21);
    expect(evidence.interpretation.non_production_staging_verified).toBe(false);
  });

  it("keeps trusted country authority unassigned", () => {
    expect(evidence.auth_country_authority.auth_users_total).toBe(10);
    expect(evidence.auth_country_authority.trusted_app_country_count).toBe(0);
    expect(evidence.auth_country_authority.legacy_user_country_count).toBe(1);
    expect(evidence.auth_country_authority.requested_country_count).toBe(0);
  });

  it("records no exact encounter-backed first-wave runtime", () => {
    expect(evidence.room_factory_runtime.map((row) => row.country_code)).toEqual(firstWave);
    expect(evidence.room_factory_runtime.map((row) => row.expected_locale)).toEqual(locales);
    for (const row of evidence.room_factory_runtime) {
      expect(row.exact_locale_rows).toBe(0);
      expect(row.encounter_backed_rows).toBe(0);
      expect(row.exact_runtime_rows).toBe(0);
    }
    expect(evidence.interpretation.room_factory_runtime_verified).toBe(false);
  });

  it("records no first-wave country commercial authority", () => {
    expect(evidence.commercial_runtime.country_terms.map((row) => row.country_code)).toEqual(firstWave);
    expect(evidence.commercial_runtime.country_terms.map((row) => row.currency)).toEqual(currencies);
    for (const row of evidence.commercial_runtime.country_terms) {
      expect(row.term_rows).toBe(0);
      expect(row.positive_available_terms).toBe(0);
    }
    expect(evidence.commercial_runtime.providers_total).toBe(0);
    expect(evidence.commercial_runtime.offers_total).toBe(0);
    expect(evidence.commercial_runtime.orders_total).toBe(0);
    expect(evidence.interpretation.country_commercial_catalog_verified).toBe(false);
  });

  it("does not treat recording placeholders as reviewer-proven approval", () => {
    expect(evidence.recording_policy_review.map((row) => row.country_code)).toEqual(firstWave);
    for (const row of evidence.recording_policy_review) {
      expect(row.policy_rows).toBe(1);
      expect(row.reviewer_proven_approved_rows).toBe(0);
    }
    expect(evidence.interpretation.recording_review_authority_verified).toBe(false);
  });

  it("records the remaining Hosted direct-write authority blockers", () => {
    expect(evidence.hosted_write_authority.profile_role_updateable_by_authenticated).toBe(true);
    expect(evidence.hosted_write_authority.profile_role_guard_trigger_count).toBe(0);
    expect(evidence.hosted_write_authority.matter_client_updateable_by_authenticated).toBe(true);
    expect(evidence.hosted_write_authority.matter_assignment_updateable_by_authenticated).toBe(true);
    expect(evidence.hosted_write_authority.legal_assignment_helper_present).toBe(false);
    expect(evidence.hosted_write_authority.room_factory_insert_by_authenticated).toBe(true);
    expect(evidence.hosted_write_authority.room_factory_authenticated_insert_policy_count).toBe(1);
    expect(evidence.hosted_write_authority.payment_order_insert_by_authenticated).toBe(true);
    expect(evidence.hosted_write_authority.payment_order_authenticated_insert_policy_count).toBe(1);
    expect(evidence.interpretation.auth_data_isolation_cutover_verified).toBe(false);
  });

  it("keeps payment operational readiness fail-closed", () => {
    expect(evidence.payment_operational_schema.provider_registry_present).toBe(false);
    expect(evidence.payment_operational_schema.provider_events_present).toBe(false);
    expect(evidence.payment_operational_schema.service_order_idempotency_key_present).toBe(false);
    expect(evidence.interpretation.payment_operational_cutover_verified).toBe(false);
  });

  it("keeps every first-wave country on HOLD without a readiness claim", () => {
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
