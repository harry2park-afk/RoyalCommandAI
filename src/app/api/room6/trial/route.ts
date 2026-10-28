import { trialAccess, trialId, TRIAL_MARKER, trialReply, trialFailure } from "@/lib/rooms/room6-trial";
export async function POST(){
  try{
    const {user,db,roomId,room}=await trialAccess(false);
    const householdId=trialId(user.id,"household");
    if(!room){
      const h=await db.from("households").insert({id:householdId,owner_id:user.id,name:"Room6 Private Preview",household_type:"individual"});
      if(h.error&&h.error.code!=="23505")throw new Error("TRIAL_HOUSEHOLD");
      const owned=await db.from("households").select("id,owner_id,household_type").eq("id",householdId).eq("owner_id",user.id).maybeSingle();
      if(owned.error||!owned.data||owned.data.household_type!=="individual")throw new Error("TRIAL_IDENTITY");
      const created=await db.from("rooms").insert({id:roomId,household_id:householdId,room_owner_id:user.id,name:"Room6 · 새 시험방",description:TRIAL_MARKER,status:"draft"});
      if(created.error&&created.error.code!=="23505")throw new Error("TRIAL_CREATE");
    }
    await trialAccess(); // Verify duplicate/retry target before returning.
    return trialReply({roomId,url:"/room6/trial",status:"draft"});
  }catch(e){return trialFailure(e);}
}
