import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({session:vi.fn(),insert:vi.fn()}));
vi.mock("@/lib/rcv3/access",async original=>({...await original<typeof import("@/lib/rcv3/access")>(),session:mock.session}));
import { GET, POST } from "./route";
beforeEach(()=>{vi.clearAllMocks();mock.session.mockResolvedValue({user:{id:"owner"},db:{from:()=>({insert:mock.insert})}});});
describe("all new rooms require checkout",()=>{
 it("blocks the legacy direct creation path without writing a room",async()=>{
  const response=await POST();expect(response.status).toBe(402);
  expect(await response.json()).toMatchObject({code:"RCV3_CHECKOUT_REQUIRED",url:"/rcv3/create"});
  expect(mock.insert).not.toHaveBeenCalled();
 });
 it("still requires authentication",async()=>{mock.session.mockRejectedValue(new Error("RCV3_AUTH"));expect((await POST()).status).toBe(401);});
});

describe("owned room navigation directory",()=>{
 function setup(count=101){
  const query={select:vi.fn(),eq:vi.fn(),order:vi.fn(),ilike:vi.fn(),range:vi.fn()};
  for(const key of ["select","eq","order","ilike"] as const)query[key].mockReturnValue(query);
  query.range.mockResolvedValue({data:Array.from({length:count},(_,n)=>({id:String(n),name:"Room"})),error:null});
  const from=vi.fn().mockReturnValue(query);mock.session.mockResolvedValue({user:{id:"owner"},db:{from}});return {query,from};
 }
 it("scopes every page to the authenticated owner and excludes archived rooms",async()=>{
  const {query}=setup();const response=await GET(new Request("https://preview.test/api/rcv3/rooms?offset=100&q=hello%25"));
  const body=await response.json();expect(body.rooms).toHaveLength(100);expect(body.hasMore).toBe(true);
  expect(query.eq).toHaveBeenCalledWith("room_owner_id","owner");expect(query.eq).toHaveBeenCalledWith("status","draft");
  expect(query.eq).toHaveBeenCalledWith("description","rcv3-private-preview-v1");
  expect(query.range).toHaveBeenCalledWith(100,200);expect(query.ilike).toHaveBeenCalledWith("name","%hello\\%%");
 });
 it("returns empty state and rejects malformed page indexes before querying",async()=>{
  const {from}=setup(0);expect(await (await GET(new Request("https://preview.test/api/rcv3/rooms"))).json()).toEqual({rooms:[],hasMore:false});
  from.mockClear();expect((await GET(new Request("https://preview.test/api/rcv3/rooms?offset=-1"))).status).toBe(400);expect(from).not.toHaveBeenCalled();
 });
 it("does not query rooms before successful authentication",async()=>{const {from}=setup();mock.session.mockRejectedValue(new Error("RCV3_AUTH"));expect((await GET(new Request("https://preview.test/api/rcv3/rooms"))).status).toBe(401);expect(from).not.toHaveBeenCalled();});
});
