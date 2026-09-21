import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const COMMERCIAL_REVIEW_MIGRATION =
  "supabase/migrations/20260910030000_harden_commercial_review_provenance.sql";

function commercialReviewMigration(): string {
  return readFileSync(resolve(process.cwd(), COMMERCIAL_REVIEW_MIGRATION), "utf8");
}

describe("commercial reviewer provenance", () => {
  it("binds country-term and provider-offer reviewers to auth.users", () => {
    const sql = commercialReviewMigration();

    expect(sql).toContain("rc_service_country_terms_reviewed_by_fkey");
    expect(sql).toMatch(
      /alter table public\.rc_service_country_terms[\s\S]*foreign key \(reviewed_by\) references auth\.users\(id\)/,
    );
    expect(sql).toContain("rc_service_provider_offers_reviewed_by_fkey");
    expect(sql).toMatch(
      /alter table public\.rc_service_provider_offers[\s\S]*foreign key \(reviewed_by\) references auth\.users\(id\)/,
    );
  });

  it("rejects review timestamps that predate the commercial row", () => {
    const sql = commercialReviewMigration();

    expect(sql).toContain("rc_service_country_terms_review_chronology_check");
    expect(sql).toContain("rc_service_provider_offers_review_chronology_check");
    expect(sql.match(/reviewed_at >= created_at/g)).toHaveLength(2);
  });

  it("continues to fail closed when an approved row lacks reviewer provenance", () => {
    const sql = commercialReviewMigration();

    expect(sql).toContain("rc_service_country_terms_approval_provenance_check");
    expect(sql).toContain("rc_service_provider_offers_approval_provenance_check");
    expect(sql.match(/review_status <> 'approved'/g)).toHaveLength(2);
    expect(sql.match(/reviewed_by is not null and reviewed_at is not null/g)).toHaveLength(2);
  });
});
