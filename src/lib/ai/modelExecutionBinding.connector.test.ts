import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIConnector } from "./connectors/openai";

const messages = [{ role: "user" as const, content: "test" }];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("explicit connector model binding", () => {
  it("sends the exact selected OpenAI API model id", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: "gpt-4o-mini",
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new OpenAIConnector().complete({ messages, model: "gpt-4o-mini" });

    expect(result.error).toBeUndefined();
    expect(result.model).toBe("gpt-4o-mini");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "gpt-4o-mini" });
  });

  it("does not fall back to another model when an explicit model fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "upstream failed" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new OpenAIConnector().complete({ messages, model: "gpt-4o-mini" });

    expect(result.error).toContain("upstream failed");
    expect(result.model).toBe("gpt-4o-mini");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
