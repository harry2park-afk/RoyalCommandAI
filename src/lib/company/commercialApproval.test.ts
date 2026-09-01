import { describe, expect, it } from "vitest";
import {
  canDisplayCommercialPrice,
  canReleaseCommercialDocument,
} from "./commercialApproval";

describe("commercial pricing authority", () => {
  const now = Date.parse("2026-09-02T00:00:00Z");
  const authority = {
    ownerApproved: true,
    active: true,
    scheduleId: "legal_personal-v1",
    effectiveFromMs: Date.parse("2026-09-01T00:00:00Z"),
  };

  it("allows only active owner-approved published catalog prices", () => {
    expect(canDisplayCommercialPrice("PUBLISHED_CATALOG_PRICE", authority, now)).toBe(true);
    expect(canDisplayCommercialPrice("PUBLISHED_CATALOG_PRICE", { ...authority, ownerApproved: false }, now)).toBe(false);
    expect(canDisplayCommercialPrice("PUBLISHED_CATALOG_PRICE", { ...authority, active: false }, now)).toBe(false);
  });

  it("never lets the system display a custom quote amount", () => {
    expect(canDisplayCommercialPrice("CUSTOM_QUOTE", authority, now)).toBe(false);
  });

  it("keeps custom commercial document release owner-only", () => {
    expect(canReleaseCommercialDocument("HARRY_SIGNED_OWNER_ONLY")).toBe(false);
  });
});
