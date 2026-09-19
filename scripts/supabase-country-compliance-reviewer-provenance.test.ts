import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const COMPLIANCE_MIGRATION =
  "supabase/migrations/20260903075000_country_compliance_evidence_registry.sql";

function complianceMigration(): string {
  return readFileSync(resolve(process.cwd(), COMPLIANCE_MIGRATION), "utf8");
}

describe("country compliance reviewer provenance", () => {
  it("binds reviewed_by to an existing auth user", () => {
    const sql = complianceMigration();

    expect(sql).toMatch(/reviewed_by uuid references auth\.users\(id\)/);
  });

  it("rejects VERIFIED evidence whose review predates registry creation", () => {
    const sql = complianceMigration();

    expect(sql).toContain("country_compliance_evidence_review_chronology");
    expect(sql).toMatch(
      /review_status <> 'VERIFIED'[\s\S]*or reviewed_at >= created_at/,
    );
  });
});
