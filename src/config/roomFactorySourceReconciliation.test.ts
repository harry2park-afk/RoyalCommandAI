import { describe, expect, it } from "vitest";
import { DOMAIN_PROFILES } from "../lib/rooms/factory-v2";
import { ROOM_TEMPLATES } from "../lib/rooms/templates";
import { evaluateRoomFactorySourceReconciliation } from "./roomFactorySourceReconciliation";

describe("Room Factory source reconciliation", () => {
  it("keeps the candidate source internally complete", () => {
    const result = evaluateRoomFactorySourceReconciliation([]);

    expect(result.sourceTemplatesMissingDomainProfiles).toEqual([]);
  });

  it("keeps template IDs unique and exactly paired with Domain Profile identities", () => {
    const templateIds = ROOM_TEMPLATES.map((template) => template.id);
    const profileEntries = Object.entries(DOMAIN_PROFILES);
    const profileIds = profileEntries.map(([profileId]) => profileId);

    expect(new Set(templateIds).size).toBe(templateIds.length);
    expect([...templateIds].sort()).toEqual([...profileIds].sort());

    for (const [profileId, profile] of profileEntries) {
      expect(profile.templateId).toBe(profileId);
    }
  });

  it("fails closed when the Hosted snapshot contains a template absent from the candidate source", () => {
    const result = evaluateRoomFactorySourceReconciliation(["legal", "custom", "website", "unknown-hosted-template"]);

    expect(result.consistent).toBe(false);
    expect(result.hostedTemplatesMissingFromSource).toEqual(["unknown-hosted-template"]);
  });

  it("reconciles the fresh Hosted legal/custom/website template inventory", () => {
    // Fresh Hosted READ-ONLY evidence on 2026-09-15 contains legal, custom and website manifests.
    const result = evaluateRoomFactorySourceReconciliation(["legal", "custom", "website"]);

    expect(result.consistent).toBe(true);
    expect(result.hostedTemplatesMissingFromSource).toEqual([]);
  });
});
