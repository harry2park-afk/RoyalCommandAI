import { describe, expect, it } from "vitest";
import { ROOM_TEMPLATES } from "./templates";
import {
  CONNECTOR_REGISTRY,
  CONVERSATION_RULES,
  DOMAIN_PROFILES,
  GLOBAL_CORE_MATERIAL_IDS,
  resolveDomainProfile,
} from "./factory-v2";

describe("Room Factory V2", () => {
  it("maps every current Room template to a Domain Profile", () => {
    expect(ROOM_TEMPLATES).toHaveLength(39);
    for (const template of ROOM_TEMPLATES) {
      expect(DOMAIN_PROFILES[template.id], `missing Domain Profile for ${template.id}`).toBeDefined();
      const resolved = resolveDomainProfile(template.id);
      expect(resolved.profile.templateId).toBe(template.id);
      expect(resolved.defaultMaterialIds.length).toBeGreaterThan(0);
      expect(resolved.profile.starters.length).toBeGreaterThan(0);
    }
  });

  it("always includes the safe Global Core when materials exist", () => {
    const resolved = resolveDomainProfile("accounting");
    for (const id of GLOBAL_CORE_MATERIAL_IDS) {
      if (id === "preview" || id === "data-isolation" || id === "room-identity" || id === "room-history" || id === "primary-ai" || id === "room-memory" || id === "document-reader" || id === "web-search" || id === "owner-role" || id === "human-approval") {
        expect(resolved.defaultMaterialIds).toContain(id);
      }
    }
  });

  it("keeps every Connector off until explicit approval", () => {
    for (const connector of Object.values(CONNECTOR_REGISTRY)) {
      expect(connector.defaultEnabled).toBe(false);
      expect(connector.approvalRequired).toBe(true);
      expect(connector.paidOrExternal).toBe(true);
    }
  });

  it("enforces conversation-first anti-overload limits", () => {
    expect(CONVERSATION_RULES.maxSuggestionsPerTurn).toBe(2);
    expect(CONVERSATION_RULES.maxConsecutiveQuestions).toBe(1);
    expect(CONVERSATION_RULES.neverTreatCasualYesAsPaidConsent).toBe(true);
  });

  it("falls unknown types back to Custom without losing a usable baseline", () => {
    const resolved = resolveDomainProfile("not-a-real-room");
    expect(resolved.profile.templateId).toBe("custom");
    expect(resolved.defaultMaterialIds.length).toBeGreaterThan(0);
    expect(resolved.profile.starters.length).toBeGreaterThan(0);
  });
});
