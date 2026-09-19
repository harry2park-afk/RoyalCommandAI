import {it,expect,vi} from "vitest";
const records=vi.hoisted(()=>new Map<string,unknown>());
vi.mock("./access",()=>({stableId:()=>"budget"}));
vi.mock("@/lib/runtime/serverDomainContext",()=>({getServerDomainRuntimeContext:async()=>({})}));
vi.mock("@/config/countryResolver",()=>({isDomainFeatureReady:()=>true}));
vi.mock("./cloud-state",()=>({cloudStore:()=>({
 list:async(prefix:string)=>[...records.keys()].filter(k=>k.startsWith(prefix+"/")),
 insert:async(key:string,value:unknown)=>{if(records.has(key))throw new Error("RCV3_CONFLICT");records.set(key,value);},
})}));
import {reserve} from "./execution";
it("allocates a different budget slot to each parallel AI without duplicate charging",async()=>{
 records.clear();const a={db:{},user:{id:"owner"}} as Parameters<typeof reserve>[0];
 await Promise.all(Array.from({length:8},(_,i)=>reserve(a,`request-${i}`,"chat")));
 expect([...records.keys()].filter(k=>k.startsWith("budget/"))).toHaveLength(8);
 await expect(reserve(a,"request-0","chat")).rejects.toThrow("RCV3_CONFLICT");
 expect([...records.keys()].filter(k=>k.startsWith("budget/"))).toHaveLength(8);
});
