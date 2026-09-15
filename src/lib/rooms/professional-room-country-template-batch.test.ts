import { describe, expect, it } from "vitest";
import { buildProfessionalRoomCountryTemplateBatch } from "./professional-room-country-template-batch";
import { PROFESSIONAL_ROOM_DIRECTORY } from "./professional-room-directory";

const FIRST_WAVE = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
const NEXT_PRIORITY = ["SG", "CN", "HK", "TW", "IN"] as const;

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

  it("keeps governed room identity invariant across first-wave country overlays", () => {
    const expectedCatalogIds = PROFESSIONAL_ROOM_DIRECTORY.map((room) => room.id);
    const baselineBatch = buildProfessionalRoomCountryTemplateBatch("AU");

    expect(baselineBatch).not.toBeNull();
    if (!baselineBatch) throw new Error("AU Professional Room baseline batch did not resolve");

    expect(baselineBatch.plans.map((plan) => plan.catalogId)).toEqual(expectedCatalogIds);

    const baselineIdentity = baselineBatch.plans.map((plan) => ({
      catalogId: plan.catalogId,
      productId: plan.productId,
      domain: plan.domain,
      vault: plan.vault,
      sharedDataMode: plan.sharedDataMode,
      crossVaultStorageAllowed: plan.crossVaultStorageAllowed,
    }));

    for (const countryCode of FIRST_WAVE) {
      const batch = buildProfessionalRoomCountryTemplateBatch(countryCode);

      expect(batch, countryCode).not.toBeNull();
      if (!batch) throw new Error(`${countryCode} Professional Room batch did not resolve`);

      expect(batch.plans.map((plan) => plan.catalogId), countryCode).toEqual(expectedCatalogIds);
      expect(
        batch.plans.map((plan) => ({
          catalogId: plan.catalogId,
          productId: plan.productId,
          domain: plan.domain,
          vault: plan.vault,
          sharedDataMode: plan.sharedDataMode,
          crossVaultStorageAllowed: plan.crossVaultStorageAllowed,
        })),
        countryCode,
      ).toEqual(baselineIdentity);
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

  it("keeps next-priority countries compatible with canonical config rollout without granting launch authority", () => {
    for (const countryCode of NEXT_PRIORITY) {
      const batch = buildProfessionalRoomCountryTemplateBatch(countryCode);

      // This professional-room lane must not hard-code a temporary assumption that
      // next-priority countries are permanently unsupported. CountryConfig remains
      // the authority: a country may still resolve to null on this branch, but once
      // its separately reviewed canonical config is present, the same 18-room batch
      // must remain source-only and fail closed behind the Country Gate.
      if (batch === null) continue;

      expect(batch.countryCode, countryCode).toBe(countryCode);
      expect(batch.roomCount, countryCode).toBe(18);
      expect(batch.plans, countryCode).toHaveLength(18);
      expect(new Set(batch.plans.map((plan) => plan.catalogId)).size, countryCode).toBe(18);
      expect(batch.launchAuthority, countryCode).toBe("COUNTRY_GATE_REQUIRED");
      expect(batch.createsRooms, countryCode).toBe(false);
      expect(batch.activatesCountry, countryCode).toBe(false);

      for (const plan of batch.plans) {
        expect(plan.countryCode, countryCode).toBe(countryCode);
        expect(plan.launchAuthority, countryCode).toBe("COUNTRY_GATE_REQUIRED");
        expect(plan.humanApprovalRequired, countryCode).toBe(true);
        expect(plan.regulatedExecutionAllowed, countryCode).toBe(false);
        expect(plan.livePaymentExecutionAllowed, countryCode).toBe(false);
        expect(plan.createsRoom, countryCode).toBe(false);
        expect(plan.activatesCountry, countryCode).toBe(false);
      }
    }
  });

  it("fails closed for an empty or unknown country code", () => {
    expect(buildProfessionalRoomCountryTemplateBatch("")).toBeNull();
    expect(buildProfessionalRoomCountryTemplateBatch("ZZ")).toBeNull();
  });
});
