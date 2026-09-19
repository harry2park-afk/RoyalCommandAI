import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({session:vi.fn(),insert:vi.fn()}));
vi.mock("@/lib/rcv3/access",async original=>({...await original<typeof import("@/lib/rcv3/access")>(),session:mock.session}));
import { POST } from "./route";
beforeEach(()=>{vi.clearAllMocks();mock.session.mockResolvedValue({user:{id:"owner"},db:{from:()=>({insert:mock.insert})}});});
describe("all new rooms require checkout",()=>{
 it("blocks the legacy direct creation path without writing a room",async()=>{
  const response=await POST();expect(response.status).toBe(402);
  expect(await response.json()).toMatchObject({code:"RCV3_CHECKOUT_REQUIRED",url:"/rcv3/create"});
  expect(mock.insert).not.toHaveBeenCalled();
 });
 it("still requires authentication",async()=>{mock.session.mockRejectedValue(new Error("RCV3_AUTH"));expect((await POST()).status).toBe(401);});
});
