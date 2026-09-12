import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const paymentEvidenceSql = readFileSync(
  resolve(process.cwd(), "scripts/october-launch-payment-readiness.sql"),
  "utf8",
).toLowerCase();

describe("October payment operational evidence contract", () => {
  it("stays read-only and fail-closed", () => {
    expect(paymentEvidenceSql).toContain("begin read only;");
    expect(paymentEvidenceSql).toContain("rollback;");
    expect(paymentEvidenceSql).toContain("'contract_version', 2");
    expect(paymentEvidenceSql).toContain("'runtime_sandbox_webhook_refund_cancel_verified', false");
    expect(paymentEvidenceSql).toContain("'overall_launch_approval', false");
  });

  it("tracks the canonical payment safeguard tables", () => {
    expect(paymentEvidenceSql).toContain("relname = 'rc_payment_provider_registry'");
    expect(paymentEvidenceSql).toContain("relname = 'rc_payment_provider_events'");
    expect(paymentEvidenceSql).toContain("payment_provider_registry_rls_enabled");
    expect(paymentEvidenceSql).toContain("payment_event_ledger_rls_enabled");
    expect(paymentEvidenceSql).toContain(
      "payment_provider_registry_authenticated_direct_access_blocked",
    );
    expect(paymentEvidenceSql).toContain(
      "payment_event_ledger_authenticated_direct_access_blocked",
    );
  });

  it("requires review, replay, signature and digest safeguards", () => {
    expect(paymentEvidenceSql).toContain(
      "rc_payment_provider_registry_review_provenance",
    );
    expect(paymentEvidenceSql).toContain(
      "rc_payment_provider_registry_production_capabilities",
    );
    expect(paymentEvidenceSql).toContain(
      "rc_payment_provider_events_processing_requires_verified_signature",
    );
    expect(paymentEvidenceSql).toContain("rc_payment_provider_events_payload_sha256");
    expect(paymentEvidenceSql).toContain("payment_event_replay_unique_guard_present");
    expect(paymentEvidenceSql).toContain("payment_event_raw_payload_columns_absent");
  });

  it("requires reviewer provenance for first-wave commercial offer evidence", () => {
    expect(paymentEvidenceSql).toContain("to_jsonb(o)->>'review_status'");
    expect(paymentEvidenceSql).toContain("to_jsonb(o)->>'reviewed_by'");
    expect(paymentEvidenceSql).toContain("to_jsonb(o)->>'reviewed_at'");
    expect(paymentEvidenceSql).not.toContain("lower(o.review_status)");
  });

  it("keeps Hosted migration and country offer evidence mandatory", () => {
    expect(paymentEvidenceSql).toContain("payment_operational_safeguards");
    expect(paymentEvidenceSql).toContain("approved_available_local_currency_offers");
    expect(paymentEvidenceSql).toContain("payment_database_readiness");
  });
});
