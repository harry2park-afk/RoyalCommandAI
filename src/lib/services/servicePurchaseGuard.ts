export type ServicePurchaseInput = {
  default_included?: boolean | null;
  pricing_type?: string | null;
  price_status?: string | null;
  price_minor?: number | null;
  currency?: string | null;
};

export const PAYMENT_OPERATION_EVIDENCE_KEYS = [
  "providerRegistryVerified",
  "orderIdempotencyVerified",
  "signedWebhookVerified",
  "webhookReplayProtectionVerified",
  "refundCancelVerified",
  "sandboxCheckoutVerified",
  "settlementVerified",
  "rollbackVerified",
] as const;

export type PaymentOperationalEvidence = Record<
  (typeof PAYMENT_OPERATION_EVIDENCE_KEYS)[number],
  boolean
>;

export function isPaymentOperationalEvidenceVerified(
  evidence?: Partial<PaymentOperationalEvidence> | null,
): evidence is PaymentOperationalEvidence {
  return Boolean(
    evidence &&
      PAYMENT_OPERATION_EVIDENCE_KEYS.every((key) => evidence[key] === true),
  );
}

export type ServicePurchaseDecision = {
  paymentRequired: boolean;
  canCreateOrder: boolean;
  code:
    | "NOT_REQUIRED"
    | "PRICING_NOT_READY"
    | "CHECKOUT_NOT_READY"
    | "PAYMENT_OPERATIONS_NOT_READY"
    | "READY_FOR_CHECKOUT";
  amountMinor: number | null;
  currency: string | null;
};

export function evaluateServicePurchase(
  service: ServicePurchaseInput,
  checkoutConfigured: boolean,
  paymentOperationsEvidence?: Partial<PaymentOperationalEvidence> | null,
): ServicePurchaseDecision {
  if (service.default_included || service.pricing_type === "free") {
    return {
      paymentRequired: false,
      canCreateOrder: false,
      code: "NOT_REQUIRED",
      amountMinor: null,
      currency: service.currency ?? null,
    };
  }

  const amountMinor = service.price_minor;
  const hasFixedPrice =
    service.price_status === "fixed" &&
    typeof amountMinor === "number" &&
    Number.isSafeInteger(amountMinor) &&
    amountMinor > 0 &&
    typeof service.currency === "string" &&
    service.currency.trim().length > 0;

  if (!hasFixedPrice) {
    return {
      paymentRequired: true,
      canCreateOrder: false,
      code: "PRICING_NOT_READY",
      amountMinor: null,
      currency: service.currency ?? null,
    };
  }

  if (!checkoutConfigured) {
    return {
      paymentRequired: true,
      canCreateOrder: false,
      code: "CHECKOUT_NOT_READY",
      amountMinor,
      currency: service.currency ?? null,
    };
  }

  if (!isPaymentOperationalEvidenceVerified(paymentOperationsEvidence)) {
    return {
      paymentRequired: true,
      canCreateOrder: false,
      code: "PAYMENT_OPERATIONS_NOT_READY",
      amountMinor,
      currency: service.currency ?? null,
    };
  }

  return {
    paymentRequired: true,
    canCreateOrder: true,
    code: "READY_FOR_CHECKOUT",
    amountMinor,
    currency: service.currency ?? null,
  };
}
