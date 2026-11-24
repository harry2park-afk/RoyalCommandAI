import { describe, expect, it, vi } from "vitest";
import { reportConfig, reportRequest, sendOwnerReport, type ReportConfig, type ReportStore } from "./retellOwnerReport";
const config: ReportConfig = { roomId:"room-a", inboundAgentId:"inbound", reporterAgentId:"reporter", from:"+61200000000", to:"+61400000000", apiKey:"test-only" };
const call = { call_id:"call-1", direction:"inbound", call_type:"phone_call", call_status:"ended", agent_id:"inbound", to_number:config.from, from_number:"+61411111111", call_analysis:{call_summary:"Caller asks Harry to call back."} };
function fixture(){
 const claimed=new Set<string>();
 const store:ReportStore={claim:vi.fn(async id=>{if(claimed.has(id))return false;claimed.add(id);return true;}),finish:vi.fn(async()=>{})};
 const fetcher=vi.fn(async()=>new Response(JSON.stringify({call_id:"out-1"}),{status:201}));
 return {store,fetcher};
}
describe("owner callback",()=>{
 it("fails closed when unconfigured or forwarding not verified",()=>{
  expect(reportConfig({})).toBeNull();
  expect(reportConfig({RETELL_OWNER_REPORT_ENABLED:"true"})).toBeNull();
 });
 it("rejects wrong room, outgoing calls, reporter calls, own caller ID and unfinished calls",()=>{
  expect(reportRequest("call_analyzed",call,"room-b",config)).toBeNull();
  for(const patch of [{direction:"outbound"},{agent_id:"reporter"},{from_number:config.from},{call_status:"ongoing"},{metadata:{purpose:"owner_report"}},{call_analysis:{}}])
   expect(reportRequest("call_analyzed",{...call,...patch},config.roomId,config)).toBeNull();
  expect(reportRequest("call_ended",call,config.roomId,config)).toBeNull();
 });
 it("ignores caller-controlled destination and uses separate report agent",()=>{
  const result=reportRequest("call_analyzed",{...call,metadata:{to_number:"+61999999999"}},config.roomId,config)!;
  expect(result.to_number).toBe(config.to);
  expect(result.override_agent_id).toBe("reporter");
 });
 it("concurrent duplicate events produce only one outbound request",async()=>{
  const {store,fetcher}=fixture();
  const result=await Promise.all(Array.from({length:3},()=>sendOwnerReport("call_analyzed",call,config.roomId,config,store,fetcher)));
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(result.sort()).toEqual(["duplicate","duplicate","requested"]);
 });
 it("never redials after timeout or ambiguous provider failure",async()=>{
  const {store,fetcher}=fixture();fetcher.mockRejectedValue(new Error("timeout"));
  expect(await sendOwnerReport("call_analyzed",call,config.roomId,config,store,fetcher)).toBe("unknown");
  expect(await sendOwnerReport("call_analyzed",call,config.roomId,config,store,fetcher)).toBe("duplicate");
  expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it("does not dial when database claim fails",async()=>{
  const {store,fetcher}=fixture();vi.mocked(store.claim).mockRejectedValue(new Error("db down"));
  await expect(sendOwnerReport("call_analyzed",call,config.roomId,config,store,fetcher)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
 });
});
