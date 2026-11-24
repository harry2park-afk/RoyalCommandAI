import { checkoutRuntime, orderLedger, fulfillOrder } from "@/lib/rcv3/checkout-ledger";
import { verifyTestWebhook } from "@/lib/rcv3/stripe-checkout";
import { reply, failure } from "@/lib/rcv3/access";
export const maxDuration=60;
export async function POST(request:Request) {
 try {
  const {stripe}=checkoutRuntime();
  if(Number(request.headers.get("content-length")||0)>1000000)throw new Error("RCV3_WEBHOOK_INVALID");
  const event=verifyTestWebhook(stripe,await request.text(),request.headers.get("stripe-signature")||"",process.env.RCV3_STRIPE_WEBHOOK_SECRET||"");
  // Renewals are checked against CURRENT subscription/invoice on each service
  // access. We never extend service from an old or out-of-order event snapshot.
  if(event.type!=="checkout.session.completed" && event.type!=="checkout.session.async_payment_succeeded")return reply({received:true});
  const session=event.data.object;
  const ledger=orderLedger();
  let row=await ledger.one("session_id",session.id);
  if(!row && session.metadata?.rcv3_order) {
   row=await ledger.one("id",session.metadata.rcv3_order);
   // Recover the exact server-created idempotent session after a lost response.
   // Full metadata/price/subscription checks still run before any room writes.
   if(row && !row.session_id && session.client_reference_id===row.id && session.metadata.rcv3_owner===row.owner_id && session.metadata.rcv3_hash===row.snapshot.order.draftHash && session.metadata.rcv3_draft===row.draft_id) row=await ledger.bindSession(row,session.id);
  }
  if(!row) return reply({received:true});
  if(row.session_id!==session.id)throw new Error("RCV3_PAYMENT_MISMATCH");
  await fulfillOrder(row,ledger);
  return reply({received:true});
 } catch(e) {return failure(e);}
}
