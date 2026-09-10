import { describe, expect, it } from "vitest";
import { PROFESSIONAL_ROOM_DIRECTORY } from "./professional-room-directory";
import { buildProfessionalRoomFactoryPlan } from "./professional-room-factory-adapter";

describe("Professional Room factory adapter", () => {
  it("maps all 18 governed Professional Rooms onto existing Legal/Accounting factory primitives", () => {
    expect(PROFESSIONAL_ROOM_DIRECTORY).toHaveLength(18);

    for (const room of PROFESSIONAL_ROOM_DIRECTORY) {
      const plan = buildProfessionalRoomFactoryPlan(room.id);
      expect(plan, room.id).not.toBeNull();
      expect(plan?.catalogId).toBe(room.id);
      expect(plan?.productId).toBe(room.productId);
      expect(plan?.templateId).toBe(room.templateId);
      expect(plan?.domain).toBe(room.domain);
      expect(plan?.vault).toBe(room.vault);
      expect(plan?.safetyTier).toBe("regulated");
      expect(plan?.adviceBoundary.length).toBeGreaterThan(0);
      expect(plan?.crossVaultStorageAllowed).toBe(false);
    }
  });

  it("keeps Legal 10 and Accounting 8 on the correct template primitive", () => {
    const legal = PROFESSIONAL_ROOM_DIRECTORY.filter((room) => room.domain === "legal");
    const accounting = PROFESSIONAL_ROOM_DIRECTORY.filter((room) => room.domain === "accounting");

    expect(legal).toHaveLength(10);
    expect(accounting).toHaveLength(8);
    expect(legal.every((room) => buildProfessionalRoomFactoryPlan(room.id)?.templateId === "legal")).toBe(true);
    expect(accounting.every((room) => buildProfessionalRoomFactoryPlan(room.id)?.templateId === "accounting")).toBe(true);
  });

  it("preserves bridge_la as a ShareGrant virtual view and never merged vault storage", () => {
    const bridgePlans = PROFESSIONAL_ROOM_DIRECTORY
      .filter((room) => room.productId === "bridge_la")
      .map((room) => buildProfessionalRoomFactoryPlan(room.id));

    expect(bridgePlans).toHaveLength(2);
    expect(bridgePlans.every((plan) => plan?.productId === "bridge_la")).toBe(true);
    expect(bridgePlans.every((plan) => plan?.vault === "virtual_bridge")).toBe(true);
    expect(bridgePlans.every((plan) => plan?.sharedDataMode === "SHAREGRANT_VIRTUAL_VIEW")).toBe(true);
    expect(bridgePlans.every((plan) => plan?.crossVaultStorageAllowed === false)).toBe(true);
  });

  it("fails closed for unknown Professional Room catalog IDs", () => {
    expect(buildProfessionalRoomFactoryPlan("unknown-professional-room")).toBeNull();
  });
});
