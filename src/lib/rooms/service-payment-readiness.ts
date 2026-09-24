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
  | "CURRENCY_INVALID"
  | "CHECKOUT_NOT_READY";

export type ServicePaymentReadiness = {
  paymentRequired: boolean;
  ready: boolean;
  reason: ServicePaymentReadinessReason;
};

/**
 * A paid service may only create a payment order after its commercial amount
 * is explicitly fixed and checkout is connected. Quote/TBD/null pricing and
 * disconnected checkout fail closed before any selection/order mutation.
 */
export function evaluateServicePaymentReadiness(
  service: ServicePaymentDescriptor,
  checkoutConfigured = true,
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

  if (!checkoutConfigured) {
    return { paymentRequired: true, ready: false, reason: "CHECKOUT_NOT_READY" };
  }

  return { paymentRequired: true, ready: true, reason: "READY" };
}
