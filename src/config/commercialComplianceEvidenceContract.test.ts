import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const commercialComplianceEvidenceSql = readFileSync(
  resolve(process.cwd(), "scripts/october-launch-commercial-compliance-readiness.sql"),
  "utf8",
).toLowerCase();

const hostedReadinessSql = readFileSync(
  resolve(process.cwd(), "scripts/october-launch-hosted-readiness.sql"),
  "utf8",
).toLowerCase();

const machineSnapshotSql = readFileSync(
  resolve(process.cwd(), "scripts/october-launch-hosted-machine-snapshot.sql"),
  "utf8",
).toLowerCase();

describe("October commercial compliance evidence contract", () => {
  it("stays read-only and fail-closed", () => {
    expect(commercialComplianceEvidenceSql).toContain("begin read only;");
    expect(commercialComplianceEvidenceSql).toContain("rollback;");
    expect(commercialComplianceEvidenceSql).toContain("'contract_version', 2");
    expect(commercialComplianceEvidenceSql).toContain(
      "'human_legal_privacy_review_verified', false",
    );
    expect(commercialComplianceEvidenceSql).toContain("'overall_launch_approval', false");
  });

  it("requires review provenance for terms and provider offers", () => {
    expect(commercialComplianceEvidenceSql).toContain(
      "country_terms_review_provenance_columns_exist",
    );
    expect(commercialComplianceEvidenceSql).toContain(
      "provider_offer_review_provenance_columns_exist",
    );
    expect(commercialComplianceEvidenceSql).toContain("reviewer_proven_terms");
    expect(commercialComplianceEvidenceSql).toContain(
      "reviewer_proven_provider_offers",
    );
    expect(hostedReadinessSql).toContain("to_jsonb(o)->>'reviewed_by'");
    expect(hostedReadinessSql).toContain("to_jsonb(o)->>'reviewed_at'");

    expect(machineSnapshotSql).toContain("'reviewer_proven_terms'");
    expect(machineSnapshotSql).toContain("'reviewer_proven_provider_offers'");
    expect(machineSnapshotSql).toContain("to_jsonb(t)->>'reviewed_by'");
    expect(machineSnapshotSql).toContain("to_jsonb(t)->>'reviewed_at'");
    expect(machineSnapshotSql).toContain("to_jsonb(o)->>'reviewed_by'");
    expect(machineSnapshotSql).toContain("to_jsonb(o)->>'reviewed_at'");
  });

  it("requires recording approval, reviewer provenance and a non-empty legal basis", () => {
    expect(commercialComplianceEvidenceSql).toContain(
      "upper(coalesce(rp.review_status, '')) = 'approved'",
    );
    expect(machineSnapshotSql).toContain("rp.review_status = 'approved'");
    expect(hostedReadinessSql).toContain("review_status = 'approved'");

    for (const sql of [
      commercialComplianceEvidenceSql,
      hostedReadinessSql,
      machineSnapshotSql,
    ]) {
      expect(sql).toContain("reviewed_by is not null");
      expect(sql).toContain("reviewed_at is not null");
      expect(sql).toContain("legal_basis");
    }

    expect(commercialComplianceEvidenceSql).toContain(
      "nullif(trim(coalesce(rp.legal_basis, '')), '') is not null",
    );
    expect(machineSnapshotSql).toContain(
      "nullif(trim(coalesce(rp.legal_basis, '')), '') is not null",
    );
    expect(hostedReadinessSql).toContain(
      "nullif(trim(coalesce(rp.legal_basis, '')), '') is not null",
    );
    expect(hostedReadinessSql).toContain(
      "nullif(trim(coalesce(legal_basis, '')), '') is not null",
    );

    expect(commercialComplianceEvidenceSql).toContain(
      "recording_review_provenance_columns_exist",
    );
    expect(commercialComplianceEvidenceSql).toContain(
      "recording_legal_basis_column_exists",
    );
    expect(machineSnapshotSql).toContain("'recording_legal_basis_column_exists'");
    expect(hostedReadinessSql).toContain("'recording_legal_basis_column_exists'");
  });

  it("keeps first-wave and next-wave country evidence separate", () => {
    for (const code of ["au", "us", "ca", "kr", "jp", "gb"]) {
      expect(commercialComplianceEvidenceSql).toContain(`('${code}',`);
    }
    for (const code of ["sg", "cn", "hk", "tw", "in"]) {
      expect(commercialComplianceEvidenceSql).toContain(`('${code}',`);
    }
    expect(commercialComplianceEvidenceSql).toContain("'next_wave_inventory'");
  });
});
