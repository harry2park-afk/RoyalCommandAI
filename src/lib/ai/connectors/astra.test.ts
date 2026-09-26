import { afterEach, describe, expect, it, vi } from "vitest";
import { AstraConnector } from "./astra";

const messages = [{ role: "user" as const, content: "Review this website change." }];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Astra Light connector", () => {
  it("does not make a request without the server-side OpenAI key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const connector = new AstraConnector();
    expect(connector.isConfigured()).toBe(false);
    const result = await connector.complete({ messages });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error).toContain("not configured");
  });

  it("uses Astra with light reasoning through the Responses API", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ model: "gpt-6-astra", output_text: "Review complete." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new AstraConnector().complete({ messages });

    expect(result.error).toBeUndefined();
    expect(result.content).toBe("Review complete.");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/responses");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "gpt-6-astra",
      input: messages,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    });
  });
});
