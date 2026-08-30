import { describe, expect, it } from "vitest";
import { CREATE_ROOM_COUNTRIES } from "./create-room-i18n";
import { BASE_ROOM_MONTHLY_USD, calculateCreateRoomPricing } from "./create-room-pricing";

const OCTOBER_LAUNCH_COUNTRIES = ["AU", "US", "CA", "KR", "JP", "GB"] as const;

describe("Create Room pricing currency boundaries", () => {
  it("keeps the approved base Room rent at USD 3.80", () => {
    const summary = calculateCreateRoomPricing([], true, 30);

    expect(BASE_ROOM_MONTHLY_USD).toBe(3.8);
    expect(summary.baseRoomMonthlyUsd).toBe(3.8);
    expect(summary.monthlyAddOnsAud).toBe(0);
    expect(summary.monthlyAddOnsAfterPromotionAud).toBe(0);
  });

  it("keeps USD 3.80 as the base Room rent for all six October launch countries", () => {
    const configuredCountryCodes = new Set(CREATE_ROOM_COUNTRIES.map((country) => country.code));

    for (const countryCode of OCTOBER_LAUNCH_COUNTRIES) {
      expect(configuredCountryCodes.has(countryCode)).toBe(true);
      expect(calculateCreateRoomPricing([], false, 30).baseRoomMonthlyUsd).toBe(3.8);
    }
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
