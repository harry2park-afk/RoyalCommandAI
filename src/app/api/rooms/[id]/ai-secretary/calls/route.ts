import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {id:roomId}=await context.params,db=await createClient();
 const {data:room}=await db.from("rooms").select("id,room_owner_id").eq("id",roomId).maybeSingle();
 if(!room)return NextResponse.json({error:"Room not found"},{status:404});
 if(room.room_owner_id!==user.id){
  const {data:member}=await db.from("room_members").select("id").eq("room_id",roomId).eq("user_id",user.id).maybeSingle();
  if(!member)return NextResponse.json({error:"Forbidden"},{status:403});
 }
 const {data,error}=await db.from("activity_events").select("id,payload,created_at").eq("room_id",roomId)
  .eq("event_type","ai_secretary.retell_post_call").order("created_at",{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:"Unable to load calls"},{status:500});
 const merged=new Map<string,Record<string,unknown>>();
 for(const row of data??[]){const p=row.payload&&typeof row.payload==="object"?row.payload as Record<string,unknown>:{};const id=typeof p.call_id==="string"?p.call_id:row.id;merged.set(id,{...(merged.get(id)??{}),...p,id:row.id,created_at:row.created_at});}
 return NextResponse.json({calls:Array.from(merged.values())},{headers:{"Cache-Control":"private, no-store"}});
}
