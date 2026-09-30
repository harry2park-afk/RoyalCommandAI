import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mock=vi.hoisted(()=>({resolve:vi.fn(),insert:vi.fn(),from:vi.fn()}));
vi.mock("@/lib/rcv3/customer-phone-account",()=>({resolveCustomerRetellCall:mock.resolve}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({from:mock.from})}));
vi.mock("@/lib/integrations/retellOwnerReport",()=>({reportConfig:()=>null,sendOwnerReport:vi.fn()}));
import { POST } from "./route";
const customerRoom="10000000-0000-4000-8000-000000000001", otherRoom="10000000-0000-4000-8000-000000000002";
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("RETELL_API_KEY_PREVIEW","legacy-key");vi.stubEnv("RCV3_CUSTOMER_RETELL_API_KEY","customer-key");vi.stubEnv("RCV3_CUSTOMER_RETELL_AGENT_ID","agent_customer");mock.resolve.mockResolvedValue({roomId:customerRoom});mock.insert.mockResolvedValue({error:null});mock.from.mockImplementation(()=>{const query={select:()=>query,eq:()=>query,contains:()=>query,limit:async()=>({data:[],error:null}),insert:mock.insert};return query;});});
afterEach(()=>vi.unstubAllEnvs());
function request(key="customer-key") {
 const raw=JSON.stringify({event:"call_analyzed",call:{call_id:"call_customer",agent_id:"agent_customer",metadata:{rcv3_customer_call:true,room_id:otherRoom},transcript:"Customer transcript"}});
 const timestamp=Date.now(),digest=createHmac("sha256",key).update(raw+timestamp).digest("hex");
 return new NextRequest("https://preview.test/api/webhooks/retell/post-call",{method:"POST",body:raw,headers:{"x-retell-signature":`v=${timestamp},d=${digest}`}});
}
describe("customer telephone transcript isolation",()=>{
 it("ignores room metadata and saves only to the server-created call binding",async()=>{expect((await POST(request())).status).toBe(200);expect(mock.resolve).toHaveBeenCalledWith("call_customer","agent_customer");expect(mock.insert.mock.calls[0][0].room_id).toBe(customerRoom);expect(mock.from).not.toHaveBeenCalledWith("rooms");});
 it("does not fall back to Harry or another room for unknown customer calls",async()=>{mock.resolve.mockResolvedValue(null);expect((await POST(request())).status).toBe(422);expect(mock.insert).not.toHaveBeenCalled();expect(mock.from).not.toHaveBeenCalled();});
 it("does not accept legacy signatures for customer-marked calls",async()=>{expect((await POST(request("legacy-key"))).status).toBe(401);expect(mock.resolve).not.toHaveBeenCalled();expect(mock.insert).not.toHaveBeenCalled();});
});
