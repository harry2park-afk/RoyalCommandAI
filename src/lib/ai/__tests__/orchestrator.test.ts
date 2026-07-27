import { describe, expect, it } from "vitest";
import { synthesizeBestAnswer } from "@/lib/ai/synthesize";
import { guardianCheck } from "@/lib/ai/guardian";
import type { AIProviderResponse } from "@/lib/ai/types";

describe("guardian", () => {
  it("blocks licensed legal advice requests", () => {
    const result = guardianCheck("Please give me legal advice about my lawsuit");
    expect(result.blocked).toBe(true);
  });

  it("allows general assistance", () => {
    const result = guardianCheck("Help me organize documents in my Room");
    expect(result.blocked).toBe(false);
  });
});

describe("synthesizeBestAnswer", () => {
  it("picks the strongest successful response", () => {
    const responses: AIProviderResponse[] = [
      {
        provider: "openai",
        model: "demo",
        content: "Short",
        latencyMs: 100,
      },
      {
        provider: "anthropic",
        model: "demo",
        content:
          "A careful and nuanced answer with structure:\n1. First\n2. Second\nbecause clarity matters.",
        latencyMs: 200,
      },
      {
        provider: "google",
        model: "demo",
        content: "",
        latencyMs: 50,
        error: "fail",
      },
      {
        provider: "xai",
        model: "demo",
        content: "Also decent with points\n- a\n- b",
        latencyMs: 180,
      },
    ];

    const result = synthesizeBestAnswer("organize my room", responses);
    expect(result.comparison.winners[0]).toBe("anthropic");
    expect(result.finalAnswer).toContain("Claude");
  });
});
