import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), cloudStore: vi.fn(), read: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/rcv3/access", () => ({
  session: mocks.session, stableId: (owner: string, type: string) => `${owner}:${type}`,
  reply: (body: unknown) => Response.json(body), failure: () => Response.json({ error: "blocked" }, { status: 401 }),
  input: (r: Request) => r.json(),
}));
vi.mock("@/lib/rcv3/cloud-state", () => ({ cloudStore: mocks.cloudStore }));
vi.mock("@/lib/rcv3/room-draft", () => ({ readDraftRegistry: mocks.read, saveRoomDraft: mocks.save }));
import { GET, PUT } from "./route";
describe("draft route account boundary", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.read.mockResolvedValue({ revision: 0, drafts: [] }); mocks.save.mockResolvedValue({ revision: 1, drafts: [] }); mocks.cloudStore.mockReturnValue({}); });
  it("requires a session before reading storage", async () => {
    mocks.session.mockRejectedValue(new Error("RCV3_AUTH"));
    expect((await GET()).status).toBe(401); expect(mocks.cloudStore).not.toHaveBeenCalled();
  });
  it("derives the namespace from the authenticated account even if an owner is submitted", async () => {
    mocks.session.mockResolvedValue({ user: { id: "owner-a" }, db: "session-db" });
    await PUT(new Request("https://example.test/api/rcv3/drafts", { method: "PUT", body: JSON.stringify({ ownerId: "owner-b" }) }));
    expect(mocks.cloudStore).toHaveBeenCalledWith("session-db", "owner-a", "owner-a:room-creation-drafts");
  });
});
