import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), db: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.db }));
import { access, session, stableId, input } from "./access";
const owner = "11111111-1111-4111-8111-111111111111", room = "22222222-2222-4222-8222-222222222222";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("VERCEL_ENV", "preview"); });
describe("RCV3 access boundary", () => {
  it("rejects anonymous access before database calls", async () => {
    mocks.user.mockResolvedValue(null); await expect(session()).rejects.toThrow("RCV3_AUTH"); expect(mocks.db).not.toHaveBeenCalled();
  });
  it("does not expose RCV3 on Production", async () => {
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("NODE_ENV", "production");
    await expect(session()).rejects.toThrow("RCV3_NOT_FOUND"); expect(mocks.user).not.toHaveBeenCalled();
  });
  it("requires owner, namespace, draft and private household", async () => {
    mocks.user.mockResolvedValue({ id: owner, mode: "supabase" });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
    mocks.db.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
    await expect(access(room)).rejects.toThrow("RCV3_NOT_FOUND");
    expect(query.eq).toHaveBeenCalledWith("room_owner_id", owner);
    expect(query.eq).toHaveBeenCalledWith("description", "rcv3-private-preview-v1");
    expect(query.eq).toHaveBeenCalledWith("status", "draft");
    query.maybeSingle.mockResolvedValue({ data: { household_id: stableId(room,"household") } });
    await expect(access(room)).rejects.toThrow("RCV3_NOT_FOUND");
  });
  it("rejects a mutation from another origin", async () => {
    await expect(input(new Request("https://preview.example/api/rcv3/state", { method: "PUT", headers: { origin: "https://other.example" }, body: "{}" }))).rejects.toThrow("RCV3_ORIGIN");
  });
});
