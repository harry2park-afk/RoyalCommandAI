import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIProviderResponse } from "./types";

const completeMock = vi.fn();

vi.mock("./connectors", () => ({
  getConnector: vi.fn(() => ({ complete: completeMock })),
}));

vi.mock("./modelExecutionBinding", () => ({
  resolveModelExecutionBinding: vi.fn((providerId: string, modelId: string) => ({
    providerId,
    modelId,
    transport: "native",
    apiModelId: modelId.split(":").slice(1).join(":"),
  })),
  executeModelBinding: vi.fn(async (_binding: unknown, request: unknown) => completeMock(request)),
}));

import {
  buildPeerReviewPrompt,
  buildSynthesisPrompt,
  isCouncilIntent,
  runCouncil,
} from "./council";

const responses: AIProviderResponse[] = [
  { provider: "openai", model: "gpt-test", content: "OpenAI actual answer: security first.", latencyMs: 10 },
  { provider: "anthropic", model: "claude-test", content: "Claude actual answer: localisation first.", latencyMs: 11 },
  { provider: "google", model: "gemini-test", content: "Gemini actual answer: infrastructure first.", latencyMs: 12 },
  { provider: "xai", model: "grok-test", content: "Grok actual answer: governance first.", latencyMs: 13 },
];

describe("Phase 5 Council", () => {
  beforeEach(() => {
    completeMock.mockReset();
  });

  it("detects explicit integrated-answer intent only with multiple providers", () => {
    expect(isCouncilIntent("4-AI 통합 답변 테스트: 하나의 최종 답을 만들어줘", 4)).toBe(true);
    expect(isCouncilIntent("4-AI 통합 답변 테스트: 하나의 최종 답을 만들어줘", 1)).toBe(false);
    expect(isCouncilIntent("각자 독립적으로 답해줘", 4)).toBe(false);
  });

  it("peer review contains actual sibling outputs and excludes the reviewer's own output", () => {
    const prompt = buildPeerReviewPrompt("openai", "original question", responses, "ko");
    expect(prompt).toContain("Claude actual answer: localisation first.");
    expect(prompt).toContain("Gemini actual answer: infrastructure first.");
    expect(prompt).toContain("Grok actual answer: governance first.");
    expect(prompt).not.toContain("OpenAI actual answer: security first.");
  });

  it("final synthesis prompt contains actual round-one outputs and actual review memos", () => {
    const prompt = buildSynthesisPrompt(
      "original question",
      responses,
      [{ provider: "openai", content: "Actual review memo", model: "gpt-test" }],
      "ko",
    );
    expect(prompt).toContain("OpenAI actual answer: security first.");
    expect(prompt).toContain("Claude actual answer: localisation first.");
    expect(prompt).toContain("Actual review memo");
    expect(prompt).toContain("Produce ONE final answer");
  });

  it("runs peer review then returns one synthesizer answer", async () => {
    let call = 0;
    completeMock.mockImplementation(async () => {
      call += 1;
      if (call <= 4) {
        return {
          provider: responses[call - 1]!.provider,
          model: `review-model-${call}`,
          content: `review-${call}`,
          latencyMs: 5,
        };
      }
      return {
        provider: "openai",
        model: "synth-model",
        content: "ROYAL COMMAND 4-AI FINAL ANSWER\nOne integrated answer only.",
        latencyMs: 5,
      };
    });

    const result = await runCouncil({ prompt: "integrate these", responses, language: "ko" });
    expect(result.reviews).toHaveLength(4);
    expect(result.finalAnswer).toBe("ROYAL COMMAND 4-AI FINAL ANSWER\nOne integrated answer only.");
    expect(result.synthesizerProvider).toBe("openai");
    expect(completeMock).toHaveBeenCalledTimes(5);
  });
});
