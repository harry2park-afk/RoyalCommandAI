import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/connectors", () => ({
  getConnector: () => ({
    isConfigured: () => false,
    complete: vi.fn(),
  }),
}));

import { synthesizeRcCommandCenterAnswer } from "./rcCommandCenterFinalSynthesis";

describe("RC Command Center final synthesis boundary", () => {
  it("does not activate for customer UUID rooms", async () => {
    const result = await synthesizeRcCommandCenterAnswer({
      roomId: "337009c3-a46d-40b1-bcc4-0282b0550000",
      originalPrompt: "test",
      language: "ko",
      responses: [],
    });
    expect(result.attempted).toBe(false);
  });

  it("fails clearly instead of inventing a synthesis when ChatGPT is unavailable", async () => {
    const result = await synthesizeRcCommandCenterAnswer({
      roomId: "89fe50fc-12bf-4fa0-8da8-aff065bae960",
      originalPrompt: "test",
      language: "ko",
      responses: [
        { provider: "anthropic", model: "test-anthropic", content: "Claude answer", latencyMs: 1 },
        { provider: "google", model: "test-google", content: "Gemini answer", latencyMs: 1 },
      ],
    });
    expect(result.attempted).toBe(true);
    expect(result.finalAnswer).toBe("");
    expect(result.error).toContain("not configured");
  });
});
