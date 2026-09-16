import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const PAYMENT_MIGRATION =
  "supabase/migrations/20260903205500_payment_operational_safeguards.sql";

function paymentMigration(): string {
  return readFileSync(resolve(process.cwd(), PAYMENT_MIGRATION), "utf8");
}

describe("payment event audit chronology", () => {
  it("fails closed when signature verification predates event receipt", () => {
    const sql = paymentMigration();

    expect(sql).toContain("rc_payment_provider_events_signature_after_receipt");
    expect(sql).toMatch(
      /signature_verified_at is null[\s\S]*or signature_verified_at >= received_at/,
    );
  });

  it("fails closed when processing completion predates receipt or signature verification", () => {
    const sql = paymentMigration();

    expect(sql).toContain("rc_payment_provider_events_processed_after_receipt");
    expect(sql).toMatch(/processed_at is null[\s\S]*or processed_at >= received_at/);
    expect(sql).toContain("rc_payment_provider_events_processed_after_signature");
    expect(sql).toMatch(
      /processing_status <> 'processed'[\s\S]*or processed_at >= signature_verified_at/,
    );
  });
});
