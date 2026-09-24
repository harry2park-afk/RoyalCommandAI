import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath = "scripts/first-wave-hosted-readback-20260923-0749.json";
const evidenceRaw = fs.readFileSync(evidencePath, "utf8");
const evidence = JSON.parse(evidenceRaw) as {
  source: {
    query_mode: string;
    hosted_mutation_performed: boolean;
    github_candidate_sha: string;
    production_master_sha: string;
  };
  candidate_ci: Record<string, {
    run_number: number;
    conclusion: string;
    expected_fail_closed?: boolean;
    reason?: string;
  }>;
  first_wave: Array<{
    country_code: string;
    expected_locale: string;
    recording_policy_rows: number;
    service_terms_rows: number;
    room_manifest_rows: number;
    exact_locale_manifest_rows: number;
    encounter_backed_exact_locale_rows: number;
    disposition: string;
  }>;
  recording_review: Array<{
    country_code: string;
    review_status: string;
    recording_policy: string;
    has_reviewer: boolean;
    has_reviewed_at: boolean;
    verified: boolean;
  }>;
  security_and_staging: {
    security_advisor_info_count: number;
    supabase_development_branch_count: number;
    isolated_non_production_staging_available: boolean;
    hosted_remediation_allowed: boolean;
  };
};

const expectedLocales: Record<string, string> = {
  AU: "en-AU",
  US: "en-US",
  CA: "en-CA",
  KR: "ko-KR",
  JP: "ja-JP",
  GB: "en-GB",
};

describe("2026-09-23 07:49 first-wave Hosted readback", () => {
  it("preserves the stable production and Hosted read-only boundary", () => {
    expect(evidence.source.query_mode).toBe("READ_ONLY");
    expect(evidence.source.hosted_mutation_performed).toBe(false);
    expect(evidence.source.github_candidate_sha).toBe(
      "781ea19622d3b4d3a86aa3f2c640b1c1c39fd960",
    );
    expect(evidence.source.production_master_sha).toBe(
      "33da2a917dc6adcf266f59f0b27d18a56f1271d8",
    );
  });

  it("records completed exact-head regression checks without turning the expected linked-dry-run refusal into a pass", () => {
    for (const key of [
      "quality_gate",
      "conflict_guard",
      "hosted_ledger_preflight",
      "clean_replay",
      "room_factory_concurrency",
      "legal_tenant_isolation",
      "customer_account_authority",
      "payment_operational",
    ]) {
      expect(evidence.candidate_ci[key]?.conclusion, key).toBe("success");
    }

    expect(evidence.candidate_ci.linked_migration_dry_run).toMatchObject({
      run_number: 309,
      conclusion: "failure",
      expected_fail_closed: true,
      reason: "unresolved_hosted_source_provenance",
    });
  });

  it("keeps all six first-wave countries on HOLD until exact-locale encounter-backed runtime and country terms exist", () => {
    expect(evidence.first_wave).toHaveLength(6);

    for (const row of evidence.first_wave) {
      expect(row.expected_locale, row.country_code).toBe(expectedLocales[row.country_code]);
      expect(row.recording_policy_rows, row.country_code).toBe(1);
      expect(row.service_terms_rows, row.country_code).toBe(0);
      expect(row.exact_locale_manifest_rows, row.country_code).toBe(0);
      expect(row.encounter_backed_exact_locale_rows, row.country_code).toBe(0);
      expect(row.disposition, row.country_code).toBe("HOLD");
    }

    expect(evidence.first_wave.find((row) => row.country_code === "AU")).toMatchObject({
      room_manifest_rows: 7,
      exact_locale_manifest_rows: 0,
      encounter_backed_exact_locale_rows: 0,
      disposition: "HOLD",
    });
  });

  it("does not treat an approved recording row as reviewer-proven approval", () => {
    const au = evidence.recording_review.find((row) => row.country_code === "AU");
    expect(au).toMatchObject({
      review_status: "approved",
      recording_policy: "consent_required",
      has_reviewer: false,
      has_reviewed_at: true,
      verified: false,
    });

    for (const row of evidence.recording_review.filter((item) => item.country_code !== "AU")) {
      expect(row.review_status, row.country_code).toBe("needs_review");
      expect(row.recording_policy, row.country_code).toBe("blocked");
      expect(row.verified, row.country_code).toBe(false);
    }
  });

  it("refuses Hosted remediation while an isolated non-Production staging target is unavailable", () => {
    expect(evidence.security_and_staging.security_advisor_info_count).toBe(21);
    expect(evidence.security_and_staging.supabase_development_branch_count).toBe(0);
    expect(evidence.security_and_staging.isolated_non_production_staging_available).toBe(false);
    expect(evidence.security_and_staging.hosted_remediation_allowed).toBe(false);
  });

  it("does not persist customer identifiers in the aggregate snapshot", () => {
    expect(evidenceRaw).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    );
    expect(evidenceRaw).not.toMatch(/\bRC\s+[0-9]{7}\b/);
  });
});
