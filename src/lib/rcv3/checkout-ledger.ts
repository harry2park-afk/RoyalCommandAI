import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { draftInputSchema, secretarySetupValid, type RoomDraftInput } from "./room-draft";
import { stableId } from "./access";
import { cloudStore, readState, revisionFile, stateSchema } from "./cloud-state";
import { roomTemplates, templateImage } from "./templates";
import { createTestCheckout, previewStripe, readCheckoutConfiguration, verifyTestCheckout, type CheckoutOrder } from "./stripe-checkout";
import { verifyCustomerMail } from "./customer-mail";
import { bindCustomerPhoneForPaidOrder } from "./customer-phone-account";

export type OrderSnapshot = {
 order: CheckoutOrder; draft: RoomDraftInput; termsText: string;
 accountId: string; origin: string; recurringConsent: true;
};
export type LedgerOrder = {
 id: string; owner_id: string; draft_id: string; room_id: string;
 snapshot: OrderSnapshot; session_id: string | null;
 subscription_id: string | null; activated_at: string | null;
};
export function checkoutRuntime() {
 const config = readCheckoutConfiguration();
 const origin = process.env.RCV3_CHECKOUT_ORIGIN || "";
 if (process.env.RCV3_CHECKOUT_ENABLED !== "true" || !process.env.RCV3_STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) throw new Error("RCV3_ACTIVATION_NOT_READY");
 if (!origin.startsWith("https://") || new URL(origin).origin !== origin) throw new Error("RCV3_ORIGIN");
 return { ...config, origin, stripe: previewStripe(config.key) };
}
export function validateCreationDraft(candidate: unknown) {
 const draft = draftInputSchema.parse(candidate);
 if(draft.specialAI)throw new Error("RCV3_SERVICE_NOT_READY");
 if(draft.secretary&&!draft.providers.length)throw new Error("RCV3_FORM_REQUIRED");
 if(draft.onboarding&&(!draft.onboarding.country||!draft.providers.length))throw new Error("RCV3_FORM_REQUIRED");
 if (!draft.name || draft.plan !== "paid" || !secretarySetupValid(draft) ||
   (draft.purpose === "custom" && !draft.answers.purpose?.[0]?.trim())) throw new Error("RCV3_FORM_REQUIRED");
 return draft;
}
export function orderLedger(db = createAdminClient()) {
 async function one(column: string, value: string, ownerId?: string): Promise<LedgerOrder | null> {
  let query = db.from("rcv3_preview_orders").select("*").eq(column, value);
  if (ownerId) query = query.eq("owner_id", ownerId);
  const r = await query.maybeSingle(); if (r.error) throw new Error("RCV3_STORAGE");
  return r.data as LedgerOrder | null;
 }
 return { db, one,
  async insert(snapshot: OrderSnapshot) {
   const order = snapshot.order;
   const value = { id: order.id, owner_id: order.ownerId, draft_id: order.draftId,
    room_id: stableId(order.ownerId, `paid-room:${order.id}`), snapshot };
   const r = await db.from("rcv3_preview_orders").insert(value);
   if (r.error && r.error.code !== "23505") throw new Error("RCV3_STORAGE");
   const stored = await one("draft_id", order.draftId, order.ownerId);
   if (!stored) throw new Error("RCV3_STORAGE");
   return stored;
  },
  async bindSession(row: LedgerOrder, sessionId: string) {
   const r = await db.from("rcv3_preview_orders").update({session_id: sessionId}).eq("id",row.id).is("session_id",null);
   if (r.error) throw new Error("RCV3_STORAGE");
   const stored = await one("id",row.id,row.owner_id);
   if (!stored || stored.session_id !== sessionId) throw new Error("RCV3_PAYMENT_MISMATCH");
   return stored;
  },
 };
}
export async function checkoutForOrder(row: LedgerOrder, ledger = orderLedger()) {
 const { stripe, catalog, origin } = checkoutRuntime();
 if (catalog.accountId !== row.snapshot.accountId || origin !== row.snapshot.origin) throw new Error("RCV3_PAYMENT_ACCOUNT");
 if (row.session_id) {
  const s = await stripe.checkout.sessions.retrieve(row.session_id);
  if (s.livemode || s.client_reference_id !== row.id || s.metadata?.rcv3_owner !== row.owner_id) throw new Error("RCV3_PAYMENT_MISMATCH");
  if (s.status === "complete") return { orderId: row.id, status: "processing" as const };
  if (s.status !== "open" || !s.url || new URL(s.url).origin !== "https://checkout.stripe.com") throw new Error("RCV3_QUOTE_EXPIRED");
  return {orderId:row.id, url:s.url};
 }
 const checkout = await createTestCheckout(stripe,row.snapshot.order,row.snapshot.origin);
 await ledger.bindSession(row,checkout.id);
 return {orderId:row.id,url:checkout.url};
}
// No caller-supplied paid flag, room owner, design or price reaches fulfillment.
// A repeated webhook/return request re-verifies Stripe and repairs incomplete writes.
export async function fulfillOrder(row: LedgerOrder, ledger = orderLedger()) {
 const {stripe,catalog} = checkoutRuntime();
 if (catalog.accountId !== row.snapshot.accountId) throw new Error("RCV3_PAYMENT_ACCOUNT");
 if (!row.session_id) return {status:"pending" as const};
 const paid = await verifyTestCheckout(stripe,row.snapshot.order,row.session_id);
 if (!paid.paid) return {status:"pending" as const};
 const {db} = ledger, owner = row.owner_id, roomId = row.room_id;
 const draft = validateCreationDraft(row.snapshot.draft);
 if (row.snapshot.order.ownerId !== owner || row.id !== row.snapshot.order.id || !row.snapshot.recurringConsent) throw new Error("RCV3_PAYMENT_MISMATCH");
 const householdId = stableId(owner,"household");
 // Insert-only deterministic records make simultaneous deliveries safe.
 const h = await db.from("households").insert({id:householdId,owner_id:owner,name:"RCV3 Private Preview",household_type:"individual"});
 if(h.error && h.error.code !== "23505") throw new Error("RCV3_STORAGE");
 const verifiedHouse = await db.from("households").select("owner_id").eq("id",householdId).eq("owner_id",owner).maybeSingle();
 if(verifiedHouse.error || !verifiedHouse.data) throw new Error("RCV3_NOT_FOUND");
 const r = await db.from("rooms").insert({id:roomId,household_id:householdId,room_owner_id:owner,name:draft.name,description:"rcv3-private-preview-v1",status:"draft"});
 if(r.error && r.error.code !== "23505") throw new Error("RCV3_STORAGE");
 const verified = await db.from("rooms").select("id").eq("id",roomId).eq("room_owner_id",owner).eq("household_id",householdId).maybeSingle();
 if(verified.error || !verified.data) throw new Error("RCV3_NOT_FOUND");
 const store = cloudStore(db,owner,roomId);
 if(!await readState(store)) {
  const state = initialPaidState(draft,roomId);
  if(draft.onboarding?.emailEnabled) {
   await verifyCustomerMail(owner,draft.secretarySetup.email,true);
   state.gmailEnabled = true;
  }
  const template = roomTemplates.find(t=>t.id===draft.templateId)!;
  const insert = async (key:string,value:unknown) => { try {await store.insert(key,value);} catch(e){if(!(e instanceof Error)||e.message!=="RCV3_CONFLICT")throw e;} };
  if(state.design.backgroundAssetId) await insert(`assets/${state.design.backgroundAssetId}.txt`,{data:templateImage(template)});
  await insert(revisionFile(1),state);
 }
 if(!await readState(store)) throw new Error("RCV3_STORAGE");
 if(draft.onboarding?.phoneRequested) {
  await bindCustomerPhoneForPaidOrder(owner,roomId,draft.onboarding.phoneNumberId || "",draft.onboarding.phoneConsent === true,row.id);
 }
 const activated = await db.from("rcv3_preview_orders").update({subscription_id:paid.subscriptionId,activated_at:row.activated_at || new Date().toISOString()}).eq("id",row.id).eq("session_id",paid.sessionId);
 if(activated.error) throw new Error("RCV3_STORAGE");
 return {status:"active" as const,roomId,url:`/rcv3?room=${roomId}`};
}
export function initialPaidState(draft:RoomDraftInput,roomId:string) {
 const capabilities = [...(draft.providers.length ? ["chat" as const] : []), ...(draft.secretary ? ["secretary" as const] : []),"files" as const];
 const buttons = capabilities.map((capability,i)=>({id:stableId(roomId,capability),capability,label:capability==="chat"?"My AI":capability==="secretary"?"Katie":"Files",x:8+i*30,y:12,width:24,height:12,opacity:1}));
 return stateSchema.parse({revision:1,release:"rcv3-1",name:draft.name,
  connectedProviders:draft.providers,selectedProviders:draft.providers,secretaryRoomId:null,gmailEnabled:false,
  design:{backgroundAssetId:stableId(roomId,"template-background"),buttons},appearances:{},bindings:Object.fromEntries(buttons.map(b=>[b.id,b.capability]))});
}
// The fixed legacy allowlist is server-owned. Never trust a draft, room marker,
// creation timestamp, writable storage, or frontend state as payment evidence.
export async function paidRoomEntitlement(ownerId:string,roomId:string) {
 z.string().uuid().parse(roomId);
 const ledger = orderLedger();
 const legacy = await ledger.db.from("rcv3_preview_legacy_rooms").select("room_id").eq("room_id",roomId).eq("owner_id",ownerId).maybeSingle();
 if(legacy.error) throw new Error("RCV3_STORAGE");
 if(legacy.data) return null;
 const row = await ledger.one("room_id",roomId,ownerId);
 if(!row?.activated_at || !row.session_id) throw new Error("RCV3_PAYMENT_REQUIRED");
 const {stripe,catalog} = checkoutRuntime();
 if(row.snapshot.accountId!==catalog.accountId)throw new Error("RCV3_PAYMENT_ACCOUNT");
 if(!(await verifyTestCheckout(stripe,row.snapshot.order,row.session_id)).paid) throw new Error("RCV3_PAYMENT_REQUIRED");
 return row.snapshot.draft;
}
export function requirePaidService(draft:RoomDraftInput|null,service:string) {
 if(!draft)return;
 if(service==="secretary" ? !draft.secretary : service.startsWith("ai:") ? !draft.providers.includes(service.slice(3) as RoomDraftInput["providers"][number]) : false) throw new Error("RCV3_SERVICE_NOT_INCLUDED");
}
