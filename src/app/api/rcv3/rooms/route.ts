import { roomTemplates, templateImage } from "@/lib/rcv3/templates";
import { z } from "zod";
import { session, access, stableId, RCV3_MARKER, reply, failure, input } from "@/lib/rcv3/access";
import { cloudStore, readState, revisionFile, stateSchema, designSchema } from "@/lib/rcv3/cloud-state";
import { defaultDesign } from "../../../../../rcv3/core.mjs";
import { portableRoomState } from "@/lib/rcv3/portable-copy";
export async function GET() {
  try {
    const { user, db } = await session();
    const r = await db.from("rooms").select("id,name").eq("room_owner_id", user.id).eq("description", RCV3_MARKER).eq("status", "draft").order("created_at", { ascending: false }).limit(100);
    if (r.error) throw new Error("RCV3_STORAGE");
    return reply({ rooms: r.data ?? [] });
  } catch(e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    const d = z.object({ requestId: z.string().uuid(), name: z.string().trim().min(1).max(80), sourceRoom: z.string().uuid().optional(), templateId: z.string().optional() }).strict().parse(await input(request, 1000));
    const { user, db } = await session();
    const roomId = stableId(user.id, `room:${d.requestId.toLowerCase()}`), householdId = stableId(user.id, "household");
    const source = d.sourceRoom ? await access(d.sourceRoom) : null;
    const sourceState = source ? await readState(source.store) : null;
    if (source && !sourceState) throw new Error("RCV3_NOT_FOUND");
    const template = d.templateId ? roomTemplates.find(t=>t.id===d.templateId) : null;
    if(d.templateId&&!template)throw new Error("RCV3_TEMPLATE");
    const image = template ? templateImage(template) : "";
    const design = designSchema.parse(template ? {backgroundAssetId:image?stableId(roomId,"template-background"):null,buttons:(["chat","secretary","files"] as const).map((capability,i)=>({id:stableId(roomId,capability),capability,label:capability==="chat"?"My AI":capability==="secretary"?"Katie":"Files",x:8+i*30,y:12,width:24,height:12,opacity:1}))} : defaultDesign());
    const state = sourceState && !template
      ? portableRoomState(sourceState, d.name, index => stableId(roomId, `button:${index}`))
      : stateSchema.parse({ revision: 1, release: "rcv3-1", name: d.name, design,
        connectedProviders: ["openai"], selectedProviders: ["openai"], secretaryRoomId: null,
        appearances: {}, bindings: Object.fromEntries(design.buttons.map(b => [b.id, b.capability])) });
    const h = await db.from("households").insert({ id: householdId, owner_id: user.id, name: "RCV3 Private Preview", household_type: "individual" });
    if (h.error && h.error.code !== "23505") throw new Error("RCV3_STORAGE");
    const owner = await db.from("households").select("owner_id").eq("id", householdId).eq("owner_id", user.id).maybeSingle();
    if (owner.error || !owner.data) throw new Error("RCV3_NOT_FOUND");
    const created = await db.from("rooms").insert({ id: roomId, household_id: householdId, room_owner_id: user.id, name: d.name, description: RCV3_MARKER, status: "draft" });
    if (created.error && created.error.code !== "23505") throw new Error("RCV3_STORAGE");
    const verified = await access(roomId), store = cloudStore(db, user.id, roomId);
    if (!await readState(store)) {
      // Only catalogue images are portable; never read/copy a customer's asset.
      if (image && state.design.backgroundAssetId) {
        try {await store.insert(`assets/${state.design.backgroundAssetId}.txt`,{data:image});}
        catch(e){if(!(e instanceof Error)||e.message!=="RCV3_CONFLICT")throw e;}
      }
      try { await store.insert(revisionFile(1), state); }
      catch(e) { if (!(e instanceof Error) || e.message !== "RCV3_CONFLICT") throw e; }
    }
    if (!await readState(verified.store)) throw new Error("RCV3_STORAGE");
    return reply({ roomId, url: `/rcv3?room=${roomId}` });
  } catch(e) { return failure(e); }
}
