import { createAdminClient } from "@/lib/supabase/admin";
import { orderLedger, paidRoomEntitlement, requirePaidService } from "./checkout-ledger";
// Shared RC endpoints keep Production behavior. In Preview, a paid room is
// recognized by the protected ledger even if its mutable description changes.
export async function guardPaidRoom(ownerId:string,roomId:string,service?:string) {
 if(process.env.VERCEL_ENV!=="preview" && process.env.NODE_ENV!=="development")return null;
 const validId=/^[a-f0-9-]{36}$/i.test(roomId);
 if(!validId&&roomId!=="rca")throw new Error("RCV3_ROOM_REQUIRED");
 const ledger=orderLedger();
 const row=validId?await ledger.one("room_id",roomId):null;
 if(!row) {
  const legacy=await ledger.db.from("rcv3_preview_legacy_rooms").select("room_id").eq("owner_id",ownerId).limit(1);
  if(legacy.error||!legacy.data?.length)throw new Error("RCV3_PAYMENT_REQUIRED");
  if(validId) {
   const room=await ledger.db.from("rooms").select("room_owner_id").eq("id",roomId).eq("room_owner_id",ownerId).maybeSingle();
   if(room.error||!room.data)throw new Error("RCV3_NOT_FOUND");
  }
  return null;
 }
 if(row.owner_id!==ownerId)throw new Error("RCV3_NOT_FOUND");
 const entitlement=await paidRoomEntitlement(ownerId,roomId);
 if(service)requirePaidService(entitlement,service);
 return entitlement;
}
export async function guardRoomVoice(ownerId:string,roomId:unknown) {
 if(process.env.VERCEL_ENV!=="preview" && process.env.NODE_ENV!=="development")return;
 if(typeof roomId==="string" && /^[a-f0-9-]{36}$/i.test(roomId)) {
  const db=createAdminClient();
  const room=await db.from("rooms").select("room_owner_id").eq("id",roomId).eq("room_owner_id",ownerId).maybeSingle();
  if(room.error||!room.data)throw new Error("RCV3_NOT_FOUND");
  const entitlement=await guardPaidRoom(ownerId,roomId);
  requirePaidService(entitlement,"ai:openai");return;
 }
 // Old clients without a room context retain existing-account access only.
 const legacy=await createAdminClient().from("rcv3_preview_legacy_rooms").select("room_id").eq("owner_id",ownerId).limit(1);
 if(legacy.error||!legacy.data?.length)throw new Error("RCV3_ROOM_REQUIRED");
}
