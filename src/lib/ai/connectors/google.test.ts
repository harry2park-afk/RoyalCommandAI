import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleConnector } from "./google";

const messages = [{ role: "user" as const, content: "test" }];

function successfulGeminiFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: "ok" }] }, finishReason: "STOP" }],
    }),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GoogleConnector output budget", () => {
  it("keeps the normal default output budget at 2048 tokens", async () => {
    vi.stubEnv("GOOGLE_AI_API_KEY", "test-google-key");
    const fetchMock = successfulGeminiFetch();
    vi.stubGlobal("fetch", fetchMock);

    const result = await new GoogleConnector().complete({ messages });

    expect(result.error).toBeUndefined();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body)).generationConfig.maxOutputTokens).toBe(2048);
  });

  it("honours a long developer request up to 16384 tokens", async () => {
    vi.stubEnv("GOOGLE_AI_API_KEY", "test-google-key");
    const fetchMock = successfulGeminiFetch();
    vi.stubGlobal("fetch", fetchMock);

    const result = await new GoogleConnector().complete({ messages, maxTokens: 16000 });

    expect(result.error).toBeUndefined();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body)).generationConfig.maxOutputTokens).toBe(16000);
  });

  it("caps unusually large requests at the safety ceiling", async () => {
    vi.stubEnv("GOOGLE_AI_API_KEY", "test-google-key");
    const fetchMock = successfulGeminiFetch();
    vi.stubGlobal("fetch", fetchMock);

    await new GoogleConnector().complete({ messages, maxTokens: 50000 });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body)).generationConfig.maxOutputTokens).toBe(16384);
  });
});
