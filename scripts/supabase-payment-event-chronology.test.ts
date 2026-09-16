import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const PAYMENT_MIGRATION =
  "supabase/migrations/20260903205500_payment_operational_safeguards.sql";

function paymentMigration(): string {
  return readFileSync(resolve(process.cwd(), PAYMENT_MIGRATION), "utf8");
}

describe("payment readiness and event audit chronology", () => {
  it("requires signed-webhook capability before a provider can be marked ready", () => {
    const sql = paymentMigration();

    expect(sql).toContain("supports_signed_webhooks boolean not null default false");
    expect(sql).toContain("rc_payment_provider_registry_signed_webhook_capability");
    expect(sql).toMatch(
      /status = 'disabled'[\s\S]*or \(supports_webhooks and supports_signed_webhooks\)/,
    );
    expect(sql).toMatch(
      /status <> 'production_ready'[\s\S]*supports_signed_webhooks[\s\S]*supports_refunds[\s\S]*supports_cancellations/,
    );
  });

  it("fails closed when provider readiness review predates registry creation", () => {
    const sql = paymentMigration();

    expect(sql).toContain("rc_payment_provider_registry_review_chronology");
    expect(sql).toMatch(/reviewed_at is null[\s\S]*or reviewed_at >= created_at/);
  });

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
