import type Stripe from 'stripe';
import type { LedgerOrder } from './checkout-ledger';

const idOf = (value: string | {id:string} | null) => typeof value === 'string' ? value : value?.id;
export async function verifiedRoomBilling(stripe:Stripe, row:LedgerOrder, ownerId:string) {
  if(row.owner_id!==ownerId || row.snapshot.order.ownerId!==ownerId || !row.session_id?.startsWith('cs_test_'))throw new Error('RCV3_PAYMENT_MISMATCH');
  const session=await stripe.checkout.sessions.retrieve(row.session_id);
  const order=row.snapshot.order;
  if(session.livemode || session.metadata?.rcv3_owner!==ownerId || session.metadata.rcv3_order!==order.id || session.client_reference_id!==order.id || session.metadata.rcv3_hash!==order.draftHash || session.metadata.rcv3_draft!==order.draftId)throw new Error('RCV3_PAYMENT_MISMATCH');
  const customer=idOf(session.customer),subscription=idOf(session.subscription);
  if(!customer || !subscription || (row.subscription_id && row.subscription_id!==subscription))throw new Error('RCV3_PAYMENT_MISMATCH');
  const sub=await stripe.subscriptions.retrieve(subscription,{expand:['latest_invoice']});
  if(sub.livemode || idOf(sub.customer)!==customer || sub.metadata.rcv3_owner!==ownerId || sub.metadata.rcv3_order!==order.id)throw new Error('RCV3_PAYMENT_MISMATCH');
  return {customer,sub};
}
export async function roomPaymentLink(stripe:Stripe,row:LedgerOrder,ownerId:string,origin:string,action:'payment'|'card'='payment') {
  const {customer,sub}=await verifiedRoomBilling(stripe,row,ownerId);
  const invoice=typeof sub.latest_invoice==='object'?sub.latest_invoice:null;
  if(action==='payment' && invoice && !invoice.livemode && invoice.status==='open' && invoice.amount_remaining>0 && idOf(invoice.customer)===customer && invoice.hosted_invoice_url && new URL(invoice.hosted_invoice_url).origin==='https://invoice.stripe.com')return invoice.hosted_invoice_url;
  // Stripe manages renewal/dunning. No new room or duplicate subscription.
  const portal=await stripe.billingPortal.sessions.create({customer,return_url:`${origin}/rcv3?room=${row.room_id}`});
  if(new URL(portal.url).origin!=='https://billing.stripe.com')throw new Error('RCV3_PAYMENT_RESPONSE');
  return portal.url;
}
