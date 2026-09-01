import { describe, expect, it } from "vitest";
import {
  ACCOUNTING_PROFESSIONAL_ROOMS,
  LEGAL_PROFESSIONAL_ROOMS,
  PROFESSIONAL_ROOM_CATALOG,
  decideProfessionalCapability,
} from "./professional-room-core";

describe("Professional Room v2.3 core catalog", () => {
  it("keeps exactly 10 Legal and 8 Accounting catalog entries", () => {
    expect(LEGAL_PROFESSIONAL_ROOMS).toHaveLength(10);
    expect(ACCOUNTING_PROFESSIONAL_ROOMS).toHaveLength(8);
    expect(PROFESSIONAL_ROOM_CATALOG).toHaveLength(18);
  });

  it("uses unique catalog IDs while bridge_la stays one internal product ID", () => {
    const catalogIds = PROFESSIONAL_ROOM_CATALOG.map((room) => room.catalogId);
    expect(new Set(catalogIds).size).toBe(18);

    const bridgeEntries = PROFESSIONAL_ROOM_CATALOG.filter((room) => room.productId === "bridge_la");
    expect(bridgeEntries).toHaveLength(2);
    expect(new Set(bridgeEntries.map((room) => room.productId))).toEqual(new Set(["bridge_la"]));
    expect(bridgeEntries.every((room) => room.vault === "virtual_bridge")).toBe(true);
  });

  it("never treats the bridge as a merged Legal or Accounting vault", () => {
    const bridgeEntries = PROFESSIONAL_ROOM_CATALOG.filter((room) => room.productId === "bridge_la");
    expect(bridgeEntries.some((room) => room.vault === "legal")).toBe(false);
    expect(bridgeEntries.some((room) => room.vault === "accounting")).toBe(false);
  });
});

describe("Professional capability fail-closed policy", () => {
  it("keeps low-risk internal capability ON when no gate is missing", () => {
    expect(decideProfessionalCapability({ risk: "LOW" })).toMatchObject({
      defaultState: "ON",
      humanConfirmationRequired: false,
      externalSideEffectAllowedByDefault: false,
    });
  });

  it("makes high-risk professional judgment Candidate-only", () => {
    expect(decideProfessionalCapability({ risk: "HIGH" })).toMatchObject({
      defaultState: "CANDIDATE",
      humanConfirmationRequired: true,
      externalSideEffectAllowedByDefault: false,
    });
  });

  it("forces regulated capability OFF when Country Pack or review is not verified", () => {
    const decision = decideProfessionalCapability({
      risk: "REGULATED",
      countryPackRequired: true,
      countryPackVerified: false,
      jurisdictionReviewVerified: false,
    });
    expect(decision.defaultState).toBe("OFF");
    expect(decision.reasons).toContain("COUNTRY_PACK_NOT_VERIFIED");
    expect(decision.reasons).toContain("JURISDICTION_REVIEW_NOT_VERIFIED");
  });

  it("keeps every external side effect DEFAULT DENY", () => {
    const decision = decideProfessionalCapability({ risk: "LOW", externalSideEffect: true });
    expect(decision.defaultState).toBe("OFF");
    expect(decision.externalSideEffectAllowedByDefault).toBe(false);
    expect(decision.humanConfirmationRequired).toBe(true);
  });

  it("does not report a connector as connected before verification", () => {
    const unverified = decideProfessionalCapability({
      risk: "MEDIUM",
      connectorRequired: true,
      connectorVerified: false,
    });
    expect(unverified.connected).toBe(false);
    expect(unverified.defaultState).toBe("OFF");

    const verified = decideProfessionalCapability({
      risk: "MEDIUM",
      connectorRequired: true,
      connectorVerified: true,
    });
    expect(verified.connected).toBe(true);
    expect(verified.defaultState).toBe("ON");
  });
});
