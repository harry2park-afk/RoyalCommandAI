export type CanonicalPaymentState =
  | "PENDING"
  | "PROCESSING"
  | "CLEARED"
  | "FAILED"
  | "PAST_DUE"
  | "REFUNDED"
  | "DISPUTED"
  | "CHARGEBACK";

export type PaymentProviderName = "stripe" | "square" | "paypal" | "other";

export type PaymentCheckoutRequest = {
  tenantBillingRef: string;
  roomCatalogId: string;
  priceScheduleId: string;
  amountMinor: number;
  currency: string;
  recurring: boolean;
  idempotencyKey: string;
  successReturnUrl: string;
  cancelReturnUrl: string;
};

export type PaymentCheckoutResult = {
  provider: PaymentProviderName;
  providerCheckoutRef: string;
  checkoutUrl: string;
  idempotencyKey: string;
};

export type VerifiedPaymentEvent = {
  provider: PaymentProviderName;
  providerEventId: string;
  eventType: string;
  signatureVerified: true;
  state: CanonicalPaymentState;
  receivedAt: string;
  effectiveAt: string;
  tenantBillingRef: string;
  roomCatalogId?: string | null;
  providerCustomerRef?: string | null;
  providerSubscriptionRef?: string | null;
  providerPaymentRef?: string | null;
  amountMinor?: number | null;
  currency?: string | null;
  idempotencyKey: string;
};

export type PaymentEventRejection = {
  accepted: false;
  reason:
    | "SIGNATURE_INVALID"
    | "EVENT_MALFORMED"
    | "PROVIDER_UNSUPPORTED"
    | "AMOUNT_MISMATCH"
    | "CURRENCY_MISMATCH"
    | "TENANT_MISMATCH";
};

export type PaymentEventAcceptance = {
  accepted: true;
  event: VerifiedPaymentEvent;
  replay: boolean;
};

export type PaymentEventDecision = PaymentEventAcceptance | PaymentEventRejection;

/**
 * Provider-specific implementations must keep secret material server-side and
 * return only verified, normalized evidence. Browser success redirects are not
 * authoritative payment evidence.
 */
export interface ProfessionalPaymentProviderAdapter {
  readonly provider: PaymentProviderName;
  createCheckout(request: PaymentCheckoutRequest): Promise<PaymentCheckoutResult>;
  verifyAndNormalizeWebhook(rawBody: string, signatureHeader: string | null): Promise<PaymentEventDecision>;
  retrieveCanonicalPaymentState(providerPaymentOrSubscriptionRef: string): Promise<CanonicalPaymentState>;
}

export type ExpectedPayment = {
  tenantBillingRef: string;
  amountMinor: number;
  currency: string;
};

export function validateVerifiedPaymentAgainstExpected(
  event: VerifiedPaymentEvent,
  expected: ExpectedPayment,
): PaymentEventDecision {
  if (!event.signatureVerified) return { accepted: false, reason: "SIGNATURE_INVALID" };
  if (event.tenantBillingRef !== expected.tenantBillingRef) {
    return { accepted: false, reason: "TENANT_MISMATCH" };
  }
  if (event.amountMinor != null && event.amountMinor !== expected.amountMinor) {
    return { accepted: false, reason: "AMOUNT_MISMATCH" };
  }
  if (event.currency != null && event.currency.toUpperCase() !== expected.currency.toUpperCase()) {
    return { accepted: false, reason: "CURRENCY_MISMATCH" };
  }
  return { accepted: true, event, replay: false };
}

export type ProcessedPaymentEventRegistry = ReadonlySet<string>;

export function markReplayIfProcessed(
  decision: PaymentEventDecision,
  processedEventIds: ProcessedPaymentEventRegistry,
): PaymentEventDecision {
  if (!decision.accepted) return decision;
  return {
    ...decision,
    replay: processedEventIds.has(decision.event.providerEventId),
  };
}
