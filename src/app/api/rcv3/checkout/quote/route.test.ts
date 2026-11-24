import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session:vi.fn(),store:vi.fn(),read:vi.fn(),config:vi.fn(),bundle:vi.fn(),validate:vi.fn() }));
vi.mock("@/lib/rcv3/access",()=>({session:m.session,stableId:(o:string,k:string)=>`${o}:${k}`, input:(r:Request)=>r.json(),reply:(b:unknown)=>Response.json(b),failure:(e:Error)=>Response.json({code:e.message},{status:503})}));
vi.mock("@/lib/rcv3/cloud-state",()=>({cloudStore:m.store}));
vi.mock("@/lib/rcv3/room-draft",()=>({readDraftRegistry:m.read}));
vi.mock("@/lib/rcv3/stripe-checkout",()=>({readCheckoutConfiguration:m.config,previewStripe:()=>"stripe",bundleForDraft:m.bundle,validateStripePrices:m.validate,quoteFingerprint:()=>"quoteHash",draftFingerprint:()=>"hash",termsFingerprint:()=>"termsHash"}));
vi.mock("@/lib/rcv3/checkout-ledger",()=>({checkoutRuntime:m.config,validateCreationDraft:(d:unknown)=>d}));
vi.mock("@/lib/rcv3/customer-setup",()=>({verifyCustomerSetup:vi.fn().mockResolvedValue(undefined)}));
vi.mock("@/lib/rcv3/execution",()=>({reserve:vi.fn()}));
import { GET, POST } from "./route";
const draftId="10000000-0000-4000-8000-000000000001";
const req=(body:unknown)=>new Request("https://preview.example/api/rcv3/checkout/quote",{method:"POST",body:JSON.stringify(body)});
beforeEach(()=>{
  vi.clearAllMocks();m.session.mockResolvedValue({user:{id:"owner-a"},db:"db"});m.store.mockReturnValue({});
  m.read.mockResolvedValue({revision:1,drafts:[{id:draftId,input:{}}]});m.config.mockReturnValue({key:"not-exposed",catalog:{version:"fixture",currency:"aud",tax:"included",terms:{version:"fixture",text:"test"}}});
  m.bundle.mockReturnValue({lines:[{serviceId:"room",label:"Fixture",priceId:"price_fixture",amountMinor:1000}]});m.validate.mockResolvedValue(undefined);
});
it("uses the signed-in owner's draft namespace and returns a read-only quote",async()=>{
  const response=await POST(req({draftId,expectedRevision:1}));const body=await response.json();
  expect(response.status).toBe(200);expect(body.checkoutEnabled).toBe(true);expect(body.totalMinor).toBe(1000);
  expect(m.store).toHaveBeenCalledWith("db","owner-a","owner-a:room-creation-drafts");expect(JSON.stringify(body)).not.toContain("not-exposed");
});
it("rejects stale or missing drafts before consulting Stripe",async()=>{
  expect((await POST(req({draftId,expectedRevision:0}))).status).toBe(503);expect(m.config).not.toHaveBeenCalled();
  m.read.mockResolvedValue({revision:1,drafts:[]});expect((await POST(req({draftId,expectedRevision:1}))).status).toBe(503);expect(m.config).not.toHaveBeenCalled();
});
it("does not accept client prices or owners",async()=>{
  expect((await POST(req({draftId,expectedRevision:1,ownerId:"other",amount:1}))).status).toBe(503);expect(m.config).not.toHaveBeenCalled();
});
it("requires authentication before loading drafts",async()=>{
  m.session.mockRejectedValue(new Error("RCV3_AUTH"));expect((await POST(req({draftId,expectedRevision:1}))).status).toBe(503);expect(m.store).not.toHaveBeenCalled();
});

it("reports unavailable runtime configuration without exposing secrets",async()=>{
  m.config.mockImplementationOnce(()=>{throw new Error("RCV3_CHECKOUT_NOT_CONFIGURED")});
  const response=await GET();expect((await response.json()).code).toBe("RCV3_CHECKOUT_NOT_CONFIGURED");expect(m.read).not.toHaveBeenCalled();
});
