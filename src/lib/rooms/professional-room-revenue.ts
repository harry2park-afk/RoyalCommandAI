import { managementFeeMinor, type BillingCurrency, type ManagementFeePlan } from "./professional-room-billing";

export type AiUsageCharge = {
  providerId: string;
  modelId: string;
  usageChargeMinor: number;
};

export type AddOnCharge = {
  id: string;
  amountMinor: number;
};

export type ProfessionalRoomRevenueInput = {
  currency: BillingCurrency;
  roomBaseChargeMinor: number;
  aiUsageCharges: readonly AiUsageCharge[];
  managementFeePlan: ManagementFeePlan;
  addOns?: readonly AddOnCharge[];
  executionCount: number;
};

export type ProfessionalRoomRevenueBreakdown = {
  currency: BillingCurrency;
  roomBaseChargeMinor: number;
  aiUsageChargeMinor: number;
  royalCommandManagementFeeMinor: number;
  addOnChargeMinor: number;
  totalChargeMinor: number;
};

function validMinor(value: number): number {
  if (!Number.isInteger(value) || value < 0) throw new Error("INVALID_BILLING_AMOUNT");
  return value;
}

export function calculateProfessionalRoomRevenue(
  input: ProfessionalRoomRevenueInput,
): ProfessionalRoomRevenueBreakdown {
  const roomBaseChargeMinor = validMinor(input.roomBaseChargeMinor);
  const aiUsageChargeMinor = input.aiUsageCharges.reduce(
    (sum, item) => sum + validMinor(item.usageChargeMinor),
    0,
  );
  const addOnChargeMinor = (input.addOns || []).reduce(
    (sum, item) => sum + validMinor(item.amountMinor),
    0,
  );
  const royalCommandManagementFeeMinor = managementFeeMinor(
    input.managementFeePlan,
    aiUsageChargeMinor,
    input.executionCount,
  );

  return {
    currency: input.currency,
    roomBaseChargeMinor,
    aiUsageChargeMinor,
    royalCommandManagementFeeMinor,
    addOnChargeMinor,
    totalChargeMinor:
      roomBaseChargeMinor +
      aiUsageChargeMinor +
      royalCommandManagementFeeMinor +
      addOnChargeMinor,
  };
}

export function revenueFormulaLabel(): string {
  return "ROOM_BASE + AI_USAGE + RC_MANAGEMENT_FEE + ADD_ONS";
}
