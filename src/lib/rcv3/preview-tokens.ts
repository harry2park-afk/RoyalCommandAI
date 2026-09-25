import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { stableId } from "./access";
import { cloudStore, readState, revisionFile } from "./cloud-state";
import { readDraftRegistry, draftInputSchema } from "./room-draft";
import { initialPaidState, validateCreationDraft } from "./checkout-ledger";
import { verifyCustomerSetup } from "./customer-setup";
import { roomTemplates, templateImage } from "./templates";

const OWNER_NUMBER="RC 0357060";
const COST=30;
const admin=()=>createAdminClient();
export async function previewTokenAccount(ownerId:string) {
  const db=admin();
  const account=await db.from("rc_customer_accounts").select("customer_number").eq("owner_id",ownerId).eq("customer_number",OWNER_NUMBER).maybeSingle();
  if(account.error)throw new Error("RCV3_STORAGE");
  if(!account.data)throw new Error("RCV3_NOT_FOUND");
  const [grants,rooms]=await Promise.all([
    db.from("rcv3_preview_token_grants").select("amount").eq("owner_id",ownerId),
    db.from("rcv3_preview_token_rooms").select("tokens_spent").eq("owner_id",ownerId),
  ]);
  if(grants.error||rooms.error)throw new Error("RCV3_STORAGE");
  return {customerNumber:OWNER_NUMBER,balance:(grants.data||[]).reduce((n,x)=>n+x.amount,0)-(rooms.data||[]).reduce((n,x)=>n+x.tokens_spent,0),cost:COST};
}
export async function tokenRoomEntitlement(ownerId:string,roomId:string) {
  const db=admin();
  const result=await db.from("rcv3_preview_token_rooms").select("draft_snapshot,expires_at,activated_at").eq("room_id",roomId).eq("owner_id",ownerId).maybeSingle();
  if(result.error)throw new Error("RCV3_STORAGE");
  if(!result.data)return undefined;
  if(!result.data.activated_at||Date.parse(result.data.expires_at)<=Date.now())throw new Error("RCV3_PAYMENT_REQUIRED");
  return draftInputSchema.parse(result.data.draft_snapshot);
}
export async function openPreviewTokenRoom(ownerId:string,db:Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,draftId:string,expectedRevision:number,signature:string) {
  await previewTokenAccount(ownerId);
  const service=admin();
  const previous=await service.from("rcv3_preview_token_rooms").select("*").eq("owner_id",ownerId).eq("draft_id",draftId).maybeSingle();
  if(previous.error)throw new Error("RCV3_STORAGE");
  if(previous.data&&Date.parse(previous.data.expires_at)<=Date.now())throw new Error("RCV3_PAYMENT_REQUIRED");
  if(previous.data?.activated_at)return {status:"active",roomId:previous.data.room_id,url:`/rcv3?room=${previous.data.room_id}`,balance:(await previewTokenAccount(ownerId)).balance};
  let draft;
  if(previous.data)draft=validateCreationDraft(previous.data.draft_snapshot);
  else {
    const registry=await readDraftRegistry(cloudStore(db,ownerId,stableId(ownerId,"room-creation-drafts")));
    if(registry.revision!==expectedRevision)throw new Error("RCV3_CONFLICT");
    const saved=registry.drafts.find(x=>x.id===draftId);
    if(!saved)throw new Error("RCV3_NOT_FOUND");
    draft=validateCreationDraft(saved.input);
  }
  // Tokens only activate verified customer-owned services. They cannot enable
  // an unconnected requested feature, an email account or a phone number.
  await verifyCustomerSetup(ownerId,draftId,draft);
  const roomId=stableId(ownerId,`token-room:${draftId}`);
  const charged=previous.data?{data:previous.data,error:null}:await service.rpc("rcv3_open_preview_token_room",{p_owner:ownerId,p_draft:draftId,p_room:roomId,p_snapshot:draft,p_tokens:COST,p_name:signature,p_version:"rcv3-preview-token-20260925"});
  if(charged.error)throw new Error(/INSUFFICIENT_TOKENS/.test(charged.error.message)?"RCV3_LIMIT":/DRAFT_CHANGED/.test(charged.error.message)?"RCV3_CONFLICT":"RCV3_STORAGE");
  const householdId=stableId(ownerId,"household");
  const h=await service.from("households").insert({id:householdId,owner_id:ownerId,name:"RCV3 Private Preview",household_type:"individual"});
  if(h.error&&h.error.code!=="23505")throw new Error("RCV3_STORAGE");
  const room=await service.from("rooms").insert({id:roomId,household_id:householdId,room_owner_id:ownerId,name:draft.name,description:"rcv3-private-preview-v1",status:"draft"});
  if(room.error&&room.error.code!=="23505")throw new Error("RCV3_STORAGE");
  const verified=await service.from("rooms").select("id").eq("id",roomId).eq("room_owner_id",ownerId).eq("household_id",householdId).maybeSingle();
  if(verified.error||!verified.data)throw new Error("RCV3_STORAGE");
  const store=cloudStore(db,ownerId,roomId);
  if(!await readState(store)) {
    const state=initialPaidState(draft,roomId);
    if(draft.onboarding?.emailEnabled)state.gmailEnabled=true;
    const template=roomTemplates.find(t=>t.id===draft.templateId)!;
    const insert=async(key:string,value:unknown)=>{try{await store.insert(key,value);}catch(e){if(!(e instanceof Error)||e.message!=="RCV3_CONFLICT")throw e;}};
    if(state.design.backgroundAssetId)await insert(`assets/${state.design.backgroundAssetId}.txt`,{data:templateImage(template)});
    await insert(revisionFile(1),state);
  }
  if(!await readState(store))throw new Error("RCV3_STORAGE");
  const active=await service.from("rcv3_preview_token_rooms").update({activated_at:charged.data.activated_at||new Date().toISOString()}).eq("room_id",roomId).eq("owner_id",ownerId);
  if(active.error)throw new Error("RCV3_STORAGE");
  return {status:"active",roomId,url:`/rcv3?room=${roomId}`,balance:(await previewTokenAccount(ownerId)).balance};
}
