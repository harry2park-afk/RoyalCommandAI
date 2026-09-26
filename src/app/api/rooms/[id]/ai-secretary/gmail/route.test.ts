import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), client: vi.fn(), connection: vi.fn(), api: vi.fn(), audit: vi.fn(), v3: vi.fn(), state: vi.fn() }));
vi.mock("@/lib/rcv3/access", () => ({ access: mock.v3, RCV3_MARKER:"rcv3-private-preview-v1" }));
vi.mock("@/lib/rcv3/cloud-state", () => ({ readState: mock.state }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mock.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mock.client }));
vi.mock("@/lib/google-workspace", () => ({ getGoogleConnection: mock.connection, googleApi: mock.api, googleWorkspaceConfigured: () => true }));
vi.mock("@/lib/tool-gateway", () => ({ evaluateToolPermission: () => ({ decision: "allow" }), auditToolGateway: mock.audit }));
import { GET, POST } from "./route";
const context = { params: Promise.resolve({ id: "room" }) };
beforeEach(() => {
  vi.clearAllMocks();
  mock.v3.mockRejectedValue(new Error("RCV3_NOT_FOUND"));
  mock.state.mockResolvedValue({gmailEnabled:true});
  mock.user.mockResolvedValue({ id: "owner", email: "harry2park@gmail.com" });
  mock.client.mockResolvedValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "room", room_owner_id: "owner" } }) }) }) }) });
  mock.connection.mockResolvedValue({ google_email: "harry2park@gmail.com" });
  mock.api.mockResolvedValue({ emailAddress: "harry2park@gmail.com" });
});
describe("Katie Gmail route", () => {
  it.each(["harry2park@gmail.com","customer@example.test"])("a fresh V3 copy cannot auto-read even the current account Gmail (%s)",async email=>{
    mock.user.mockResolvedValue({id:"owner",email});
    mock.client.mockResolvedValue({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:"room",room_owner_id:"owner",description:"rcv3-private-preview-v1"}})})})})});
    mock.v3.mockResolvedValue({user:{id:"owner"},store:{}});
    mock.state.mockResolvedValue({gmailEnabled:false});
    const result=await GET(new Request("https://test.invalid"),context);
    expect(await result.json()).toMatchObject({connected:false,code:"GMAIL_ROOM_NOT_ENABLED"});
    expect((await POST(new Request("https://test.invalid",{method:"POST",body:JSON.stringify({action:"search"})}),context)).status).toBe(403);
    expect(mock.connection).not.toHaveBeenCalled();expect(mock.api).not.toHaveBeenCalled();
  });
  it("uses the new V3 customer's own OAuth identity, never Harry's", async () => {
    mock.user.mockResolvedValue({id:"owner",email:"customer@example.test"});
    mock.v3.mockResolvedValue({user:{id:"owner"}});
    mock.connection.mockResolvedValue(null);
    const result=await GET(new Request("https://test.invalid"),context);
    expect(await result.json()).toMatchObject({connected:false});
    expect(mock.v3).toHaveBeenCalledWith("room");
    expect(mock.connection).toHaveBeenCalledExactlyOnceWith("owner");
    expect(mock.api).not.toHaveBeenCalled();
  });
  it("rejects a new customer's unowned or non-V3 room before Google access", async () => {
    mock.user.mockResolvedValue({id:"other",email:"customer@example.test"});
    expect((await GET(new Request("https://test.invalid"),context)).status).toBe(403);
    expect(mock.connection).not.toHaveBeenCalled();
    expect(mock.api).not.toHaveBeenCalled();
  });
  it("never bypasses approval for a new V3 customer's email send",async()=>{
    mock.user.mockResolvedValue({id:"owner",email:"customer@example.test"});
    mock.v3.mockResolvedValue({user:{id:"owner"}});
    expect((await POST(new Request("https://test.invalid",{method:"POST",body:JSON.stringify({action:"send"})}),context)).status).toBe(409);
    expect(mock.api).not.toHaveBeenCalled();
  });
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
