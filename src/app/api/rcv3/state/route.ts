import { z } from "zod";
import { access, reply, failure, input, stableId } from "@/lib/rcv3/access";
import { orderLedger } from '@/lib/rcv3/checkout-ledger';
import { readState, writeState } from "@/lib/rcv3/cloud-state";
import { canManageToolbox, customerToolState, customerToolCapabilities } from '@/lib/rcv3/toolbox-authority';
export async function GET(request: Request) {
  try {
    const a = await access(new URL(request.url).searchParams.get("room") ?? "", {allowUnpaidRead:true});
    const state = await readState(a.store);
    if (!state) throw new Error("RCV3_NOT_FOUND");
    const order = canManageToolbox(a.user) ? null : await orderLedger().one('room_id',a.room.id,a.user.id);
    const baseIds = a.entitlement ? new Map(customerToolCapabilities(a.entitlement).map(tool=>[stableId(a.room.id,tool),tool])) : undefined;
    const background = state.design.backgroundAssetId ? await a.store.read(`assets/${state.design.backgroundAssetId}.txt`) : null;
    return reply({ state: canManageToolbox(a.user) ? state : customerToolState(state,a.entitlement,order?.snapshot.toolGrants,baseIds), paymentRequired:a.paymentRequired, bankPending:a.bankPending, background, language: a.user.defaultLanguage, country: a.user.countryCode });
  } catch(e) { return failure(e); }
}
export async function PUT(request: Request) {
  try {
    const d = z.object({ roomId: z.string().uuid(), revision: z.number().int(), state: z.unknown() }).strict().parse(await input(request));
    const a = await access(d.roomId);
    const { stateSchema } = await import("@/lib/rcv3/cloud-state");
    const state = stateSchema.parse(d.state);
    if(!canManageToolbox(a.user)) {
      const order=await orderLedger().one('room_id',a.room.id,a.user.id);
      const baseIds=a.entitlement ? new Map(customerToolCapabilities(a.entitlement).map(tool=>[stableId(a.room.id,tool),tool])) : undefined;
      if(customerToolState(state,a.entitlement,order?.snapshot.toolGrants,baseIds).design.buttons.length!==state.design.buttons.length)throw new Error('RCV3_TOOL_APPROVAL_REQUIRED');
    }
    if(a.entitlement) {
      if(state.secretaryRoomId || (state.gmailEnabled&&!a.entitlement.secretary) || state.design.buttons.some(b=>b.capability==="secretary"&&!a.entitlement!.secretary) || state.connectedProviders.some(p=>!a.entitlement!.providers.includes(p)))throw new Error("RCV3_SERVICE_NOT_INCLUDED");
    }
    if(state.secretaryRoomId){const linked=await a.db.from("rooms").select("id").eq("id",state.secretaryRoomId).eq("room_owner_id",a.user.id).neq("status","archived").maybeSingle();if(linked.error||!linked.data)throw new Error("RCV3_NOT_FOUND");}
    if (state.design.backgroundAssetId) await a.store.read(`assets/${state.design.backgroundAssetId}.txt`);
    return reply({ state: await writeState(a.store, d.revision, state, canManageToolbox(a.user)) });
  } catch(e) { return failure(e); }
}
