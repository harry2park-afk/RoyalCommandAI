import { describe, expect, it } from "vitest";
import { BASE_ROOM_MONTHLY_USD, calculateCreateRoomPricing } from "./create-room-pricing";

describe("Create Room pricing currency boundaries", () => {
  it("keeps the approved base Room rent at USD 3.80", () => {
    const summary = calculateCreateRoomPricing([], true, 30);

    expect(BASE_ROOM_MONTHLY_USD).toBe(3.8);
    expect(summary.baseRoomMonthlyUsd).toBe(3.8);
    expect(summary.monthlyAddOnsAud).toBe(0);
    expect(summary.monthlyAddOnsAfterPromotionAud).toBe(0);
  });

  it("calculates AUD add-ons and promotion without combining them with USD Room rent", () => {
    const summary = calculateCreateRoomPricing(
      [
        { billing: "monthly", priceAud: 28 },
        { billing: "monthly", priceAud: 80 },
        { billing: "one_time", priceAud: 45 },
      ],
      true,
      30,
    );

    expect(summary.baseRoomMonthlyUsd).toBe(3.8);
    expect(summary.monthlyAddOnsAud).toBe(108);
    expect(summary.promotionDiscountAud).toBeCloseTo(32.4);
    expect(summary.monthlyAddOnsAfterPromotionAud).toBeCloseTo(75.6);
    expect(summary.oneTimeAddOnsAud).toBe(45);
    expect(summary).not.toHaveProperty("monthlyTotal");
    expect(summary).not.toHaveProperty("grandTotal");
  });

  it("does not invent FX or a charge for unconfirmed pricing", () => {
    const summary = calculateCreateRoomPricing(
      [
        { billing: "monthly" },
        { billing: "quote" },
        { billing: "included" },
      ],
      false,
      30,
    );

    expect(summary.monthlyAddOnsAud).toBe(0);
    expect(summary.promotionDiscountAud).toBe(0);
    expect(summary.hasUnconfirmedPricing).toBe(true);
  });
});
