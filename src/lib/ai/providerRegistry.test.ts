import { describe, expect, it } from "vitest";
import { AI_PROVIDER_IDS, PROVIDER_LABELS } from "./types";
import {
  PROVIDER_REGISTRY,
  getProviderRegistryEntry,
  listRegisteredProviderIds,
} from "./providerRegistry";

describe("providerRegistry", () => {
  it("represents every configured provider id exactly once", () => {
    const ids = listRegisteredProviderIds();

    expect(ids).toEqual([...AI_PROVIDER_IDS]);
    expect(new Set(ids).size).toBe(AI_PROVIDER_IDS.length);
    expect(PROVIDER_REGISTRY).toHaveLength(AI_PROVIDER_IDS.length);
  });

  it("keeps provider labels and catalog routing available through one registry entry", () => {
    for (const id of AI_PROVIDER_IDS) {
      const entry = getProviderRegistryEntry(id);
      expect(entry.id).toBe(id);
      expect(entry.displayName).toBe(PROVIDER_LABELS[id]);
      expect(["native", "openrouter"]).toContain(entry.route);
      expect(entry.rank).toBeGreaterThan(0);
    }
  });

  it("keeps native providers native and catalog providers queryable", () => {
    expect(getProviderRegistryEntry("openai").route).toBe("native");
    expect(getProviderRegistryEntry("anthropic").route).toBe("native");
    expect(getProviderRegistryEntry("google").route).toBe("native");
    expect(getProviderRegistryEntry("xai").route).toBe("native");
    expect(getProviderRegistryEntry("deepseek").modelQuery).toBeTruthy();
  });
});
