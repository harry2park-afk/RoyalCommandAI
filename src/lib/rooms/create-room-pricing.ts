export const BASE_ROOM_MONTHLY_USD = 3.8;

export type CreateRoomPricingLine = {
  billing: "monthly" | "one_time" | "quote" | "included";
  priceAud?: number;
};

export type CreateRoomPricingSummary = {
  baseRoomMonthlyUsd: number;
  monthlyAddOnsAud: number;
  promotionDiscountAud: number;
  monthlyAddOnsAfterPromotionAud: number;
  oneTimeAddOnsAud: number;
  hasUnconfirmedPricing: boolean;
};

/**
 * Keeps the approved USD Room rent and AUD service pricing in separate ledgers.
 * This function deliberately does not return a cross-currency grand total or
 * perform FX conversion.
 */
export function calculateCreateRoomPricing(
  items: CreateRoomPricingLine[],
  promotionEnabled: boolean,
  promotionPercent: number,
): CreateRoomPricingSummary {
  const monthlyAddOnsAud = items.reduce(
    (sum, item) => sum + (item.billing === "monthly" ? item.priceAud || 0 : 0),
    0,
  );
  const oneTimeAddOnsAud = items.reduce(
    (sum, item) => sum + (item.billing === "one_time" ? item.priceAud || 0 : 0),
    0,
  );
  const promotionDiscountAud = promotionEnabled
    ? monthlyAddOnsAud * (promotionPercent / 100)
    : 0;

  return {
    baseRoomMonthlyUsd: BASE_ROOM_MONTHLY_USD,
    monthlyAddOnsAud,
    promotionDiscountAud,
    monthlyAddOnsAfterPromotionAud: Math.max(0, monthlyAddOnsAud - promotionDiscountAud),
    oneTimeAddOnsAud,
    hasUnconfirmedPricing: items.some(
      (item) => item.priceAud == null && item.billing !== "included",
    ),
  };
}
