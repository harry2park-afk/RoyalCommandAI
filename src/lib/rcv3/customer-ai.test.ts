import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/ai/connectors", () => ({ getConnector: vi.fn(), isProviderConfigured: vi.fn(() => false) }));
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnector } from "@/lib/ai/connectors";
import { sealCustomerAIKey, openCustomerAIKey, personalAIConnector, resolveCustomerAI, customerAIStatus, saveCustomerAIKey } from "./customer-ai";
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const secret = "test-personal-secret-1234567890";
beforeEach(() => { vi.stubEnv("RCV3_CREDENTIAL_ENCRYPTION_KEY", "a".repeat(64)); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("customer credential isolation", () => {
  it("authenticates owner and provider and rejects tampering", () => {
    const value = sealCustomerAIKey(owner, "openai", secret);
    expect(value).not.toContain(secret);
    expect(openCustomerAIKey(owner, "openai", value)).toBe(secret);
    expect(() => openCustomerAIKey(other, "openai", value)).toThrow("RCV3_PERSONAL_AI_RECONNECT");
    expect(() => openCustomerAIKey(owner, "google", value)).toThrow("RCV3_PERSONAL_AI_RECONNECT");
    const bytes = Buffer.from(value, "base64url"); bytes[30] ^= 1;
    expect(() => openCustomerAIKey(owner, "openai", bytes.toString("base64url"))).toThrow("RCV3_PERSONAL_AI_RECONNECT");
  });
  it("requires a dedicated strong key, never substitutes platform keys", () => {
    vi.stubEnv("RCV3_CREDENTIAL_ENCRYPTION_KEY", ""); vi.stubEnv("OPENAI_API_KEY", "b".repeat(64));
    expect(() => sealCustomerAIKey(owner, "openai", secret)).toThrow("RCV3_PERSONAL_AI_UNAVAILABLE");
  });
  it("does not leak provider errors or fall back when personal key fails", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: secret } }), { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    const result = await personalAIConnector("openai", secret).complete({ messages: [{ role: "user", content: "Hi" }] });
    expect(result.error).toBe("RCV3_PERSONAL_AI_RESPONSE"); expect(JSON.stringify(result)).not.toContain(secret);
    expect(fetcher).toHaveBeenCalledTimes(1); expect(getConnector).not.toHaveBeenCalled();
  });
  it("keeps concurrent users' credentials in separate request headers", async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }] })));
    vi.stubGlobal("fetch", fetcher);
    await Promise.all([secret, "other-personal-secret-123456"].map(key => personalAIConnector("openai", key).complete({ messages: [{ role: "user", content: "Hi" }] })));
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${secret}`);
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe("Bearer other-personal-secret-123456");
  });
  it("only queries credentials belonging to authenticated owner and rejects missing credentials", async () => {
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
    vi.mocked(createAdminClient).mockReturnValue({ from: () => query } as never);
    await expect(resolveCustomerAI(owner, "openai", "personal")).rejects.toThrow("RCV3_PERSONAL_AI_RECONNECT");
    expect(query.eq).toHaveBeenCalledWith("owner_id", owner); expect(getConnector).not.toHaveBeenCalled();
  });
  it("status never selects or exposes ciphertext", async () => {
    const query = { select: vi.fn(), eq: vi.fn().mockResolvedValue({ data: [{ provider: "openai", verified_at: "2000-01-01" }], error: null }) };
    query.select.mockReturnValue(query); vi.mocked(createAdminClient).mockReturnValue({ from: () => query } as never);
    const status = await customerAIStatus(owner);
    expect(query.select).toHaveBeenCalledWith("provider,verified_at");
    expect(status.providers.find(p => p.id === "openai")?.personal).toBe(true);
    expect(JSON.stringify(status)).not.toContain("ciphertext");
  });
  it("limits failed verification attempts before calling providers", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: "23505" } });
    vi.mocked(createAdminClient).mockReturnValue({ from: () => ({ insert }) } as never);
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(saveCustomerAIKey(owner, "openai", secret)).rejects.toThrow("RCV3_LIMIT");
    expect(insert).toHaveBeenCalledTimes(10); expect(fetcher).not.toHaveBeenCalled();
  });
});
