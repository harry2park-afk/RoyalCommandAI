import { describe, expect, it } from "vitest";
import { evaluateServicePaymentReadiness } from "./service-payment-readiness";

describe("service payment readiness", () => {
  it("does not require payment for included or free services", () => {
    expect(evaluateServicePaymentReadiness({ default_included: true, pricing_type: "monthly" })).toEqual({
      paymentRequired: false,
      ready: true,
      reason: "NOT_REQUIRED",
    });
    expect(evaluateServicePaymentReadiness({ default_included: false, pricing_type: "free" })).toEqual({
      paymentRequired: false,
      ready: true,
      reason: "NOT_REQUIRED",
    });
  });

  it("fails closed for TBD and quote pricing", () => {
    expect(evaluateServicePaymentReadiness({
      default_included: false,
      pricing_type: "monthly",
      price_status: "tbd",
      price_minor: null,
      currency: "AUD",
    })).toMatchObject({ paymentRequired: true, ready: false, reason: "PRICE_NOT_FIXED" });

    expect(evaluateServicePaymentReadiness({
      default_included: false,
      pricing_type: "custom",
      price_status: "quote",
      price_minor: null,
      currency: "AUD",
    })).toMatchObject({ paymentRequired: true, ready: false, reason: "PRICE_NOT_FIXED" });
  });

  it("rejects missing, zero, unsafe, and invalid-currency fixed pricing", () => {
    for (const priceMinor of [null, 0, -1, Number.MAX_SAFE_INTEGER + 1]) {
      expect(evaluateServicePaymentReadiness({
        default_included: false,
        pricing_type: "monthly",
        price_status: "fixed",
        price_minor: priceMinor,
        currency: "AUD",
      })).toMatchObject({ paymentRequired: true, ready: false, reason: "PRICE_MISSING" });
    }

    expect(evaluateServicePaymentReadiness({
      default_included: false,
      pricing_type: "monthly",
      price_status: "fixed",
      price_minor: 100,
      currency: "aud",
    })).toMatchObject({ paymentRequired: true, ready: false, reason: "CURRENCY_INVALID" });
  });

  it("fails closed when fixed-price checkout is disconnected", () => {
    expect(evaluateServicePaymentReadiness({
      default_included: false,
      pricing_type: "monthly",
      price_status: "fixed",
      price_minor: 100,
      currency: "AUD",
    }, false)).toEqual({
      paymentRequired: true,
      ready: false,
      reason: "CHECKOUT_NOT_READY",
    });
  });

  it("allows a positive fixed minor-unit amount with a three-letter uppercase currency when checkout is connected", () => {
    expect(evaluateServicePaymentReadiness({
      default_included: false,
      pricing_type: "monthly",
      price_status: "fixed",
      price_minor: 100,
      currency: "AUD",
    }, true)).toEqual({ paymentRequired: true, ready: true, reason: "READY" });
  });
});
