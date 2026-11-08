import { describe, expect, it } from "vitest";
import {
  NONPAYMENT_GRACE_MS,
  canExecuteBillableAction,
  decideEntitlement,
  isPublishedRoomPriceUsable,
  managementFeeMinor,
} from "./professional-room-billing";

describe("Professional Room billing entitlement", () => {
  it("requires cleared payment before initial paid use", () => {
    const decision = decideEntitlement({
      currentState: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      nowMs: 1_000,
    });
    expect(decision.state).toBe("PENDING_PAYMENT");
    expect(decision.billableExecutionAllowed).toBe(false);
    expect(decision.paymentAccessAllowed).toBe(true);
  });

  it("warns at due time and suspends exactly after 60 seconds if still unpaid", () => {
    const dueAtMs = 100_000;
    const warning = decideEntitlement({
      currentState: "ACTIVE",
      paymentStatus: "PAST_DUE",
      nowMs: dueAtMs,
      dueAtMs,
    });
    expect(warning.state).toBe("PAYMENT_WARNING");
    expect(warning.suspendAtMs).toBe(dueAtMs + NONPAYMENT_GRACE_MS);
    expect(warning.warningSecondsRemaining).toBe(60);
    expect(canExecuteBillableAction(warning)).toBe(true);

    const suspended = decideEntitlement({
      currentState: "PAYMENT_WARNING",
      paymentStatus: "PAST_DUE",
      nowMs: dueAtMs + NONPAYMENT_GRACE_MS,
      dueAtMs,
    });
    expect(suspended.state).toBe("SUSPENDED_NONPAYMENT");
    expect(suspended.billableExecutionAllowed).toBe(false);
  });

  it("automatically restores nonpayment suspension when payment clears", () => {
    const restored = decideEntitlement({
      currentState: "SUSPENDED_NONPAYMENT",
      paymentStatus: "CLEARED",
      nowMs: 500_000,
      dueAtMs: 100_000,
    });
    expect(restored.state).toBe("ACTIVE");
    expect(restored.billableExecutionAllowed).toBe(true);
  });

  it("does not let payment clear a risk/chargeback block", () => {
    const blocked = decideEntitlement({
      currentState: "SUSPENDED_RISK",
      paymentStatus: "CLEARED",
      nowMs: 500_000,
      riskBlocked: true,
    });
    expect(blocked.state).toBe("SUSPENDED_RISK");
    expect(blocked.billableExecutionAllowed).toBe(false);
  });

  it("fails closed for unapproved or inactive published price schedules", () => {
    const now = Date.parse("2026-09-02T00:00:00Z");
    const base = {
      scheduleId: "s1",
      catalogId: "legal_personal",
      baseAmountMinor: 1000,
      currency: "AUD",
      interval: "monthly" as const,
      aiRatePlanId: "ai1",
      managementFeePlanId: "m1",
      effectiveFrom: "2026-09-01T00:00:00Z",
      active: true,
      ownerApproved: true,
    };
    expect(isPublishedRoomPriceUsable(base, now)).toBe(true);
    expect(isPublishedRoomPriceUsable({ ...base, ownerApproved: false }, now)).toBe(false);
    expect(isPublishedRoomPriceUsable({ ...base, active: false }, now)).toBe(false);
  });

  it("keeps Royal Command management fee as a separately calculable line", () => {
    expect(managementFeeMinor({ kind: "fixed_recurring", amountMinor: 500, currency: "AUD" }, 10_000, 4)).toBe(500);
    expect(managementFeeMinor({ kind: "fixed_per_execution", amountMinor: 25, currency: "AUD" }, 10_000, 4)).toBe(100);
    expect(managementFeeMinor({ kind: "usage_percentage", basisPoints: 1500 }, 10_000, 4)).toBe(1500);
    expect(managementFeeMinor({ kind: "hybrid", recurringAmountMinor: 500, currency: "AUD", usageBasisPoints: 1000 }, 10_000, 4)).toBe(1500);
  });
});
