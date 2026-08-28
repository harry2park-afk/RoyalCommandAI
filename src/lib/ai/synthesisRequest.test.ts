import { describe, expect, it } from "vitest";
import { AI_PROVIDER_IDS } from "./types";
import { buildSynthesisPrompt, validateSynthesisRequest } from "./synthesisRequest";

const base = {
  roomId: "room-1",
  originalPrompt: "Compare these answers and give me the strongest supported conclusion.",
  language: "ko",
  synthesizer: "openai",
  responses: [
    { provider: "openai", content: "Answer A" },
    { provider: "anthropic", content: "Answer B" },
  ],
};

describe("validateSynthesisRequest", () => {
  it("accepts two or more unique complete provider answers", () => {
    const result = validateSynthesisRequest(base);
    expect(result.responses).toHaveLength(2);
    expect(result.synthesizer).toBe("openai");
  });

  it("rejects synthesis with fewer than two complete answers", () => {
    expect(() => validateSynthesisRequest({ ...base, responses: [base.responses[0]] })).toThrow(/At least two/);
  });

  it("rejects duplicate source providers", () => {
    expect(() => validateSynthesisRequest({
      ...base,
      responses: [base.responses[0], { provider: "openai", content: "Different answer" }],
    })).toThrow(/Duplicate source AI/);
  });

  it("rejects an unknown synthesis provider", () => {
    expect(() => validateSynthesisRequest({ ...base, synthesizer: "unknown-ai" })).toThrow(/Unknown synthesis AI/);
  });

  it("ignores failed source answers and still requires two successful ones", () => {
    expect(() => validateSynthesisRequest({
      ...base,
      responses: [base.responses[0], { provider: "anthropic", content: "", error: "timeout" }],
    })).toThrow(/At least two/);
  });

  it("caps a synthesis request at the registered provider catalog size", () => {
    expect(() => validateSynthesisRequest({
      ...base,
      responses: Array.from({ length: AI_PROVIDER_IDS.length + 1 }, (_, index) => ({
        provider: "openai",
        content: `Answer ${index}`,
      })),
    })).toThrow(/Too many source responses/);
  });
});

describe("buildSynthesisPrompt", () => {
  it("requires balanced comparison instead of winner-only scoring", () => {
    const prompt = buildSynthesisPrompt(validateSynthesisRequest(base));
    expect(prompt).toContain("Do not simply choose the longest answer or declare one model the winner");
    expect(prompt).toContain("difficult or impossible to evaluate");
    expect(prompt).toContain("Identify agreements and genuine conflicts");
    expect(prompt).toContain("Produce one improved final answer");
    expect(prompt).toContain("Answer A");
    expect(prompt).toContain("Answer B");
  });
});
