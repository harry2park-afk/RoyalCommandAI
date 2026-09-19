import { z } from "zod";
import { access, reply, failure, input } from "@/lib/rcv3/access";
import { readState, writeState } from "@/lib/rcv3/cloud-state";
export async function GET(request: Request) {
  try {
    const a = await access(new URL(request.url).searchParams.get("room") ?? "");
    const state = await readState(a.store);
    if (!state) throw new Error("RCV3_NOT_FOUND");
    const background = state.design.backgroundAssetId ? await a.store.read(`assets/${state.design.backgroundAssetId}.txt`) : null;
    return reply({ state, background, language: a.user.defaultLanguage, country: a.user.countryCode });
  } catch(e) { return failure(e); }
}
export async function PUT(request: Request) {
  try {
    const d = z.object({ roomId: z.string().uuid(), revision: z.number().int(), state: z.unknown() }).strict().parse(await input(request));
    const a = await access(d.roomId);
    const { stateSchema } = await import("@/lib/rcv3/cloud-state");
    const state = stateSchema.parse(d.state);
    if(a.entitlement) {
      if(state.secretaryRoomId || (state.gmailEnabled&&!a.entitlement.secretary) || state.design.buttons.some(b=>b.capability==="secretary"&&!a.entitlement!.secretary) || state.connectedProviders.some(p=>!a.entitlement!.providers.includes(p)))throw new Error("RCV3_SERVICE_NOT_INCLUDED");
    }
    if(state.secretaryRoomId){const linked=await a.db.from("rooms").select("id").eq("id",state.secretaryRoomId).eq("room_owner_id",a.user.id).neq("status","archived").maybeSingle();if(linked.error||!linked.data)throw new Error("RCV3_NOT_FOUND");}
    if (state.design.backgroundAssetId) await a.store.read(`assets/${state.design.backgroundAssetId}.txt`);
    return reply({ state: await writeState(a.store, d.revision, state) });
  } catch(e) { return failure(e); }
}
