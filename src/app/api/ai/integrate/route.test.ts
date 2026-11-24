import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { signIndependentReceipt, type IndependentReceiptPayload } from "@/lib/ai/independentReceipt";

const calls = vi.hoisted(() => ({
  available: ["openai", "google"],
  googleConfigured: true,
  complete: vi.fn(),
  getConnector: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => ({ id: "test-owner" }) }));
vi.mock("@/config/countryResolver", () => ({ isDomainFeatureReady: () => true }));
vi.mock("@/lib/runtime/serverDomainContext", () => ({ getServerDomainRuntimeContext: async () => ({ locale: "ko" }) }));
vi.mock("@/lib/ai/connectors", () => ({ getAvailableProviderIds: () => calls.available, getConnector: calls.getConnector, isProviderConfigured: () => calls.googleConfigured }));

function source(provider: "google" | "openai") {
  const receipt: IndependentReceiptPayload = { provider, requestId: provider + "-1", terminal: true, completedAt: "2026-11-20T00:00:00Z" };
  return { provider, content: provider + " response", receipt: { ...receipt, signature: signIndependentReceipt("test-owner", receipt) } };
}

function submit(options: Record<string, unknown>) {
  return POST(new Request("https://example.test/api/ai/integrate", { method: "POST", body: JSON.stringify({
    roomId: "rca", integrationId: "test-integration", prompt: "Summarize", frozenResults: [source("google"), source("openai")], ...options,
  }) }));
}

describe("read-only final synthesis", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    calls.googleConfigured = true;
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("RCA_RECEIPT_SECRET", "local-test-secret");
    calls.available = ["openai", "google"];
    calls.getConnector.mockReset().mockReturnValue({ complete: calls.complete });
    calls.complete.mockReset().mockResolvedValue({ model: "test", content: "Combined answer" });
  });
  it.each([["google", "google"], [undefined, "openai"]])("uses the requested engine or the legacy default", async (requested, expected) => {
    const res = await submit({ integrator: requested, history: [{ content: "private history marker" }] });
    expect(res.status).toBe(200);
    expect(calls.getConnector.mock.calls).toEqual([[expected]]);
    expect(await res.json()).toMatchObject({ provider: expected, sourceProviders: ["google", "openai"] });
    const prompt = calls.complete.mock.calls[0][0].messages[1].content;
    expect(prompt).toContain("google response");
    expect(prompt).toContain("openai response");
    expect(prompt).not.toContain("private history marker");
  });
  it("does not substitute another engine for disconnected Gemini", async () => {
    calls.available = ["openai"];
    expect((await submit({ integrator: "google" })).status).toBe(503);
    expect(calls.getConnector).not.toHaveBeenCalled();
  });
  it("requires RCA and a real Gemini connector", async () => {
    expect((await submit({ integrator: "google", roomId: "other" })).status).toBe(400);
    calls.googleConfigured = false;
    expect((await submit({ integrator: "google" })).status).toBe(503);
    expect(calls.getConnector).not.toHaveBeenCalled();
  });
  it("rejects unknown engines and unsigned Gemini inputs", async () => {
    expect((await submit({ integrator: "unknown" })).status).toBe(400);
    const item = source("google");
    item.receipt.signature = null;
    expect((await submit({ integrator: "google", frozenResults: [item] })).status).toBe(400);
    expect(calls.getConnector).not.toHaveBeenCalled();
  });
  it("reports an empty model response as a failure", async () => {
    calls.complete.mockResolvedValueOnce({ content: " " });
    expect((await submit({ integrator: "google" })).status).toBe(502);
  });
});
