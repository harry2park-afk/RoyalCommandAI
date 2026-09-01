export type BillingCurrency = string;
export type BillingInterval = "monthly" | "annual";
export type PaymentStatus =
  | "NOT_DUE"
  | "PENDING"
  | "PROCESSING"
  | "CLEARED"
  | "FAILED"
  | "PAST_DUE"
  | "REFUNDED"
  | "DISPUTED"
  | "CHARGEBACK";

export type EntitlementState =
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "PAYMENT_WARNING"
  | "SUSPENDED_NONPAYMENT"
  | "SUSPENDED_RISK"
  | "CANCELLED";

export type ManagementFeePlan =
  | { kind: "fixed_recurring"; amountMinor: number; currency: BillingCurrency }
  | { kind: "fixed_per_execution"; amountMinor: number; currency: BillingCurrency }
  | { kind: "usage_percentage"; basisPoints: number }
  | {
      kind: "hybrid";
      recurringAmountMinor: number;
      currency: BillingCurrency;
      usageBasisPoints: number;
    };

export type PublishedRoomPriceSchedule = {
  scheduleId: string;
  catalogId: string;
  baseAmountMinor: number;
  currency: BillingCurrency;
  interval: BillingInterval;
  aiRatePlanId: string;
  managementFeePlanId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  ownerApproved: boolean;
  active: boolean;
};

export type AiUsageBillingRecord = {
  tenantBillingRef: string;
  roomCatalogId: string;
  roomProductId: string;
  providerId: string;
  modelId: string;
  inputUnits?: number;
  outputUnits?: number;
  otherUnits?: number;
  rateScheduleId: string;
  managementFeeScheduleId: string;
  executionEvidenceId: string;
  idempotencyKey: string;
  occurredAt: string;
};

export type EntitlementInput = {
  currentState: EntitlementState;
  paymentStatus: PaymentStatus;
  nowMs: number;
  dueAtMs?: number | null;
  riskBlocked?: boolean;
  cancelled?: boolean;
};

export type EntitlementDecision = {
  state: EntitlementState;
  billableExecutionAllowed: boolean;
  paymentAccessAllowed: true;
  suspendAtMs: number | null;
  warningSecondsRemaining: number | null;
  reasons: string[];
};

export const NONPAYMENT_GRACE_MS = 60_000;

export function isPublishedRoomPriceUsable(
  schedule: PublishedRoomPriceSchedule,
  nowMs: number,
): boolean {
  if (!schedule.ownerApproved || !schedule.active) return false;
  if (!Number.isInteger(schedule.baseAmountMinor) || schedule.baseAmountMinor < 0) return false;
  const from = Date.parse(schedule.effectiveFrom);
  if (!Number.isFinite(from) || nowMs < from) return false;
  if (schedule.effectiveTo) {
    const to = Date.parse(schedule.effectiveTo);
    if (!Number.isFinite(to) || nowMs >= to) return false;
  }
  return true;
}

export function decideEntitlement(input: EntitlementInput): EntitlementDecision {
  const reasons: string[] = [];

  if (input.cancelled) {
    return {
      state: "CANCELLED",
      billableExecutionAllowed: false,
      paymentAccessAllowed: true,
      suspendAtMs: null,
      warningSecondsRemaining: null,
      reasons: ["CANCELLED"],
    };
  }

  if (
    input.riskBlocked ||
    input.paymentStatus === "DISPUTED" ||
    input.paymentStatus === "CHARGEBACK"
  ) {
    return {
      state: "SUSPENDED_RISK",
      billableExecutionAllowed: false,
      paymentAccessAllowed: true,
      suspendAtMs: null,
      warningSecondsRemaining: null,
      reasons: [input.riskBlocked ? "RISK_BLOCK" : input.paymentStatus],
    };
  }

  if (input.paymentStatus === "CLEARED") {
    return {
      state: "ACTIVE",
      billableExecutionAllowed: true,
      paymentAccessAllowed: true,
      suspendAtMs: null,
      warningSecondsRemaining: null,
      reasons: ["PAYMENT_CLEARED"],
    };
  }

  if (input.currentState === "PENDING_PAYMENT" && input.dueAtMs == null) {
    return {
      state: "PENDING_PAYMENT",
      billableExecutionAllowed: false,
      paymentAccessAllowed: true,
      suspendAtMs: null,
      warningSecondsRemaining: null,
      reasons: ["INITIAL_PAYMENT_NOT_CLEARED"],
    };
  }

  if (input.dueAtMs == null || input.nowMs < input.dueAtMs) {
    return {
      state: input.currentState === "ACTIVE" ? "ACTIVE" : "PENDING_PAYMENT",
      billableExecutionAllowed: input.currentState === "ACTIVE",
      paymentAccessAllowed: true,
      suspendAtMs: null,
      warningSecondsRemaining: null,
      reasons: input.currentState === "ACTIVE" ? ["NOT_YET_DUE"] : ["PAYMENT_NOT_CLEARED"],
    };
  }

  const suspendAtMs = input.dueAtMs + NONPAYMENT_GRACE_MS;
  if (input.nowMs < suspendAtMs) {
    const remaining = Math.max(0, Math.ceil((suspendAtMs - input.nowMs) / 1000));
    reasons.push("PAYMENT_DUE", "NONPAYMENT_GRACE_ACTIVE");
    return {
      state: "PAYMENT_WARNING",
      billableExecutionAllowed: true,
      paymentAccessAllowed: true,
      suspendAtMs,
      warningSecondsRemaining: remaining,
      reasons,
    };
  }

  reasons.push("PAYMENT_NOT_CLEARED_AT_SUSPEND_AT");
  return {
    state: "SUSPENDED_NONPAYMENT",
    billableExecutionAllowed: false,
    paymentAccessAllowed: true,
    suspendAtMs,
    warningSecondsRemaining: 0,
    reasons,
  };
}

export function canExecuteBillableAction(decision: EntitlementDecision): boolean {
  return decision.state === "ACTIVE" || decision.state === "PAYMENT_WARNING";
}

export function managementFeeMinor(
  plan: ManagementFeePlan,
  eligibleUsageMinor: number,
  executionCount: number,
): number {
  switch (plan.kind) {
    case "fixed_recurring":
      return plan.amountMinor;
    case "fixed_per_execution":
      return plan.amountMinor * Math.max(0, executionCount);
    case "usage_percentage":
      return Math.round(Math.max(0, eligibleUsageMinor) * (plan.basisPoints / 10_000));
    case "hybrid":
      return (
        plan.recurringAmountMinor +
        Math.round(Math.max(0, eligibleUsageMinor) * (plan.usageBasisPoints / 10_000))
      );
  }
}
