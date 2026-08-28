import { describe, expect, it } from "vitest";
import { compileRoomFactoryBlueprint, roomFactoryCountryCoverage } from "./factory";

describe("Room Factory Control Plane V1", () => {
  it("compiles an existing legal template into a safe global blueprint", () => {
    const blueprint = compileRoomFactoryBlueprint({
      roomName: "Sydney Legal Room",
      templateId: "legal",
      countryCode: "AU",
      languageTag: "en-AU",
      approvalMode: "approval",
      selectedMaterials: ["room-memory", "documents"],
    });

    expect(blueprint.room.templateId).toBe("legal");
    expect(blueprint.locale.countryProfileStatus).toBe("registered");
    expect(blueprint.readiness.readyForSafeBuild).toBe(true);
    expect(blueprint.execution.singleWriteAuthority).toBe(true);
    expect(blueprint.execution.reviewerCanWrite).toBe(false);
    expect(blueprint.execution.productionWriteDefault).toBe(false);
    expect(blueprint.execution.evidenceBeforeSuccess).toBe(true);
    expect(blueprint.clonePolicy).toEqual({
      mode: "structure-only",
      customerData: false,
      memory: false,
      credentials: false,
      secrets: false,
    });
    expect(blueprint.lanes).toHaveLength(5);
    expect(blueprint.lanes.every((lane) => lane.writeAuthority === "single-writer")).toBe(true);
  });

  it("supports an unregistered country without duplicating or pretending compliance", () => {
    const blueprint = compileRoomFactoryBlueprint({
      roomName: "Germany Accounting Room",
      templateId: "accounting",
      countryCode: "DE",
      languageTag: "de-DE",
      timeZone: "Europe/Berlin",
      currencyCode: "EUR",
    });

    expect(blueprint.readiness.readyForSafeBuild).toBe(true);
    expect(blueprint.locale.countryCode).toBe("DE");
    expect(blueprint.locale.countryProfileStatus).toBe("custom-profile-required");
    expect(blueprint.readiness.warnings.join(" ")).toMatch(/compliance.*unverified/i);
  });

  it("blocks an incomplete blueprint before safe build", () => {
    const blueprint = compileRoomFactoryBlueprint({
      roomName: "",
      templateId: "custom",
      countryCode: "AU",
      languageTag: "en-AU",
      currencyCode: "A",
    });

    expect(blueprint.readiness.readyForSafeBuild).toBe(false);
    expect(blueprint.readiness.blockers).toContain("Room name is required.");
    expect(blueprint.readiness.blockers).toContain("Currency must be a 3-letter code.");
  });

  it("deduplicates selected materials and keeps secrets host-owned", () => {
    const blueprint = compileRoomFactoryBlueprint({
      roomName: "Technology Room",
      templateId: "technology",
      countryCode: "US",
      languageTag: "en-US",
      selectedMaterials: ["documents", "documents", "website-builder"],
      websiteKit: true,
    });

    expect(blueprint.capabilities.selectedMaterials).toEqual(["documents", "website-builder"]);
    expect(blueprint.capabilities.websiteKit).toBe(true);
    expect(blueprint.execution.secretsStayHostOwned).toBe(true);
    expect(blueprint.clonePolicy.credentials).toBe(false);
  });

  it("exposes a country-overlay model suitable for scaling beyond registered profiles", () => {
    const coverage = roomFactoryCountryCoverage();
    expect(coverage.registeredProfiles).toBeGreaterThan(0);
    expect(coverage.extensibleCountryModel).toBe(true);
    expect(coverage.strategy).toMatch(/global core.*country-profile overlays/i);
  });
});
