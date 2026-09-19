import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const state = vi.hoisted(() => ({ user: null as null | { id: string }, rooms: [] as Array<{ id: string; name: string; status: string; created_at: string }>, error: null as null | object, eq: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/utils", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: () => ({ select: () => ({ eq: (key: string, id: string) => { state.eq(key, id); return { order: async () => ({ data: state.rooms, error: state.error }) }; } }) }) }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("notFound"); } }));
vi.mock("../rooms/[id]/CustomerAISecretary", () => ({ default: ({ roomId }: { roomId: string }) => createElement("div", null, `secretary:${roomId}`) }));
import SecretaryPage from "./page";
const room = { id: "owned-room", name: "Command Room", status: "active", created_at: "2026-08-07" };
beforeEach(() => { state.user = { id: "owner" }; state.rooms = [room]; state.error = null; state.eq.mockClear(); });
describe("secretary entry", () => {
  it("redirects anonymous visits back through login without reading rooms", async () => {
    state.user = null;
    await expect(SecretaryPage({ searchParams: Promise.resolve({ room: room.id }) })).rejects.toThrow("redirect:/login?next=");
    expect(state.eq).not.toHaveBeenCalled();
  });
  it("queries only the current owner's rooms and links existing IDs", async () => {
    const html = renderToStaticMarkup(await SecretaryPage({ searchParams: Promise.resolve({}) }));
    expect(state.eq).toHaveBeenCalledWith("room_owner_id", "owner");
    expect(html).toContain("/secretary?room=owned-room");
  });
  it("opens the existing room without replacing its ID", async () => {
    const html = renderToStaticMarkup(await SecretaryPage({ searchParams: Promise.resolve({ room: room.id }) }));
    expect(html).toContain("secretary:owned-room");
  });
  it("rejects unknown and archived rooms", async () => {
    await expect(SecretaryPage({ searchParams: Promise.resolve({ room: "another-owner" }) })).rejects.toThrow("notFound");
    state.rooms = [{ ...room, status: "archived" }];
    await expect(SecretaryPage({ searchParams: Promise.resolve({ room: room.id }) })).rejects.toThrow("notFound");
  });
  it("shows a retry message on query failure, not another room", async () => {
    state.error = {};
    const html = renderToStaticMarkup(await SecretaryPage({ searchParams: Promise.resolve({ room: room.id }) }));
    expect(html).toContain("다시 시도");
    expect(html).not.toContain("secretary:owned-room");
  });
});
