import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), client: vi.fn(), connection: vi.fn(), api: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mock.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mock.client }));
vi.mock("@/lib/google-workspace", () => ({ getGoogleConnection: mock.connection, googleApi: mock.api, googleWorkspaceConfigured: () => true }));
vi.mock("@/lib/tool-gateway", () => ({ evaluateToolPermission: () => ({ decision: "allow" }), auditToolGateway: mock.audit }));
import { GET, POST } from "./route";
const context = { params: Promise.resolve({ id: "room" }) };
beforeEach(() => {
  vi.clearAllMocks();
  mock.user.mockResolvedValue({ id: "owner", email: "harry2park@gmail.com" });
  mock.client.mockResolvedValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "room", room_owner_id: "owner" } }) }) }) }) });
  mock.connection.mockResolvedValue({ google_email: "harry2park@gmail.com" });
  mock.api.mockResolvedValue({ emailAddress: "harry2park@gmail.com" });
});
describe("Katie Gmail route", () => {
  it("never reports a stored but revoked credential as connected", async () => {
    mock.api.mockRejectedValue(new Error("Token has been expired or revoked."));
    const result = await GET(new Request("https://test.invalid"), context);
    expect(await result.json()).toMatchObject({ connected: false, code: "GMAIL_RECONNECT_REQUIRED" });
  });
  it("validates Google reads before reporting connected", async () => {
    const result = await GET(new Request("https://test.invalid"), context);
    expect(await result.json()).toMatchObject({ connected: true });
    expect(mock.api).toHaveBeenCalledWith("owner", "https://gmail.googleapis.com/gmail/v1/users/me/profile");
  });
  it("forwards continuation tokens and page sizes above twenty", async () => {
    await POST(new Request("https://test.invalid", { method: "POST", body: JSON.stringify({ action: "search", maxResults: 100, pageToken: "next&token" }) }), context);
    const url = new URL(mock.api.mock.calls[0][1]);
    expect(url.searchParams.get("maxResults")).toBe("100");
    expect(url.searchParams.get("pageToken")).toBe("next&token");
  });
  it("keeps sending behind explicit approval", async () => {
    const result = await POST(new Request("https://test.invalid", { method: "POST", body: JSON.stringify({ action: "send" }) }), context);
    expect(result.status).toBe(409); expect(mock.api).not.toHaveBeenCalled();
  });
  it("denies unauthenticated access without accessing Google", async () => {
    mock.user.mockResolvedValue(null);
    const result = await GET(new Request("https://test.invalid"), context);
    expect(result.status).toBe(403); expect(mock.api).not.toHaveBeenCalled();
  });
});
