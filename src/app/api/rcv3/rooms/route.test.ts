import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({session:vi.fn(),access:vi.fn(),readState:vi.fn(),cloudStore:vi.fn()}));
vi.mock("@/lib/rcv3/access",async original=>({...await original<typeof import("@/lib/rcv3/access")>(),session:mock.session,access:mock.access}));
vi.mock("@/lib/rcv3/cloud-state",async original=>({...await original<typeof import("@/lib/rcv3/cloud-state")>(),readState:mock.readState,cloudStore:mock.cloudStore}));
import { POST } from "./route";
import { stateSchema } from "@/lib/rcv3/cloud-state";
import { roomTemplates } from "@/lib/rcv3/templates";
const owner="11111111-1111-4111-8111-111111111111",sourceId="22222222-2222-4222-8222-222222222222",requestId="33333333-3333-4333-8333-333333333333",buttonId="44444444-4444-4444-8444-444444444444";
let writes:Array<{key:string;value:unknown}>;
let sourceRead:ReturnType<typeof vi.fn>;
let dbWrite:ReturnType<typeof vi.fn>;
beforeEach(()=>{
  vi.clearAllMocks();writes=[];sourceRead=vi.fn(()=>{throw new Error("PRIVATE_SOURCE_READ");});
  const sourceStore={read:sourceRead};
  const targetStore={insert:async(key:string,value:unknown)=>{writes.push({key,value});}};
  const sourceState=stateSchema.parse({revision:2,release:"rcv3-1",name:"PRIVATE_SENTINEL",secretaryRoomId:sourceId,connectedProviders:["anthropic"],selectedProviders:["anthropic"],design:{backgroundAssetId:sourceId,buttons:[{id:buttonId,capability:"secretary",label:"PRIVATE_SENTINEL",x:0,y:0,width:20,height:12,opacity:1}]},appearances:{},bindings:{[buttonId]:"secretary"}});
  dbWrite=vi.fn(async()=>({error:null}));
  const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn(async()=>({data:{owner_id:owner}})),insert:dbWrite};
  mock.session.mockResolvedValue({user:{id:owner},db:{from:()=>query}});
  mock.cloudStore.mockReturnValue(targetStore);
  mock.access.mockImplementation(async(id:string)=>({store:id===sourceId?sourceStore:targetStore}));
  mock.readState.mockImplementation(async(store:unknown)=>store===sourceStore?sourceState:writes.find(w=>w.key.startsWith("state/"))?.value??null);
});
function request(extra:Record<string,unknown>={}){return new Request("https://preview.test/api/rcv3/rooms",{method:"POST",body:JSON.stringify({requestId,name:"New Room",sourceRoom:sourceId,...extra})});}
describe("portable room API writes",()=>{
  it("persists only fresh function state and does not fetch source assets/history/accounts",async()=>{
    const response=await POST(request());expect(response.status).toBe(200);
    expect(mock.access).toHaveBeenCalledWith(sourceId);
    expect(sourceRead).not.toHaveBeenCalled();
    expect(writes).toHaveLength(1);
    expect(writes[0].value).toMatchObject({secretaryRoomId:null,connectedProviders:["openai"],design:{backgroundAssetId:null}});
    for(const value of [sourceId,buttonId,"PRIVATE_SENTINEL","anthropic"])expect(JSON.stringify(writes)).not.toContain(value);
  });
  it("does not inherit private settings when choosing a catalogue template from an existing room",async()=>{
    expect((await POST(request({templateId:roomTemplates[0].id}))).status).toBe(200);
    expect(sourceRead).not.toHaveBeenCalled();
    expect(JSON.stringify(writes)).not.toContain(sourceId);
    expect(JSON.stringify(writes)).not.toContain("PRIVATE_SENTINEL");
    const state=stateSchema.parse(writes.find(w=>w.key.startsWith("state/"))!.value);
    expect(state.design.buttons.map(b=>b.capability)).toEqual(["chat","secretary","files"]);
    expect(state.secretaryRoomId).toBeNull();
  });
  it("rejects unowned source before any destination write",async()=>{
    mock.access.mockRejectedValue(new Error("RCV3_NOT_FOUND"));
    expect((await POST(request())).status).toBe(404);
    expect(dbWrite).not.toHaveBeenCalled();expect(writes).toHaveLength(0);
  });
  it("rejects injected connection and owner fields",async()=>{
    expect((await POST(request({secretaryRoomId:sourceId,ownerId:owner}))).status).toBe(400);
    expect(dbWrite).not.toHaveBeenCalled();expect(writes).toHaveLength(0);
  });
});
