import { session, RCV3_MARKER, reply, failure } from "@/lib/rcv3/access";
export async function GET(request:Request) {
  try {
    const { user, db } = await session();
    const params=new URL(request.url).searchParams;
    const offset=Number(params.get("offset")||0);
    const query=(params.get("q")||"").trim();
    if(!Number.isSafeInteger(offset)||offset<0||offset>100000||query.length>80)return reply({code:"RCV3_QUERY"},400);
    let list=db.from("rooms").select("id,name").eq("room_owner_id", user.id).eq("description", RCV3_MARKER).eq("status", "draft").order("created_at", { ascending: false }).order("id", {ascending:false});
    if(query)list=list.ilike("name",`%${query.replace(/[\\%_]/g,"\\$&")}%`);
    const r=await list.range(offset,offset+100);
    if (r.error) throw new Error("RCV3_STORAGE");
    return reply({ rooms: (r.data ?? []).slice(0,100),hasMore:(r.data?.length??0)>100 });
  } catch(e) { return failure(e); }
}
// Old clients cannot bypass the form, consent or first-payment verification.
export async function POST() {
  try { await session(); return reply({code:"RCV3_CHECKOUT_REQUIRED",url:"/rcv3/create",error:"Complete Create Room and payment first."},402); }
  catch(e) {return failure(e);}
}
