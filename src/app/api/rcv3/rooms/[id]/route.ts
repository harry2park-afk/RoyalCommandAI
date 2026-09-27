import {z} from "zod";
import {session,RCV3_MARKER,reply,failure} from "@/lib/rcv3/access";

export async function DELETE(_request:Request,context:{params:Promise<{id:string}>}) {
  try {
    const {user,db}=await session();
    const {id}=await context.params;
    const roomId=z.string().uuid().parse(id).toLowerCase();
    const existing=await db.from("rooms").select("id,status").eq("id",roomId).eq("room_owner_id",user.id).eq("description",RCV3_MARKER).maybeSingle();
    if(existing.error)throw new Error("RCV3_STORAGE");
    if(!existing.data)throw new Error("RCV3_NOT_FOUND");
    if(existing.data.status==="archived")return reply({ok:true,id:roomId});
    const result=await db.from("rooms").update({status:"archived",updated_at:new Date().toISOString()}).eq("id",roomId).eq("room_owner_id",user.id).eq("description",RCV3_MARKER).eq("status","draft").select("id").maybeSingle();
    if(result.error)throw new Error("RCV3_STORAGE");
    if(!result.data)throw new Error("RCV3_NOT_FOUND");
    return reply({ok:true,id:roomId});
  } catch(e) {return failure(e);}
}
// Restoring a preserved room makes it available for review without changing
// its payment ledger, token charge, stored state, or design assets.
export async function PATCH(_request:Request,context:{params:Promise<{id:string}>}) {
  try {
    const {user,db}=await session();
    const {id}=await context.params;
    const roomId=z.string().uuid().parse(id).toLowerCase();
    const result=await db.from("rooms").update({status:"draft",updated_at:new Date().toISOString()})
      .eq("id",roomId).eq("room_owner_id",user.id).eq("description",RCV3_MARKER).eq("status","archived").select("id").maybeSingle();
    if(result.error)throw new Error("RCV3_STORAGE");
    if(!result.data)throw new Error("RCV3_NOT_FOUND");
    return reply({ok:true,id:roomId});
  } catch(e) {return failure(e);}
}
