import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), read: vi.fn(), write: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mock.auth }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mock.client }));
vi.mock("@/lib/rooms/room6-storage", () => ({ readRoom6Design: mock.read, writeRoom6Design: mock.write }));
import { GET, PUT } from "./route";
import { defaultRoom6Design } from "@/lib/rooms/room6-design";
const room = "22222222-2222-4222-8222-222222222222";
function request(design: unknown = defaultRoom6Design()) { return new Request("https://preview.test/api/room6/design", { method: "PUT", body: JSON.stringify({ roomId: room, revision: 0, design }) }); }
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("VERCEL_ENV", "preview"); mock.auth.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" }); });
describe("Room6 preview and owner boundary", () => {
  it("does not expose the API in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect((await GET(new Request(`https://app.test/api/room6/design?room=${room}`))).status).toBe(404);
    expect(mock.auth).not.toHaveBeenCalled();
  });
  it("requires authenticated ownership before storage access", async () => {
    mock.auth.mockResolvedValue(null);
    expect((await PUT(request())).status).toBe(401);
    expect(mock.write).not.toHaveBeenCalled();
  });
  it("rejects another customer's room before any write", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    mock.client.mockResolvedValue({ from: () => query });
    expect((await PUT(request())).status).toBe(404);
    expect(query.eq).toHaveBeenCalledWith("room_owner_id", "11111111-1111-4111-8111-111111111111");
    expect(mock.write).not.toHaveBeenCalled();
  });
  it("rejects imported executable fields before persistence", async () => {
    expect((await PUT(request({ ...defaultRoom6Design(), script: "run()" }))).status).toBe(400);
    expect(mock.write).not.toHaveBeenCalled();
  });
  it("returns a conflict without overwriting a newer design", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: room }, error: null }) };
    mock.client.mockResolvedValue({ from: () => query });
    mock.write.mockRejectedValue(new Error("ROOM6_CONFLICT"));
    expect((await PUT(request())).status).toBe(409);
  });
});
