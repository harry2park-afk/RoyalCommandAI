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
    // Fresh Hosted READ-ONLY evidence on 2026-09-13 contains legal, custom and website manifests.
    // The current country-rollout candidate does not yet contain the dedicated website template/profile.
    const result = evaluateRoomFactorySourceReconciliation(["legal", "custom", "website"]);

    expect(result.consistent).toBe(false);
    expect(result.hostedTemplatesMissingFromSource).toEqual(["website"]);
  });

  it("accepts Hosted template IDs only when every ID is represented by the candidate source", () => {
    const result = evaluateRoomFactorySourceReconciliation(["legal", "custom"]);

    expect(result.consistent).toBe(true);
    expect(result.hostedTemplatesMissingFromSource).toEqual([]);
  });
});
