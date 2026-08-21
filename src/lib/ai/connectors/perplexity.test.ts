import { afterEach, describe, expect, it, vi } from "vitest";
import { PerplexityConnector } from "./perplexity";

const messages = [{ role: "user" as const, content: "Find current authority." }];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Perplexity direct connector", () => {
  it("stays dormant and makes no request without PERPLEXITY_API_KEY", async () => {
    vi.stubEnv("PERPLEXITY_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const connector = new PerplexityConnector();
    expect(connector.isConfigured()).toBe(false);

    const result = await connector.complete({ messages });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain("not activated");
    expect(result.model).toBe("sonar-pro");
  });

  it("uses the official Sonar chat endpoint after a key is supplied", async () => {
    vi.stubEnv("PERPLEXITY_API_KEY", "test-perplexity-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: "sonar-pro",
        choices: [{ message: { content: "research result" }, finish_reason: "stop" }],
        citations: ["https://example.com/source"],
        search_results: [{ title: "Source", url: "https://example.com/source" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new PerplexityConnector().complete({ messages });

    expect(result.error).toBeUndefined();
    expect(result.content).toBe("research result");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.perplexity.ai/v1/chat/completions");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "sonar-pro", messages });
  });
});
