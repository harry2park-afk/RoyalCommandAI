import { describe, expect, it } from "vitest";
import {
  ACCOUNTING_PROFESSIONAL_DIRECTORY,
  LEGAL_PROFESSIONAL_DIRECTORY,
  PROFESSIONAL_ROOM_DIRECTORY,
  getProfessionalRoomsByProductId,
  resolveProfessionalRoomTemplate,
} from "./professional-room-directory";

describe("professional room directory", () => {
  it("connects exactly 10 Legal and 8 Accounting catalog entries", () => {
    expect(LEGAL_PROFESSIONAL_DIRECTORY).toHaveLength(10);
    expect(ACCOUNTING_PROFESSIONAL_DIRECTORY).toHaveLength(8);
    expect(PROFESSIONAL_ROOM_DIRECTORY).toHaveLength(18);
  });

  it("maps Legal rooms to legal template and Accounting rooms to accounting template", () => {
    for (const room of LEGAL_PROFESSIONAL_DIRECTORY) expect(room.templateId).toBe("legal");
    for (const room of ACCOUNTING_PROFESSIONAL_DIRECTORY) expect(room.templateId).toBe("accounting");
  });

  it("keeps bridge_la as one internal product with two catalog representations", () => {
    const bridgeEntries = getProfessionalRoomsByProductId("bridge_la");
    expect(bridgeEntries).toHaveLength(2);
    expect(new Set(bridgeEntries.map((room) => room.productId))).toEqual(new Set(["bridge_la"]));
    expect(bridgeEntries.every((room) => room.vault === "virtual_bridge")).toBe(true);
    expect(new Set(bridgeEntries.map((room) => room.domain))).toEqual(new Set(["legal", "accounting"]));
  });

  it("resolves every catalog entry without changing existing Room IDs or UI", () => {
    for (const room of PROFESSIONAL_ROOM_DIRECTORY) {
      const resolved = resolveProfessionalRoomTemplate(room.id);
      expect(resolved).not.toBeNull();
      expect(resolved?.productId).toBe(room.productId);
      expect(resolved?.vault).toBe(room.vault);
      expect(resolved?.crossVaultStorageAllowed).toBe(false);
    }
  });

  it("uses ShareGrant virtual view for bridge_la instead of cross-vault storage", () => {
    for (const room of getProfessionalRoomsByProductId("bridge_la")) {
      const resolved = resolveProfessionalRoomTemplate(room.id);
      expect(resolved?.sharedDataMode).toBe("SHAREGRANT_VIRTUAL_VIEW");
      expect(resolved?.crossVaultStorageAllowed).toBe(false);
    }
  });

  it("fails closed for unknown professional catalog IDs", () => {
    expect(resolveProfessionalRoomTemplate("unknown_professional_room")).toBeNull();
  });
});
