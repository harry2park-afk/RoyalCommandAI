import { describe, expect, it } from "vitest";
import { resolveModelExecutionBinding } from "./modelExecutionBinding";


describe("modelExecutionBinding", () => {
  it("binds a canonical model to the exact provider route and API model id", () => {
    expect(resolveModelExecutionBinding("openai", "openai:gpt-4.1-mini")).toEqual({
      modelId: "openai:gpt-4.1-mini",
      providerId: "openai",
      transport: "native",
      apiModelId: "gpt-4.1-mini",
    });
  });

  it("supports more than one model under the same provider", () => {
    expect(resolveModelExecutionBinding("openai", "openai:gpt-4o-mini").apiModelId).toBe("gpt-4o-mini");
    expect(resolveModelExecutionBinding("google", "google:gemini-3.5-flash-lite").apiModelId).toBe("gemini-3.5-flash-lite");
  });

  it("rejects provider/model mismatches before execution", () => {
    expect(() => resolveModelExecutionBinding("anthropic", "openai:gpt-4.1-mini")).toThrow(
      /belongs to openai, not anthropic/,
    );
  });

  it("does not treat OpenRouter as an AI provider id", () => {
    const binding = resolveModelExecutionBinding("anthropic", "anthropic:claude-haiku-4-5");
    expect(binding.providerId).toBe("anthropic");
    expect(binding.transport).toBe("native");
  });
});
