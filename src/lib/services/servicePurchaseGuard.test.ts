import { describe, expect, it } from "vitest";
import {
  PAYMENT_OPERATION_EVIDENCE_KEYS,
  evaluateServicePurchase,
  isPaymentOperationalEvidenceVerified,
  type PaymentOperationalEvidence,
} from "./servicePurchaseGuard";

const verifiedPaymentOperations: PaymentOperationalEvidence = {
  providerRegistryVerified: true,
  orderIdempotencyVerified: true,
  signedWebhookVerified: true,
  webhookReplayProtectionVerified: true,
  refundCancelVerified: true,
  sandboxCheckoutVerified: true,
  settlementVerified: true,
  rollbackVerified: true,
};

const fixedPaidService = {
  pricing_type: "monthly",
  price_status: "fixed",
  price_minor: 4900,
  currency: "AUD",
};

describe("service purchase guard", () => {
  it("does not require payment for free or default-included services", () => {
    expect(evaluateServicePurchase({ pricing_type: "free", price_status: "fixed", price_minor: null }, false)).toMatchObject({
      paymentRequired: false,
      canCreateOrder: false,
      code: "NOT_REQUIRED",
    });

    expect(evaluateServicePurchase({ default_included: true, pricing_type: "monthly", price_status: "tbd", price_minor: null }, false)).toMatchObject({
      paymentRequired: false,
      canCreateOrder: false,
      code: "NOT_REQUIRED",
    });
  });

  it("blocks quote and TBD services before an order can be created", () => {
    expect(evaluateServicePurchase({ pricing_type: "custom", price_status: "quote", price_minor: null, currency: "AUD" }, false)).toEqual({
      paymentRequired: true,
      canCreateOrder: false,
      code: "PRICING_NOT_READY",
      amountMinor: null,
      currency: "AUD",
    });

    expect(evaluateServicePurchase({ pricing_type: "usage", price_status: "tbd", price_minor: null, currency: "USD" }, false)).toMatchObject({
      paymentRequired: true,
      canCreateOrder: false,
      code: "PRICING_NOT_READY",
    });
  });

  it("rejects missing, zero, or non-fixed payable amounts", () => {
    for (const service of [
      { pricing_type: "monthly", price_status: "fixed", price_minor: null, currency: "AUD" },
      { pricing_type: "monthly", price_status: "fixed", price_minor: 0, currency: "AUD" },
      { pricing_type: "monthly", price_status: "tbd", price_minor: 4900, currency: "AUD" },
      { pricing_type: "monthly", price_status: "fixed", price_minor: 4900, currency: "" },
    ]) {
      expect(evaluateServicePurchase(service, false).code).toBe("PRICING_NOT_READY");
      expect(evaluateServicePurchase(service, false).canCreateOrder).toBe(false);
    }
  });

  it("blocks a valid fixed-price service while checkout is disconnected", () => {
    expect(evaluateServicePurchase(fixedPaidService, false, verifiedPaymentOperations)).toEqual({
      paymentRequired: true,
      canCreateOrder: false,
      code: "CHECKOUT_NOT_READY",
      amountMinor: 4900,
      currency: "AUD",
    });
  });

  it("fails closed when checkout is configured but operational evidence is absent", () => {
    expect(evaluateServicePurchase(fixedPaidService, true)).toEqual({
      paymentRequired: true,
      canCreateOrder: false,
      code: "PAYMENT_OPERATIONS_NOT_READY",
      amountMinor: 4900,
      currency: "AUD",
    });

    expect(evaluateServicePurchase(fixedPaidService, true, {})).toMatchObject({
      canCreateOrder: false,
      code: "PAYMENT_OPERATIONS_NOT_READY",
    });
  });

  it("requires every operational evidence class before checkout can create an order", () => {
    expect(isPaymentOperationalEvidenceVerified(verifiedPaymentOperations)).toBe(true);

    for (const key of PAYMENT_OPERATION_EVIDENCE_KEYS) {
      const incompleteEvidence = { ...verifiedPaymentOperations, [key]: false };
      expect(isPaymentOperationalEvidenceVerified(incompleteEvidence)).toBe(false);
      expect(evaluateServicePurchase(fixedPaidService, true, incompleteEvidence)).toMatchObject({
        canCreateOrder: false,
        code: "PAYMENT_OPERATIONS_NOT_READY",
      });
    }
  });

  it("allows an order only when pricing, checkout, and every payment operation are verified", () => {
    expect(evaluateServicePurchase(fixedPaidService, true, verifiedPaymentOperations)).toEqual({
      paymentRequired: true,
      canCreateOrder: true,
      code: "READY_FOR_CHECKOUT",
      amountMinor: 4900,
      currency: "AUD",
    });
  });
});
