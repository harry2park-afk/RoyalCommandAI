import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { newRoomDraft } from "./room-draft";
import { bundleForDraft, checkoutCatalogSchema, createTestCheckout, draftFingerprint, prepareOrder, previewStripe, readCheckoutConfiguration, termsFingerprint, validateStripePrices, verifyTestCheckout, verifyTestWebhook, type CheckoutCatalog } from "./stripe-checkout";
const uuid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const catalog: CheckoutCatalog = { version: "fixture-only", accountId: "acct_fixture", currency: "aud", tax: "included", terms: { version: "fixture", text: "Test agreement fixture, not customer terms." }, bundles: [{ purpose: "legal", services: ["room"], lines: [{ serviceId: "room", label: "Test room", priceId: "price_fixture", amountMinor: 1000 }] }] };
const draft = { ...newRoomDraft(), name: "Test room", purpose: "legal", plan: "paid" as const };
function order() { return prepareOrder({ id: uuid(1), ownerId: uuid(2), draftId: uuid(3), draft, catalog, signature: "Test Signer", acceptedTermsHash: termsFingerprint(catalog.terms) }); }
function client(o = order()) {
  return { accounts: { retrieve: vi.fn().mockResolvedValue({ id: catalog.accountId }) },
    prices: { retrieve: vi.fn().mockResolvedValue({ livemode:false, active:true, currency:"aud", unit_amount:1000, type:"recurring", recurring:{ interval:"month", interval_count:1, usage_type:"licensed" }, billing_scheme:"per_unit", tax_behavior:"inclusive" }) },
    checkout: { sessions: {
      create: vi.fn().mockResolvedValue({ id: "cs_test_fixture", url: "https://checkout.stripe.com/c/pay/cs_test_fixture", livemode:false }),
      retrieve: vi.fn().mockResolvedValue({ id:"cs_test_fixture", livemode:false, mode:"subscription", client_reference_id:o.id, metadata:{ rcv3_order:o.id, rcv3_owner:o.ownerId, rcv3_draft:o.draftId, rcv3_hash:o.draftHash }, status:"complete", payment_status:"paid", currency:"aud", amount_total:1000, customer:"cus_fixture", subscription:"sub_fixture" }),
      listLineItems: vi.fn().mockResolvedValue({ has_more:false, data:[{ price:{ id:"price_fixture" }, quantity:1, amount_total:1000 }] }),
    } }, subscriptions:{ retrieve:vi.fn().mockResolvedValue({ livemode:false, status:"active", customer:"cus_fixture", metadata:{rcv3_order:o.id,rcv3_owner:o.ownerId,rcv3_draft:o.draftId,rcv3_hash:o.draftHash}, items:{has_more:false,data:[{price:{id:"price_fixture",unit_amount:1000,currency:"aud",livemode:false,recurring:{interval:"month",interval_count:1}},quantity:1,current_period_end:Math.floor(Date.now()/1000)+86400}]}, latest_invoice:{livemode:false,status:"paid",currency:"aud",amount_paid:1000,amount_remaining:0,customer:"cus_fixture"} }) } };
}
const asStripe = (c: ReturnType<typeof client>) => c as unknown as Stripe;
describe("Preview payment boundary", () => {
  it("rejects production, missing runtime key and live keys", () => {
    expect(() => readCheckoutConfiguration({ NODE_ENV:"production", VERCEL_ENV:"production" })).toThrow("RCV3_NOT_FOUND");
    for (const key of [undefined,"sk_live_fixture","rk_live_fixture"]) expect(() => readCheckoutConfiguration({ NODE_ENV:"development", RCV3_STRIPE_TEST_KEY:key })).toThrow("RCV3_CHECKOUT_NOT_CONFIGURED");
    expect(() => previewStripe("rk_live_fixture")).toThrow("RCV3_CHECKOUT_NOT_CONFIGURED");
  });
  it("does not accept invalid commercial configuration", () => {
    expect(() => readCheckoutConfiguration({ NODE_ENV:"development", RCV3_STRIPE_TEST_KEY:"rk_test_fixture", RCV3_CHECKOUT_CATALOG:"{}" })).toThrow("RCV3_PRICE_NOT_CONFIGURED");
    expect(checkoutCatalogSchema.safeParse({ ...catalog, currency:"usd" }).success).toBe(false);
    expect(checkoutCatalogSchema.safeParse({ ...catalog, bundles:[{ ...catalog.bundles[0], services:["room","secretary"] }] }).success).toBe(false);
  });
  it("requires an exact approved purpose and service combination", () => {
    expect(bundleForDraft(catalog,draft).lines[0].priceId).toBe("price_fixture");
    for (const change of [{ purpose:"accounting" },{ secretary:true },{ providers:["openai" as const] },{ plan:"free" as const }]) expect(() => bundleForDraft(catalog,{...draft,...change})).toThrow("RCV3_PRICE_NOT_CONFIGURED");
  });
  it("requires the current terms and a signature; binds semantic draft content", () => {
    expect(() => prepareOrder({ id:uuid(1),ownerId:uuid(2),draftId:uuid(3),draft,catalog,signature:"Test",acceptedTermsHash:"old" })).toThrow("RCV3_CONSENT_REQUIRED");
    expect(draftFingerprint(draft)).toBe(draftFingerprint({...draft,step:3}));
    expect(draftFingerprint(draft)).not.toBe(draftFingerprint({...draft,name:"Changed"}));
    expect(order().integrationIdentifier).toMatch(/^rcv3-preview-[a-z]{8}$/);
  });
  it("checks Stripe account, currency, price, recurring interval and tax", async () => {
    const c=client(); await validateStripePrices(asStripe(c),catalog,order().lines);
    c.accounts.retrieve.mockResolvedValueOnce({id:"acct_other"});
    await expect(validateStripePrices(asStripe(c),catalog,order().lines)).rejects.toThrow("RCV3_PAYMENT_ACCOUNT");
    const valid=await c.prices.retrieve();
    for(const patch of [{livemode:true},{currency:"usd"},{unit_amount:900},{tax_behavior:"unspecified"},{active:false},{recurring:{interval:"year",interval_count:1,usage_type:"licensed"}}]) {
      c.prices.retrieve.mockResolvedValueOnce({...valid,...patch});
      await expect(validateStripePrices(asStripe(c),catalog,order().lines)).rejects.toThrow("RCV3_PRICE_CHANGED");
    }
  });
  it("retries the same persisted order with identical Stripe idempotency key and fields", async () => {
    const o=order(), c=client(o); await createTestCheckout(asStripe(c),o,"https://preview.example"); await createTestCheckout(asStripe(c),o,"https://preview.example");
    expect(c.checkout.sessions.create.mock.calls[0]).toEqual(c.checkout.sessions.create.mock.calls[1]);
    const body=c.checkout.sessions.create.mock.calls[0][0]; expect(body).not.toHaveProperty("payment_method_types");
    expect(body.line_items).toEqual([{price:"price_fixture",quantity:1}]);
    expect(body.cancel_url).toContain(`draft=${o.draftId}`);
  });
  it("retries persisted expired requests unchanged and rejects untrusted checkout redirects", async () => {
    const o=order(),c=client(o);
    await createTestCheckout(asStripe(c),{...o,expiresAt:0},"https://preview.example");
    expect(c.checkout.sessions.create.mock.calls[0][0].expires_at).toBe(0);
    c.checkout.sessions.create.mockResolvedValueOnce({id:"cs_test_fixture",url:"https://evil.example",livemode:false});
    await expect(createTestCheckout(asStripe(c),o,"https://preview.example")).rejects.toThrow("RCV3_PAYMENT_RESPONSE");
  });
  it("verifies the server's exact paid session rather than trusting a success redirect", async () => {
    const o=order(),c=client(o);
    expect(await verifyTestCheckout(asStripe(c),o,"cs_test_fixture")).toEqual({paid:true,subscriptionId:"sub_fixture",sessionId:"cs_test_fixture"});
    const valid=await c.checkout.sessions.retrieve();
    for(const patch of [{livemode:true},{currency:"usd"},{amount_total:1},{client_reference_id:uuid(9)},{metadata:{...valid.metadata,rcv3_owner:uuid(9)}}]) {
      c.checkout.sessions.retrieve.mockResolvedValueOnce({...valid,...patch});
      await expect(verifyTestCheckout(asStripe(c),o,"cs_test_fixture")).rejects.toThrow("RCV3_PAYMENT_MISMATCH");
    }
    c.checkout.sessions.retrieve.mockResolvedValueOnce({...valid,payment_status:"unpaid"});
    expect(await verifyTestCheckout(asStripe(c),o,"cs_test_fixture")).toEqual({paid:false});
  });
  it("rejects changed line items and canceled subscriptions", async () => {
    const o=order(),c=client(o);
    c.checkout.sessions.listLineItems.mockResolvedValueOnce({has_more:false,data:[{price:{id:"price_other"},quantity:1,amount_total:1000}]});
    await expect(verifyTestCheckout(asStripe(c),o,"cs_test_fixture")).rejects.toThrow("RCV3_PAYMENT_MISMATCH");
    c.subscriptions.retrieve.mockResolvedValueOnce({livemode:false,status:"canceled",metadata:{rcv3_order:o.id,rcv3_owner:o.ownerId}});
    expect(await verifyTestCheckout(asStripe(c),o,"cs_test_fixture")).toEqual({paid:false});
  });
  it("rejects duplicate returned prices when one expected service is missing", async () => {
    const o=order(); o.lines.push({serviceId:"secretary",label:"Fixture",priceId:"price_second",amountMinor:1000});
    const c=client(o), valid=await c.checkout.sessions.retrieve();
    c.checkout.sessions.retrieve.mockResolvedValue({...valid,amount_total:2000});
    const duplicate={price:{id:"price_fixture"},quantity:1,amount_total:1000};
    c.checkout.sessions.listLineItems.mockResolvedValue({has_more:false,data:[duplicate,duplicate]});
    await expect(verifyTestCheckout(asStripe(c),o,"cs_test_fixture")).rejects.toThrow("RCV3_PAYMENT_MISMATCH");
  });
  it("does not grant renewals from an old paid checkout when the current invoice or period is unpaid", async () => {
    const o=order(),c=client(o),valid=await c.subscriptions.retrieve();
    for(const patch of [{latest_invoice:{...valid.latest_invoice,status:"open"}}, {latest_invoice:{...valid.latest_invoice,amount_paid:0}}, {items:{...valid.items,data:valid.items.data.map((i:{current_period_end:number})=>({...i,current_period_end:1}))}}]) {
      c.subscriptions.retrieve.mockResolvedValueOnce({...valid,...patch});
      expect(await verifyTestCheckout(asStripe(c),o,"cs_test_fixture")).toEqual({paid:false});
    }
    c.subscriptions.retrieve.mockResolvedValueOnce({...valid,customer:"cus_other"});
    await expect(verifyTestCheckout(asStripe(c),o,"cs_test_fixture")).rejects.toThrow("RCV3_PAYMENT_MISMATCH");
  });
  it("requires a real valid webhook signature and rejects live events", () => {
    const stripe=previewStripe("rk_test_fixture"), secret="whsec_fixture";
    const payload=JSON.stringify({id:"evt_fixture",object:"event",livemode:false,type:"checkout.session.completed",data:{object:{}}});
    const header=stripe.webhooks.generateTestHeaderString({payload,secret});
    expect(verifyTestWebhook(stripe,payload,header,secret).id).toBe("evt_fixture");
    expect(()=>verifyTestWebhook(stripe,payload+" ",header,secret)).toThrow("RCV3_WEBHOOK_INVALID");
    expect(()=>verifyTestWebhook(stripe,payload,"",secret)).toThrow("RCV3_WEBHOOK_INVALID");
    const live=payload.replace('"livemode":false','"livemode":true');
    expect(()=>verifyTestWebhook(stripe,live,stripe.webhooks.generateTestHeaderString({payload:live,secret}),secret)).toThrow("RCV3_WEBHOOK_INVALID");
  });
});
