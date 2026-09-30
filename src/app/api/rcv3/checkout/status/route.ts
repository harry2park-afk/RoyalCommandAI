import { z } from "zod";
import { session, input, reply, failure } from "@/lib/rcv3/access";
import { orderLedger, fulfillOrder } from "@/lib/rcv3/checkout-ledger";
export const maxDuration = 60;
export async function POST(request:Request) {
 try {
  const {user} = await session();
  const d = z.object({draftId:z.string().uuid()}).strict().parse(await input(request,1000));
  const ledger=orderLedger(), row=await ledger.one("draft_id",d.draftId,user.id);
  if(!row)throw new Error("RCV3_NOT_FOUND");
  // Return URL session/payment fields are never trusted or used for lookup.
  return reply(await fulfillOrder(row,ledger));
 } catch(e) {return failure(e);}
}
