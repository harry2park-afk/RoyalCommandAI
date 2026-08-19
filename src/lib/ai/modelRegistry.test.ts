import { describe, expect, it } from "vitest";
import {
  AI_MODEL_REGISTRY,
  getModelRegistryEntry,
  listEnabledModels,
  listModelsByProvider,
  type AIModelId,
} from "./modelRegistry";


describe("modelRegistry", () => {
  it("keeps canonical Royal Command model ids separate from provider API model ids", () => {
    const model = getModelRegistryEntry("openai:gpt-4.1-mini");
    const native = model.transports.find((transport) => transport.type === "native");

    expect(model.id).toBe("openai:gpt-4.1-mini");
    expect(model.providerId).toBe("openai");
    expect(native).toEqual({ type: "native", apiModelId: "gpt-4.1-mini" });
  });

  it("supports multiple models under one provider without changing provider ids", () => {
    const openAIModels = listModelsByProvider("openai");
    const googleModels = listModelsByProvider("google");

    expect(openAIModels.map((model) => model.id)).toEqual([
      "openai:gpt-4.1-mini",
      "openai:gpt-4o-mini",
    ]);
    expect(googleModels.map((model) => model.id)).toEqual([
      "google:gemini-3.6-flash",
      "google:gemini-3.5-flash-lite",
    ]);
  });

  it("represents OpenRouter only as a transport, never as an AI provider id", () => {
    const model = getModelRegistryEntry("anthropic:claude-haiku-4-5");
    const openRouter = model.transports.find((transport) => transport.type === "openrouter");

    expect(model.providerId).toBe("anthropic");
    expect(openRouter).toEqual({ type: "openrouter", modelQuery: "anthropic claude" });
    expect(AI_MODEL_REGISTRY.some((entry) => entry.providerId === ("openrouter" as never))).toBe(false);
  });

  it("returns only enabled models through the enabled-model query", () => {
    expect(listEnabledModels()).toEqual(AI_MODEL_REGISTRY);
  });

  it("fails locally for an unknown canonical model id", () => {
    expect(() => getModelRegistryEntry("openai:not-registered" as AIModelId)).toThrow(
      "AI model openai:not-registered is not registered.",
    );
  });
});
