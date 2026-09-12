import { describe, expect, it } from "vitest";
import { buildProfessionalRoomCountryTemplateBatch } from "./professional-room-country-template-batch";
import { PROFESSIONAL_ROOM_DIRECTORY } from "./professional-room-directory";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const NEXT_PRIORITY_WITHOUT_CANONICAL_CONFIG = ["SG", "CN", "HK", "TW", "IN"] as const;

describe("Professional Room country template batch", () => {
  it("prepares an all-or-nothing 18-room source batch for every first-wave country", () => {
    expect(PROFESSIONAL_ROOM_DIRECTORY).toHaveLength(18);

    for (const countryCode of FIRST_WAVE) {
      const batch = buildProfessionalRoomCountryTemplateBatch(countryCode);

      expect(batch, countryCode).not.toBeNull();
      expect(batch?.countryCode).toBe(countryCode);
      expect(batch?.roomCount).toBe(18);
      expect(batch?.plans).toHaveLength(18);
      expect(new Set(batch?.plans.map((plan) => plan.catalogId)).size).toBe(18);
      expect(batch?.launchAuthority).toBe("COUNTRY_GATE_REQUIRED");
      expect(batch?.createsRooms).toBe(false);
      expect(batch?.activatesCountry).toBe(false);

      for (const plan of batch?.plans ?? []) {
        expect(plan.countryCode).toBe(countryCode);
        expect(plan.launchAuthority).toBe("COUNTRY_GATE_REQUIRED");
        expect(plan.humanApprovalRequired).toBe(true);
        expect(plan.regulatedExecutionAllowed).toBe(false);
        expect(plan.livePaymentExecutionAllowed).toBe(false);
        expect(plan.createsRoom).toBe(false);
        expect(plan.activatesCountry).toBe(false);
      }
    }
  });

  it("preserves the single bridge product as two governed catalog views without cross-vault storage", () => {
    const batch = buildProfessionalRoomCountryTemplateBatch("AU");
    const bridgePlans = batch?.plans.filter((plan) => plan.productId === "bridge_la") ?? [];

    expect(bridgePlans).toHaveLength(2);
    expect(new Set(bridgePlans.map((plan) => plan.domain))).toEqual(new Set(["legal", "accounting"]));
    expect(new Set(bridgePlans.map((plan) => plan.vault))).toEqual(new Set(["virtual_bridge"]));
    expect(bridgePlans.every((plan) => plan.crossVaultStorageAllowed === false)).toBe(true);
    expect(
      bridgePlans.every((plan) => plan.sharedDataMode === "SHAREGRANT_VIRTUAL_VIEW"),
    ).toBe(true);
  });

  it("normalizes country codes without weakening the batch launch boundary", () => {
    const batch = buildProfessionalRoomCountryTemplateBatch(" ca ");

    expect(batch?.countryCode).toBe("CA");
    expect(batch?.roomCount).toBe(18);
    expect(batch?.createsRooms).toBe(false);
    expect(batch?.activatesCountry).toBe(false);
  });

  it("fails closed instead of producing a partial batch for countries without canonical config", () => {
    for (const countryCode of NEXT_PRIORITY_WITHOUT_CANONICAL_CONFIG) {
      expect(buildProfessionalRoomCountryTemplateBatch(countryCode), countryCode).toBeNull();
    }
  });

  it("fails closed for an empty or unknown country code", () => {
    expect(buildProfessionalRoomCountryTemplateBatch("")).toBeNull();
    expect(buildProfessionalRoomCountryTemplateBatch("ZZ")).toBeNull();
  });
});
