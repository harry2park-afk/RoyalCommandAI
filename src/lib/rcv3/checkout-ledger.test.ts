import { beforeEach,describe,expect,it,vi } from "vitest";
const mock=vi.hoisted(()=>({admin:vi.fn(),verify:vi.fn(),create:vi.fn(),stripe:{checkout:{sessions:{retrieve:vi.fn()}},customers:{create:vi.fn()}},files:new Map<string,unknown>(),failState:false}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:mock.admin}));
vi.mock("./stripe-checkout",async original=>({...await original<typeof import("./stripe-checkout")>(),previewStripe:()=>mock.stripe,verifyTestCheckout:mock.verify,createTestCheckout:mock.create}));
vi.mock("./cloud-state",async original=>({...await original<typeof import("./cloud-state")>(),cloudStore:()=>({
 list:async()=>[],read:async(key:string)=>mock.files.get(key),insert:async(key:string,value:unknown)=>{if(mock.failState&&key.startsWith("state/"))throw new Error("RCV3_STORAGE");if(mock.files.has(key))throw new Error("RCV3_CONFLICT");mock.files.set(key,value);}
}),readState:async()=>[...mock.files].find(([k])=>k.startsWith("state/"))?.[1]||null}));
import {checkoutForOrder,fulfillOrder,initialPaidState,orderLedger,paidRoomEntitlement,requirePaidService,validateCreationDraft,updateOrderSnapshot} from "./checkout-ledger";
import {newRoomDraft} from "./room-draft";
import {prepareOrder,termsFingerprint,type CheckoutCatalog} from "./stripe-checkout";
const uuid=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const catalog:CheckoutCatalog={version:"fixture",accountId:"acct_fixture",currency:"aud",tax:"included",terms:{version:"fixture",text:"Fixture terms only; not approved customer terms."},bundles:[{purpose:"legal",services:["room"],lines:[{serviceId:"room",label:"Room",priceId:"price_fixture",amountMinor:1000}]}]};
let tables:Record<string,Record<string,unknown>[]>;
function db() {return {from(table:string){const rows=tables[table]??=[];const filters:Array<(r:Record<string,unknown>)=>boolean>=[];let patch:Record<string,unknown>|null=null;let max=Infinity;
 const matching=()=>rows.filter(r=>filters.every(f=>f(r))).slice(0,max);
 const result=()=>{const data=matching();if(patch)for(const r of data)Object.assign(r,patch);return {data:structuredClone(data),error:null};};
 const query={select:()=>query,eq:(k:string,v:unknown)=>{filters.push(r=>k==="snapshot"?JSON.stringify(r[k])===v:r[k]===v);return query;},is:(k:string,v:unknown)=>{filters.push(r=>(r[k]??null)===v);return query;},neq:(k:string,v:unknown)=>{filters.push(r=>r[k]!==v);return query;},not:(k:string,_op:string,v:unknown)=>{filters.push(r=>(r[k]??null)!==v);return query;},order:()=>query,limit:(n:number)=>{max=n;return query;},maybeSingle:async()=>({data:result().data[0]||null,error:null}),update:(p:Record<string,unknown>)=>{patch=p;return query;},insert:async(value:Record<string,unknown>)=>{if(rows.some(r=>r.id===value.id||(table==="rcv3_preview_orders"&&r.owner_id===value.owner_id&&r.draft_id===value.draft_id)))return {error:{code:"23505"}};rows.push({...value});return {error:null};},then:(resolve:(r:unknown)=>void)=>Promise.resolve(result()).then(resolve)};return query;}};}
async function makeOrder(){const draft={...newRoomDraft(),name:"Customer room",purpose:"legal"};const order=prepareOrder({id:uuid(1),ownerId:uuid(2),draftId:uuid(3),draft,catalog,signature:"Customer",acceptedTermsHash:termsFingerprint(catalog.terms)});const ledger=orderLedger();const row=await ledger.insert({order,draft,termsText:catalog.terms.text,accountId:catalog.accountId,origin:"https://preview.example",recurringConsent:true});return {ledger,row:await ledger.bindSession(row,"cs_test_fixture")};}
beforeEach(()=>{vi.clearAllMocks();mock.files.clear();mock.failState=false;tables={};mock.admin.mockImplementation(db);mock.verify.mockResolvedValue({paid:true,sessionId:"cs_test_fixture",subscriptionId:"sub_fixture"});
 vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("RCV3_STRIPE_TEST_KEY","rk_test_fixture");vi.stubEnv("RCV3_CHECKOUT_CATALOG",JSON.stringify(catalog));vi.stubEnv("RCV3_CHECKOUT_ENABLED","true");vi.stubEnv("RCV3_CHECKOUT_ORIGIN","https://preview.example");vi.stubEnv("RCV3_STRIPE_WEBHOOK_SECRET","whsec_fixture");});
describe("server-owned checkout fulfillment",()=>{
 it("does not write room or storage for unpaid checkout",async()=>{const {ledger,row}=await makeOrder();mock.verify.mockResolvedValue({paid:false});expect(await fulfillOrder(row,ledger)).toEqual({status:"pending"});expect(tables.rooms).toBeUndefined();expect(mock.files.size).toBe(0);});
 it("concurrent return and webhook deliveries create exactly one room",async()=>{const {ledger,row}=await makeOrder();const results=await Promise.all([fulfillOrder(row,ledger),fulfillOrder(row,ledger)]);expect(results[0]).toEqual(results[1]);expect(tables.rooms).toHaveLength(1);expect(tables.households).toHaveLength(1);expect([...mock.files.keys()].filter(k=>k.startsWith("state/"))).toHaveLength(1);expect(tables.rcv3_preview_orders[0].activated_at).toBeTruthy();});
 it("recovers after payment succeeded but initial state storage failed",async()=>{const {ledger,row}=await makeOrder();mock.failState=true;await expect(fulfillOrder(row,ledger)).rejects.toThrow("RCV3_STORAGE");expect(tables.rcv3_preview_orders[0].activated_at).toBeUndefined();mock.failState=false;expect((await fulfillOrder(row,ledger)).status).toBe("active");expect(tables.rooms).toHaveLength(1);});
 it("deduplicates competing order attempts for the same owner draft",async()=>{const {row,ledger}=await makeOrder();const snapshot={...row.snapshot,order:{...row.snapshot.order,id:uuid(9)}};const retried=await ledger.insert(snapshot);expect(retried.id).toBe(row.id);expect(tables.rcv3_preview_orders).toHaveLength(1);expect(await ledger.one("draft_id",uuid(3),uuid(8))).toBeNull();});
 it("rejects an existing destination belonging to somebody else",async()=>{const {row,ledger}=await makeOrder();tables.rooms=[{id:row.room_id,room_owner_id:uuid(8)}];await expect(fulfillOrder(row,ledger)).rejects.toThrow("RCV3_NOT_FOUND");expect(mock.files.size).toBe(0);});
 it("checks current billing on access and preserves only protected legacy exemptions",async()=>{const {row,ledger}=await makeOrder();await fulfillOrder(row,ledger);expect((await paidRoomEntitlement(row.owner_id,row.room_id))?.name).toBe("Customer room");mock.verify.mockResolvedValue({paid:false});await expect(paidRoomEntitlement(row.owner_id,row.room_id)).rejects.toThrow("RCV3_PAYMENT_REQUIRED");await expect(paidRoomEntitlement(uuid(8),row.room_id)).rejects.toThrow();tables.rcv3_preview_legacy_rooms=[{room_id:uuid(6),owner_id:row.owner_id}];expect(await paidRoomEntitlement(row.owner_id,uuid(6))).toBeNull();});
 it("reuses the saved checkout URL without creating another session",async()=>{const {row,ledger}=await makeOrder();mock.stripe.checkout.sessions.retrieve.mockResolvedValue({status:"open",livemode:false,client_reference_id:row.id,metadata:{rcv3_owner:row.owner_id},url:"https://checkout.stripe.com/c/pay/cs_test_fixture"});expect((await checkoutForOrder(row,ledger)).url).toContain("checkout.stripe.com");expect(mock.create).not.toHaveBeenCalled();});
 it("creates only selected capabilities, with fresh IDs and no email/phone connections",()=>{const draft={...newRoomDraft(),name:"Mine",secretary:true,providers:["openai" as const],secretarySetup:{email:"customer@example.test",phone:"+12025550123"}};const state=initialPaidState(draft,uuid(1));expect(state.design.buttons.map(b=>b.capability)).toEqual(["chat","secretary","files"]);expect(state.secretaryRoomId).toBeNull();expect(state.gmailEnabled).toBe(false);expect(JSON.stringify(state)).not.toContain("customer@example.test");expect(()=>requirePaidService(draft,"ai:anthropic")).toThrow("RCV3_SERVICE_NOT_INCLUDED");expect(()=>validateCreationDraft({...draft,secretarySetup:{email:"",phone:""}})).toThrow("RCV3_FORM_REQUIRED");});
});

describe("immutable checkout billing identity",()=>{
 it("retries a lost checkout response with the saved customer after another order gains a different customer",async()=>{
  const {ledger,row:existing}=await makeOrder();
  tables.rcv3_preview_orders[0].session_id=null;
  tables.rcv3_preview_orders[0].snapshot={...existing.snapshot,billingContact:{email:"customer@example.test",name:"Customer"}};
  const row=(await ledger.one("id",existing.id,existing.owner_id))!;
  mock.stripe.customers.create.mockResolvedValue({id:"cus_original",livemode:false});
  mock.create.mockRejectedValueOnce(new Error("Lost Stripe response"));
  await expect(checkoutForOrder(row,ledger)).rejects.toThrow("Lost Stripe response");
  const persisted=(await ledger.one("id",row.id,row.owner_id))!;
  expect(persisted.snapshot.billingCustomerId).toBe("cus_original");
  expect(persisted.session_id).toBeNull();
  // A later order must not change the request replayed under this order's key.
  tables.rcv3_preview_orders.push({...structuredClone(row),id:uuid(9),session_id:"cs_test_later",snapshot:{...row.snapshot,order:{...row.snapshot.order,id:uuid(9)}}});
  mock.stripe.checkout.sessions.retrieve.mockResolvedValue({livemode:false,client_reference_id:uuid(9),metadata:{rcv3_owner:row.owner_id,rcv3_order:uuid(9)},customer:"cus_later"});
  mock.create.mockResolvedValueOnce({id:"cs_test_recovered",url:"https://checkout.stripe.com/c/pay/recovered"});
  expect(await checkoutForOrder(persisted,ledger)).toEqual({orderId:row.id,url:"https://checkout.stripe.com/c/pay/recovered"});
  expect(mock.create).toHaveBeenCalledTimes(2);
  expect(mock.create.mock.calls[1]).toEqual(mock.create.mock.calls[0]);
  expect(mock.create.mock.calls[1][3]).toBe("cus_original");
  expect(mock.stripe.customers.create).toHaveBeenCalledTimes(1);
  expect(mock.stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
  expect((await ledger.one("id",row.id,row.owner_id))?.session_id).toBe("cs_test_recovered");
 });
 it("rejects a stale snapshot writer without overwriting the saved customer",async()=>{
  const {ledger,row}=await makeOrder();
  await updateOrderSnapshot(row,{...row.snapshot,billingCustomerId:"cus_winner"},ledger);
  await expect(updateOrderSnapshot(row,{...row.snapshot,billingCustomerId:"cus_stale"},ledger)).rejects.toThrow("RCV3_CONFLICT");
  expect((await ledger.one("id",row.id,row.owner_id))?.snapshot.billingCustomerId).toBe("cus_winner");
 });
});
