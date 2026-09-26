import { randomUUID } from "node:crypto";
import { z } from "zod";
import { session, stableId, input, reply, failure } from "@/lib/rcv3/access";
import { cloudStore } from "@/lib/rcv3/cloud-state";
import { readDraftRegistry } from "@/lib/rcv3/room-draft";
import { checkoutRuntime, validateCreationDraft, orderLedger, initialPaidState } from "@/lib/rcv3/checkout-ledger";
import { readState, revisionFile } from "@/lib/rcv3/cloud-state";
import { roomTemplates, templateImage } from "@/lib/rcv3/templates";
import { prepareOrder, quoteFingerprint, bundleForDraft, validateStripePrices } from "@/lib/rcv3/stripe-checkout";
import { createAdminClient } from "@/lib/supabase/admin";

// The authenticated customer sees only their own issued RC number.
export async function GET() {
 try {
  const {user}=await session();
  const result=await createAdminClient().from("rc_customer_accounts").select("customer_number").eq("owner_id",user.id).maybeSingle();
  if(result.error)throw new Error("RCV3_STORAGE");
  if(!result.data)throw new Error("RCV3_NOT_FOUND");
  return reply({customerNumber:result.data.customer_number});
 } catch(error) {return failure(error);}
}

// Records an authenticated, signed, immutable bank-transfer request. A bank
// receipt, browser acknowledgement, or this route can never activate a room.
export async function POST(request: Request) {
 try {
  const { user, db } = await session();
  const body = z.object({draftId:z.string().uuid(),expectedRevision:z.number().int().nonnegative(),quoteHash:z.string().length(64),termsHash:z.string().length(64),signature:z.string().trim().min(2).max(160),termsConsent:z.literal(true)}).strict().parse(await input(request,2000));
  const {stripe,catalog,origin} = checkoutRuntime();
  const registry = await readDraftRegistry(cloudStore(db,user.id,stableId(user.id,"room-creation-drafts")));
  if(registry.revision !== body.expectedRevision)throw new Error("RCV3_CONFLICT");
  const saved=registry.drafts.find(x=>x.id===body.draftId);
  if(!saved)throw new Error("RCV3_NOT_FOUND");
  const draft=validateCreationDraft(saved.input);
  if(quoteFingerprint(catalog,draft)!==body.quoteHash)throw new Error("RCV3_PRICE_CHANGED");
  // Saving an unpaid room does not establish a paid or connected entitlement.
  await validateStripePrices(stripe,catalog,bundleForDraft(catalog,draft).lines);
  const ledger=orderLedger();
  let row=await ledger.one("draft_id",body.draftId,user.id);
  if(row && row.snapshot.paymentMethod!=="bank")throw new Error("RCV3_ORDER_LOCKED");
  const order=prepareOrder({id:row?.id||randomUUID(),ownerId:user.id,draftId:body.draftId,draft,catalog,signature:body.signature,acceptedTermsHash:body.termsHash});
  row??=await ledger.insert({order,draft,termsText:catalog.terms.text,accountId:catalog.accountId,origin,recurringConsent:false,paymentMethod:"bank",billingContact:{email:user.email,name:user.fullName}});
  if(row.snapshot.paymentMethod!=="bank"||row.snapshot.order.draftHash!==order.draftHash||row.snapshot.order.termsHash!==order.termsHash||row.snapshot.order.signature!==order.signature||JSON.stringify(row.snapshot.order.lines)!==JSON.stringify(order.lines))throw new Error("RCV3_ORDER_LOCKED");
  // Persist the owned room immediately. Entitlement remains locked until a
  // verified payment or a separately charged token grant activates it.
  const householdId=stableId(user.id,"household");
  const admin=createAdminClient();
  const house=await admin.from("households").upsert({id:householdId,owner_id:user.id,name:"RCV3 Private Preview",household_type:"individual"},{onConflict:"id",ignoreDuplicates:true});
  if(house.error)throw new Error("RCV3_STORAGE");
  const room=await admin.from("rooms").upsert({id:row.room_id,household_id:householdId,room_owner_id:user.id,name:draft.name,description:"rcv3-private-preview-v1",status:"draft"},{onConflict:"id",ignoreDuplicates:true});
  if(room.error)throw new Error("RCV3_STORAGE");
  const verified=await admin.from("rooms").select("id").eq("id",row.room_id).eq("room_owner_id",user.id).eq("household_id",householdId).maybeSingle();
  if(verified.error||!verified.data)throw new Error("RCV3_STORAGE");
  const store=cloudStore(db,user.id,row.room_id);
  if(!await readState(store)) {
   const state=initialPaidState(draft,row.room_id);
   const template=roomTemplates.find(t=>t.id===draft.templateId)!;
   if(state.design.backgroundAssetId)try{await store.insert(`assets/${state.design.backgroundAssetId}.txt`,{data:templateImage(template)});}catch(e){if(!(e instanceof Error)||e.message!=="RCV3_CONFLICT")throw e;}
   try{await store.insert(revisionFile(1),state);}catch(e){if(!(e instanceof Error)||e.message!=="RCV3_CONFLICT")throw e;}
  }
  if(!await readState(store))throw new Error("RCV3_STORAGE");
  return reply({status:"pending",orderId:row.id,roomId:row.room_id,url:`/rcv3?room=${row.room_id}`});
 } catch(e) {return failure(e);}
}
