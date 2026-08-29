import { describe, expect, it } from "vitest";
import { getConfiguredCountryCodes } from "../../config/countryResolver";
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
    expect(blueprint.locale.supportedLanguageTags).toEqual(["en-AU"]);
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

  it("keeps a primary language and additional supported languages together", () => {
    const blueprint = compileRoomFactoryBlueprint({
      roomName: "Harry Legal",
      templateId: "legal",
      countryCode: "AU",
      languageTag: "ko-KR",
      languageTags: ["ko-KR", "en-AU", "ko-KR"],
    });

    expect(blueprint.locale.languageTag).toBe("ko-KR");
    expect(blueprint.locale.supportedLanguageTags).toEqual(["ko-KR", "en-AU"]);
    expect(blueprint.locale.countryCode).toBe("AU");
  });

  it("supports an unregistered country without duplicating or pretending compliance", () => {
    const blueprint = compileRoomFactoryBlueprint({
      roomName: "Custom Country Accounting Room",
      templateId: "accounting",
      countryCode: "ZZ",
      languageTag: "en",
      timeZone: "UTC",
      currencyCode: "USD",
    });

    expect(blueprint.readiness.readyForSafeBuild).toBe(true);
    expect(blueprint.locale.countryCode).toBe("ZZ");
    expect(blueprint.locale.countryProfileStatus).toBe("custom-profile-required");
    expect(blueprint.readiness.warnings.join(" ")).toMatch(/compliance.*unverified/i);
  });

  it("uses locale defaults without pretending a locale-only country is a configured profile", () => {
    expect(getConfiguredCountryCodes()).not.toContain("SG");

    const blueprint = compileRoomFactoryBlueprint({
      roomName: "Singapore Technology Room",
      templateId: "technology",
      countryCode: "SG",
      languageTag: "",
    });

    expect(blueprint.locale.countryCode).toBe("SG");
    expect(blueprint.locale.languageTag).toBe("en-SG");
    expect(blueprint.locale.timeZone).toBe("Asia/Singapore");
    expect(blueprint.locale.currencyCode).toBe("SGD");
    expect(blueprint.locale.countryProfileStatus).toBe("custom-profile-required");
    expect(blueprint.readiness.warnings.join(" ")).toMatch(/country.*profile.*compliance.*unverified/i);
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

  it("reports locale coverage separately from configured launch profiles", () => {
    const coverage = roomFactoryCountryCoverage();
    expect(coverage.registeredProfiles).toBe(getConfiguredCountryCodes().length);
    expect(coverage.registeredProfiles).toBe(6);
    expect(coverage.localePresets).toBeGreaterThanOrEqual(100);
    expect(coverage.extensibleCountryModel).toBe(true);
    expect(coverage.strategy).toMatch(/global core.*country-profile overlays/i);
  });
});
