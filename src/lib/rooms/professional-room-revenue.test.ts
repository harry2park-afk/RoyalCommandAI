import { describe, expect, it } from "vitest";
import {
  calculateProfessionalRoomRevenue,
  revenueFormulaLabel,
} from "./professional-room-revenue";

describe("Professional Room hybrid revenue", () => {
  it("keeps Room base, AI usage, RC management fee and add-ons as separate lines", () => {
    const result = calculateProfessionalRoomRevenue({
      currency: "AUD",
      roomBaseChargeMinor: 10_000,
      aiUsageCharges: [
        { providerId: "openai", modelId: "gpt", usageChargeMinor: 2_000 },
        { providerId: "anthropic", modelId: "claude", usageChargeMinor: 1_000 },
      ],
      managementFeePlan: { kind: "hybrid", recurringAmountMinor: 1_500, currency: "AUD", usageBasisPoints: 1000 },
      addOns: [{ id: "tax-pack", amountMinor: 2_500 }],
      executionCount: 2,
    });

    expect(result).toEqual({
      currency: "AUD",
      roomBaseChargeMinor: 10_000,
      aiUsageChargeMinor: 3_000,
      royalCommandManagementFeeMinor: 1_800,
      addOnChargeMinor: 2_500,
      totalChargeMinor: 17_300,
    });
    expect(revenueFormulaLabel()).toBe("ROOM_BASE + AI_USAGE + RC_MANAGEMENT_FEE + ADD_ONS");
  });

  it("allows different Room base charges instead of one universal Professional price", () => {
    const low = calculateProfessionalRoomRevenue({
      currency: "AUD",
      roomBaseChargeMinor: 5_000,
      aiUsageCharges: [],
      managementFeePlan: { kind: "fixed_recurring", amountMinor: 500, currency: "AUD" },
      executionCount: 0,
    });
    const high = calculateProfessionalRoomRevenue({
      currency: "AUD",
      roomBaseChargeMinor: 50_000,
      aiUsageCharges: [],
      managementFeePlan: { kind: "fixed_recurring", amountMinor: 5_000, currency: "AUD" },
      executionCount: 0,
    });
    expect(low.totalChargeMinor).toBe(5_500);
    expect(high.totalChargeMinor).toBe(55_000);
  });

  it("fails closed on invalid negative billing amounts", () => {
    expect(() => calculateProfessionalRoomRevenue({
      currency: "AUD",
      roomBaseChargeMinor: -1,
      aiUsageCharges: [],
      managementFeePlan: { kind: "fixed_recurring", amountMinor: 0, currency: "AUD" },
      executionCount: 0,
    })).toThrow("INVALID_BILLING_AMOUNT");
  });
});
