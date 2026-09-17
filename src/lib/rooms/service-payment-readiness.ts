export type ServicePaymentDescriptor = {
  default_included?: boolean | null;
  pricing_type?: string | null;
  price_status?: string | null;
  price_minor?: number | null;
  currency?: string | null;
};

export type ServicePaymentReadinessReason =
  | "NOT_REQUIRED"
  | "READY"
  | "PRICE_NOT_FIXED"
  | "PRICE_MISSING"
  | "CURRENCY_INVALID";

export type ServicePaymentReadiness = {
  paymentRequired: boolean;
  ready: boolean;
  reason: ServicePaymentReadinessReason;
};

/**
 * A paid service may only create a payment order after its commercial amount
 * is explicitly fixed. Quote/TBD/null pricing must fail closed rather than
 * creating an order with an invented or missing amount.
 */
export function evaluateServicePaymentReadiness(
  service: ServicePaymentDescriptor,
): ServicePaymentReadiness {
  const paymentRequired = !service.default_included && service.pricing_type !== "free";

  if (!paymentRequired) {
    return { paymentRequired: false, ready: true, reason: "NOT_REQUIRED" };
  }

  if (service.price_status !== "fixed") {
    return { paymentRequired: true, ready: false, reason: "PRICE_NOT_FIXED" };
  }

  if (
    typeof service.price_minor !== "number" ||
    !Number.isSafeInteger(service.price_minor) ||
    service.price_minor <= 0
  ) {
    return { paymentRequired: true, ready: false, reason: "PRICE_MISSING" };
  }

  if (typeof service.currency !== "string" || !/^[A-Z]{3}$/.test(service.currency)) {
    return { paymentRequired: true, ready: false, reason: "CURRENCY_INVALID" };
  }

  return { paymentRequired: true, ready: true, reason: "READY" };
}
