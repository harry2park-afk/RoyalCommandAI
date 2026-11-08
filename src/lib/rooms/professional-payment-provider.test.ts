import { describe, expect, it } from "vitest";
import {
  markReplayIfProcessed,
  validateVerifiedPaymentAgainstExpected,
  type VerifiedPaymentEvent,
} from "./professional-payment-provider";

const event: VerifiedPaymentEvent = {
  provider: "stripe",
  providerEventId: "evt_1",
  eventType: "payment_intent.succeeded",
  signatureVerified: true,
  state: "CLEARED",
  receivedAt: "2026-09-02T00:00:00Z",
  effectiveAt: "2026-09-02T00:00:00Z",
  tenantBillingRef: "tenant_1",
  roomCatalogId: "legal_personal",
  providerCustomerRef: "cus_1",
  providerPaymentRef: "pi_1",
  amountMinor: 1000,
  currency: "AUD",
  idempotencyKey: "idem_1",
};

describe("Professional payment provider evidence", () => {
  it("accepts only matching verified server-side payment evidence", () => {
    expect(
      validateVerifiedPaymentAgainstExpected(event, {
        tenantBillingRef: "tenant_1",
        amountMinor: 1000,
        currency: "AUD",
      }),
    ).toMatchObject({ accepted: true, replay: false });
  });

  it("rejects amount mismatch", () => {
    expect(
      validateVerifiedPaymentAgainstExpected(event, {
        tenantBillingRef: "tenant_1",
        amountMinor: 999,
        currency: "AUD",
      }),
    ).toEqual({ accepted: false, reason: "AMOUNT_MISMATCH" });
  });

  it("rejects currency mismatch", () => {
    expect(
      validateVerifiedPaymentAgainstExpected(event, {
        tenantBillingRef: "tenant_1",
        amountMinor: 1000,
        currency: "USD",
      }),
    ).toEqual({ accepted: false, reason: "CURRENCY_MISMATCH" });
  });

  it("rejects tenant mismatch", () => {
    expect(
      validateVerifiedPaymentAgainstExpected(event, {
        tenantBillingRef: "tenant_2",
        amountMinor: 1000,
        currency: "AUD",
      }),
    ).toEqual({ accepted: false, reason: "TENANT_MISMATCH" });
  });

  it("marks duplicate provider events as replay evidence", () => {
    const accepted = validateVerifiedPaymentAgainstExpected(event, {
      tenantBillingRef: "tenant_1",
      amountMinor: 1000,
      currency: "AUD",
    });
    expect(markReplayIfProcessed(accepted, new Set(["evt_1"]))).toMatchObject({
      accepted: true,
      replay: true,
    });
  });
});
