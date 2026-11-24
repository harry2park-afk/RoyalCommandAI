import { beforeEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rcv3/access", () => ({ session, reply: (v: unknown) => Response.json(v), failure: (e: Error) => Response.json({ code: e.message }, { status: 400 }) }));
import { GET } from "./route";
beforeEach(() => { session.mockReset(); session.mockResolvedValue({ user: { id: "owner" } }); });
describe("carrier recommendation API", () => {
  it("returns country recommendation after authentication", async () => {
    const response = await GET(new Request("https://rc.test/api?country=AU"));
    expect(response.status).toBe(200); expect(session).toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ provider: "twilio", connected: false, purchased: false });
  });
  it("fails closed without a session", async () => {
    session.mockRejectedValue(new Error("RCV3_AUTH"));
    expect((await GET(new Request("https://rc.test/api?country=AU"))).status).toBe(400);
  });
  it("does not accept a caller-controlled purchase destination", async () => {
    expect((await GET(new Request("https://rc.test/api?country=AU&purchaseUrl=https://evil.test"))).status).toBe(400);
  });
});
