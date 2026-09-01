import { describe, expect, it } from "vitest";
import { evaluateServicePurchase } from "./servicePurchaseGuard";

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
    expect(evaluateServicePurchase({ pricing_type: "monthly", price_status: "fixed", price_minor: 4900, currency: "AUD" }, false)).toEqual({
      paymentRequired: true,
      canCreateOrder: false,
      code: "CHECKOUT_NOT_READY",
      amountMinor: 4900,
      currency: "AUD",
    });
  });

  it("allows an order only when fixed pricing and checkout are both ready", () => {
    expect(evaluateServicePurchase({ pricing_type: "monthly", price_status: "fixed", price_minor: 4900, currency: "AUD" }, true)).toEqual({
      paymentRequired: true,
      canCreateOrder: true,
      code: "READY_FOR_CHECKOUT",
      amountMinor: 4900,
      currency: "AUD",
    });
  });
});
