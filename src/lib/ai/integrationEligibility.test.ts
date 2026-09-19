import { describe, expect, it } from "vitest";
import { getIntegrationEligibility, type IntegrationCandidate } from "./integrationEligibility";

const success = (provider: string): IntegrationCandidate => ({
  provider,
  providerName: provider,
  content: `${provider} answer`,
  receipt: { terminal: true },
});
const failure = (provider: string): IntegrationCandidate => ({
  provider,
  providerName: provider,
  error: `${provider} failed`,
});

describe("Final Integrator eligibility", () => {
  it("integrates when all five AIs succeed", () => {
    const ids = ["openai", "anthropic", "google", "xai", "codex"];
    const results = Object.fromEntries(ids.map((id) => [id, success(id)]));
    expect(getIntegrationEligibility(ids, results).successfulResults).toHaveLength(5);
    expect(getIntegrationEligibility(ids, results).canIntegrate).toBe(true);
  });

  it("excludes failures while keeping successful answers eligible", () => {
    const result = getIntegrationEligibility(["openai", "anthropic"], {
      openai: success("openai"),
      anthropic: failure("anthropic"),
    });
    expect(result.successfulResults.map((item) => item.provider)).toEqual(["openai"]);
    expect(result.failedResults.map((item) => item.provider)).toEqual(["anthropic"]);
    expect(result.canIntegrate).toBe(true);
  });

  it("recalculates immediately when a failed AI is excluded", () => {
    const results = { openai: success("openai"), anthropic: failure("anthropic") };
    expect(getIntegrationEligibility(["openai", "anthropic"], results).failedResults).toHaveLength(1);
    expect(getIntegrationEligibility(["openai"], results).failedResults).toHaveLength(0);
  });

  it("allows integration with one successful answer", () => {
    expect(getIntegrationEligibility(["openai"], { openai: success("openai") }).canIntegrate).toBe(true);
  });

  it("explains the all-failed state through zero successful results", () => {
    const result = getIntegrationEligibility(["openai", "anthropic"], {
      openai: failure("openai"),
      anthropic: failure("anthropic"),
    });
    expect(result.canIntegrate).toBe(false);
    expect(result.failedResults).toHaveLength(2);
  });
});
