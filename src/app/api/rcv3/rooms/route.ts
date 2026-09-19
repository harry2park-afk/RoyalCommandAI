import { session, RCV3_MARKER, reply, failure } from "@/lib/rcv3/access";
export async function GET() {
  try {
    const { user, db } = await session();
    const r = await db.from("rooms").select("id,name").eq("room_owner_id", user.id).eq("description", RCV3_MARKER).eq("status", "draft").order("created_at", { ascending: false }).limit(100);
    if (r.error) throw new Error("RCV3_STORAGE");
    return reply({ rooms: r.data ?? [] });
  } catch(e) { return failure(e); }
}
// Old clients cannot bypass the form, consent or first-payment verification.
export async function POST() {
  try { await session(); return reply({code:"RCV3_CHECKOUT_REQUIRED",url:"/rcv3/create",error:"Complete Create Room and payment first."},402); }
  catch(e) {return failure(e);}
}
