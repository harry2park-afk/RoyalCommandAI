import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/rcv3/access", () => ({
  session: vi.fn(),
  input: vi.fn(async (r: Request) => r.json()),
  reply: (body: unknown) => Response.json(body),
  failure: () => Response.json({ code: "RCV3_ERROR" }, { status: 400 }),
}));
vi.mock("@/lib/rcv3/customer-ai", () => ({ PERSONAL_AI_PROVIDERS: ["openai", "anthropic", "google", "xai"], customerAIStatus: vi.fn(), saveCustomerAIKey: vi.fn(), revokeCustomerAIKey: vi.fn() }));
import { session } from "@/lib/rcv3/access";
import { saveCustomerAIKey, revokeCustomerAIKey } from "@/lib/rcv3/customer-ai";
import { PUT, DELETE } from "./route";
const owner = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { vi.clearAllMocks(); vi.mocked(session).mockResolvedValue({ user: { id: owner } } as never); });
function request(body: object, origin = "https://rc.example") { return new Request("https://rc.example/api/rcv3/customer-ai", { method: "PUT", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }); }
describe("customer AI API", () => {
  it("rejects cross-origin credential writes before accessing accounts", async () => {
    expect((await PUT(request({ provider: "openai", apiKey: "secret" }, "https://evil.example"))).status).toBe(400);
    expect(session).not.toHaveBeenCalled(); expect(saveCustomerAIKey).not.toHaveBeenCalled();
  });
  it("never accepts caller-selected ownership", async () => {
    expect((await PUT(request({ provider: "openai", apiKey: "secret", ownerId: owner }))).status).toBe(400);
    expect(saveCustomerAIKey).not.toHaveBeenCalled();
  });
  it("saves and revokes exclusively as authenticated user", async () => {
    vi.mocked(saveCustomerAIKey).mockResolvedValue({ provider: "openai", verified: true, verifiedAt: "2099-01-01" });
    expect((await PUT(request({ provider: "openai", apiKey: "private" }))).status).toBe(200);
    expect(saveCustomerAIKey).toHaveBeenCalledWith(owner, "openai", "private");
    await DELETE(request({ provider: "openai" }));
    expect(revokeCustomerAIKey).toHaveBeenCalledWith(owner, "openai");
  });
});
