import fs from "node:fs";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  "scripts/supabase-room-factory-first-wave-runtime-snapshot.sql",
  "utf8",
);
const evidenceRaw = fs.readFileSync(
  "scripts/first-wave-launch-readiness-readback-20260922.json",
  "utf8",
);
const evidence = JSON.parse(evidenceRaw) as {
  source: {
    query_mode: string;
    hosted_mutation_performed: boolean;
  };
  deployment: {
    production_master_sha: string;
    hosted_migration_count: number;
    hosted_migration_head: string;
    migration_20260920091809_deployment_provenance: string;
  };
  first_wave_runtime: Array<{
    country_code: string;
    expected_locale: string;
    manifest_rows: number;
    non_null_encounter_rows: number;
    exact_locale_rows: number;
    exact_runtime_rows: number;
    runtime_verified: boolean;
  }>;
  room_factory_authority: { verified: boolean };
  customer_account_authority: { verified: boolean };
  commercial_runtime: { verified: boolean };
  payment_runtime: { verified: boolean };
  recording_review: Array<{
    country_code: string;
    reviewer_proven_approved: number;
  }>;
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

describe("first-wave Room Factory runtime evidence", () => {
  it("requires the exact locale for the same country", () => {
    expect(sql).toContain("manifest.language_tag = country.expected_locale");
    expect(sql).toContain("manifest.country_code = country.country_code");

    expect(evidence.first_wave_runtime).toHaveLength(6);
    for (const row of evidence.first_wave_runtime) {
      expect(row.expected_locale).toBe(expectedLocales[row.country_code]);
    }
  });

  it("does not mistake AU Korean manifests for AU en-AU runtime proof", () => {
    const au = evidence.first_wave_runtime.find((row) => row.country_code === "AU");
    expect(au).toEqual({
      country_code: "AU",
      expected_locale: "en-AU",
      manifest_rows: 7,
      non_null_encounter_rows: 0,
      exact_locale_rows: 0,
      exact_runtime_rows: 0,
      runtime_verified: false,
    });
  });

  it("keeps all first-wave countries fail-closed on the fresh readback", () => {
    for (const row of evidence.first_wave_runtime) {
      expect(row.exact_runtime_rows).toBe(0);
      expect(row.runtime_verified).toBe(false);
      expect(evidence.first_wave_disposition[row.country_code]).toBe("HOLD");
    }

    expect(evidence.room_factory_authority.verified).toBe(false);
    expect(evidence.customer_account_authority.verified).toBe(false);
    expect(evidence.commercial_runtime.verified).toBe(false);
    expect(evidence.payment_runtime.verified).toBe(false);
    expect(
      evidence.recording_review.every((row) => row.reviewer_proven_approved === 0),
    ).toBe(true);
  });

  it("preserves deployment provenance and privacy boundaries", () => {
    expect(evidence.source.query_mode).toBe("READ_ONLY");
    expect(evidence.source.hosted_mutation_performed).toBe(false);
    expect(evidence.deployment.production_master_sha).toBe(
      "33da2a917dc6adcf266f59f0b27d18a56f1271d8",
    );
    expect(evidence.deployment.hosted_migration_count).toBe(79);
    expect(evidence.deployment.hosted_migration_head).toBe("20260921052125");
    expect(
      evidence.deployment.migration_20260920091809_deployment_provenance,
    ).toBe("UNRESOLVED");

    expect(evidenceRaw).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    );
    expect(evidenceRaw).not.toMatch(/\bRC\s+[0-9]{7}\b/);
  });
});
