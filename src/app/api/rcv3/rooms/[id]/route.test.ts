import {beforeEach,expect,it,vi} from "vitest";

const mock=vi.hoisted(()=>({session:vi.fn()}));
vi.mock("@/lib/rcv3/access",async original=>({...await original<typeof import("@/lib/rcv3/access")>(),session:mock.session}));
import {PATCH} from "./route";

beforeEach(()=>vi.clearAllMocks());

it("restores only the owner's archived RC V3 room",async()=>{
 const query={update:vi.fn(),eq:vi.fn(),select:vi.fn(),maybeSingle:vi.fn()};
 for(const key of ["update","eq","select"] as const)query[key].mockReturnValue(query);
 query.maybeSingle.mockResolvedValue({data:{id:"22222222-2222-4222-8222-222222222222"},error:null});
 mock.session.mockResolvedValue({user:{id:"owner"},db:{from:vi.fn().mockReturnValue(query)}});
 const response=await PATCH(new Request("https://preview.test/api/rcv3/rooms/22222222-2222-4222-8222-222222222222"),{params:Promise.resolve({id:"22222222-2222-4222-8222-222222222222"})});
 expect(response.status).toBe(200);
 expect(query.update).toHaveBeenCalledWith(expect.objectContaining({status:"draft"}));
 expect(query.eq).toHaveBeenCalledWith("room_owner_id","owner");
 expect(query.eq).toHaveBeenCalledWith("description","rcv3-private-preview-v1");
 expect(query.eq).toHaveBeenCalledWith("status","archived");
});
