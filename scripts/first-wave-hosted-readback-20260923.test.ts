import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath = "scripts/first-wave-hosted-readback-20260923.json";
const evidenceRaw = fs.readFileSync(evidencePath, "utf8");
const evidence = JSON.parse(evidenceRaw) as {
  source: {
    query_mode: string;
    hosted_mutation_performed: boolean;
    github_candidate_sha: string;
    production_master_sha: string;
  };
  deployment: {
    hosted_migration_count: number;
    hosted_migration_head: { version: string; name: string };
    unresolved_source_provenance: Array<{
      version: string;
      name: string;
      candidate_source_path_present: boolean;
      status: string;
    }>;
  };
  first_wave_runtime: Array<{
    country_code: string;
    expected_locale: string;
    manifest_rows: number;
    exact_locale_rows: number;
    exact_locale_encounter_rows: number;
    observed_language_tags?: string[];
    runtime_verified: boolean;
  }>;
  commercial_and_compliance: {
    first_wave_country_terms_rows: number;
    commercial_review_columns_present: number;
    commercial_review_columns_expected: number;
    country_compliance_evidence_present: boolean;
    payment_provider_registry_present: boolean;
    payment_provider_events_present: boolean;
    verified: boolean;
  };
  write_authority: {
    room_factory_manifests: {
      anon: string[];
      authenticated: string[];
      verified: boolean;
    };
    rc_customer_accounts: {
      authenticated: string[];
      verified: boolean;
    };
  };
  security_advisor: {
    rls_enabled_no_policy_count: number;
    launch_relevant_findings: string[];
    review_required: boolean;
  };
  non_production_staging: {
    supabase_branch_count: number;
    available: boolean;
  };
  first_wave_disposition: Record<string, string>;
};

const expectedLocales: Record<string, string> = {
  AU: "en-AU",
  US: "en-US",
  CA: "en-CA",
  KR: "ko-KR",
  JP: "ja-JP",
  GB: "en-GB",
};

describe("2026-09-23 first-wave Hosted launch readback", () => {
  it("preserves the production and Hosted read-only boundary", () => {
    expect(evidence.source.query_mode).toBe("READ_ONLY");
    expect(evidence.source.hosted_mutation_performed).toBe(false);
    expect(evidence.source.github_candidate_sha).toBe(
      "f1535e1d270936c1657f8ab861aaf8ee5265c92a",
    );
    expect(evidence.source.production_master_sha).toBe(
      "33da2a917dc6adcf266f59f0b27d18a56f1271d8",
    );
  });

  it("records the current 80-row Hosted migration ledger without blessing unresolved source provenance", () => {
    expect(evidence.deployment.hosted_migration_count).toBe(80);
    expect(evidence.deployment.hosted_migration_head).toEqual({
      version: "20260922021440",
      name: "rcv3_preview_email_outbox",
    });

    expect(evidence.deployment.unresolved_source_provenance).toEqual([
      {
        version: "20260920091809",
        name: "add_secure_rc_customer_numbers",
        candidate_source_path_present: false,
        status: "UNRESOLVED",
      },
      {
        version: "20260922021440",
        name: "rcv3_preview_email_outbox",
        candidate_source_path_present: false,
        status: "UNRESOLVED",
      },
    ]);
  });

  it("keeps all first-wave countries fail-closed until exact-locale encounter-backed runtime exists", () => {
    expect(evidence.first_wave_runtime).toHaveLength(6);

    for (const row of evidence.first_wave_runtime) {
      expect(row.expected_locale).toBe(expectedLocales[row.country_code]);
      expect(row.exact_locale_encounter_rows).toBe(0);
      expect(row.runtime_verified).toBe(false);
      expect(evidence.first_wave_disposition[row.country_code]).toBe("HOLD");
    }

    const au = evidence.first_wave_runtime.find((row) => row.country_code === "AU");
    expect(au).toMatchObject({
      manifest_rows: 7,
      exact_locale_rows: 0,
      exact_locale_encounter_rows: 0,
      observed_language_tags: ["ko", "ko-KR"],
      runtime_verified: false,
    });
  });

  it("keeps commercial, compliance, payment, and direct-write authority blockers visible", () => {
    expect(evidence.commercial_and_compliance).toEqual({
      first_wave_country_terms_rows: 0,
      commercial_review_columns_present: 0,
      commercial_review_columns_expected: 3,
      country_compliance_evidence_present: false,
      payment_provider_registry_present: false,
      payment_provider_events_present: false,
      verified: false,
    });

    expect(evidence.write_authority.room_factory_manifests.anon).toEqual([
      "INSERT",
      "UPDATE",
      "DELETE",
      "TRUNCATE",
    ]);
    expect(evidence.write_authority.room_factory_manifests.authenticated).toEqual([
      "INSERT",
      "UPDATE",
      "DELETE",
      "TRUNCATE",
    ]);
    expect(evidence.write_authority.room_factory_manifests.verified).toBe(false);
    expect(evidence.write_authority.rc_customer_accounts.authenticated).toEqual([
      "INSERT",
      "UPDATE",
      "DELETE",
      "TRUNCATE",
    ]);
    expect(evidence.write_authority.rc_customer_accounts.verified).toBe(false);
  });

  it("requires security-advisor review and a controlled non-Production staging target", () => {
    expect(evidence.security_advisor.rls_enabled_no_policy_count).toBe(21);
    expect(evidence.security_advisor.review_required).toBe(true);
    expect(evidence.security_advisor.launch_relevant_findings).toEqual(
      expect.arrayContaining([
        "communication_recording_policies",
        "rc_service_provider_offers",
        "rc_service_providers",
        "rcv3_customer_ai_credentials",
        "rcv3_customer_phone_accounts",
        "rcv3_preview_email_notices",
        "rcv3_preview_orders",
      ]),
    );
    expect(evidence.non_production_staging.supabase_branch_count).toBe(0);
    expect(evidence.non_production_staging.available).toBe(false);
  });

  it("does not persist customer identifiers in the aggregate evidence snapshot", () => {
    expect(evidenceRaw).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    );
    expect(evidenceRaw).not.toMatch(/\bRC\s+[0-9]{7}\b/);
  });
});
