import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { defaultRoom6Design } from "./room6-design";
import { readRoom6Design, room6Prefix, writeRoom6Design } from "./room6-storage";

const owner = "11111111-1111-4111-8111-111111111111";
const room = "22222222-2222-4222-8222-222222222222";
function fakeStore() {
  const files = new Map<string, string>();
  const bucket = {
    list: vi.fn(async (prefix: string) => ({ data: [...files.keys()].filter(p => p.startsWith(prefix + "/")).sort().reverse().slice(0, 1).map(p => ({ name: p.split("/").at(-1)! })), error: null })),
    download: vi.fn(async (path: string) => ({ data: new Blob([files.get(path)!]), error: null })),
    upload: vi.fn(async (path: string, content: string, options: { upsert: boolean; contentType: string }) => {
      expect(options).toMatchObject({ upsert: false, contentType: "text/plain" });
      if (files.has(path)) return { error: { message: "The resource already exists", statusCode: "400" } };
      files.set(path, content); return { error: null };
    }),
  };
  const db = { storage: { from: () => bucket } } as unknown as Parameters<typeof readRoom6Design>[0];
  return { files, bucket, db };
}
describe("Room6 cloud revisions", () => {
  it("saves and reopens independently from legacy designs and other rooms", async () => {
    const { db, files } = fakeStore();
    await writeRoom6Design(db, owner, room, 0, defaultRoom6Design());
    expect((await readRoom6Design(db, owner, room)).revision).toBe(1);
    expect((await readRoom6Design(db, owner, owner)).revision).toBe(0);
    expect([...files.keys()][0]).toContain("/rc-room6-config-v1/");
  });
  it("prevents stale and simultaneous overwrites while preserving previous revisions", async () => {
    const { db, files } = fakeStore();
    const results = await Promise.allSettled([writeRoom6Design(db, owner, room, 0, defaultRoom6Design()), writeRoom6Design(db, owner, room, 0, defaultRoom6Design())]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    await expect(writeRoom6Design(db, owner, room, 0, defaultRoom6Design())).rejects.toThrow("ROOM6_CONFLICT");
    await writeRoom6Design(db, owner, room, 1, { ...defaultRoom6Design(), background: "warm" });
    expect(files.size).toBe(2);
  });
  it("fails visibly on corruption, never silently resets latest design", async () => {
    const { db, files } = fakeStore();
    files.set(`${room6Prefix(owner, room)}/0000000001.txt`, "invalid");
    await expect(readRoom6Design(db, owner, room)).rejects.toThrow();
    expect(files.size).toBe(1);
  });
});
