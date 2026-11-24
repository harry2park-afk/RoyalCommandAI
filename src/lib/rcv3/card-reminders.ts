import type Stripe from 'stripe';
import { z } from 'zod';
import { stableId } from './access';
import { checkoutRuntime,orderLedger,type LedgerOrder } from './checkout-ledger';
import { verifiedRoomBilling } from './tool-payment';
import { EMAIL_TABLE,emailSender,type EmailNotice } from './email-outbox';
import { emailDigest,type EmailEnvelope } from './email-approval';
const idOf=(value:string|{id:string}|null|undefined)=>typeof value==='string'?value:value?.id;
export type CardReminder={kind:'card_expiring'|'card_expired';cardId:string;month:number;year:number;customerId:string};
export function expiryReminder(month:number,year:number,now=new Date()):CardReminder['kind']|null{
 if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<2000)return null;
 // A card is valid through the final day of its expiry month.
 const until=Date.UTC(year,month,1)-now.getTime();
 if(until>0&&until<=30*86400000)return 'card_expiring';
 if(until<=0&&until>=-30*86400000)return 'card_expired';
 return null;
}
export async function currentCardReminder(stripe:Stripe,row:LedgerOrder,now=new Date()):Promise<CardReminder|null>{
 const {customer,sub}=await verifiedRoomBilling(stripe,row,row.owner_id);
 if(!['active','past_due','unpaid'].includes(sub.status)||sub.collection_method!=='charge_automatically')return null;
 const c=await stripe.customers.retrieve(customer);
 if(c.deleted||c.livemode)throw new Error('RCV3_PAYMENT_MISMATCH');
 let method=sub.default_payment_method;
 // Subscription source takes precedence over a customer default method.
 let source=sub.default_source;
 if(!method&&!source){method=c.invoice_settings.default_payment_method;source=c.default_source;}
 let card:{exp_month:number;exp_year:number}|null=null,cardId='';
 if(method){
  const pm=await stripe.paymentMethods.retrieve(idOf(method)!);
  if(pm.livemode||idOf(pm.customer)!==customer)throw new Error('RCV3_PAYMENT_MISMATCH');
  if(pm.type!=='card'||!pm.card)return null;
  card=pm.card;cardId=pm.id;
 }else if(source){
  const s=await stripe.customers.retrieveSource(customer,idOf(source)!);
  if(s.object!=='card')return null;
  if(idOf(s.customer)!==customer)throw new Error('RCV3_PAYMENT_MISMATCH');
  card=s;cardId=s.id;
 }
 if(!card)return null;
 const kind=expiryReminder(card.exp_month,card.exp_year,now);
 return kind?{kind,cardId,month:card.exp_month,year:card.exp_year,customerId:customer}:null;
}
export function cardReminderEnvelope(ownerId:string,recipient:string,roomId:string,origin:string,card:CardReminder):EmailEnvelope{
 const id=stableId(ownerId,`card-reminder:${roomId}:${card.customerId}:${card.cardId}:${card.year}:${card.month}:${card.kind}`);
 const link=new URL('/rcv3',origin);link.searchParams.set('room',roomId);link.searchParams.set('billing','1');
 return {id,recipients:[z.string().email().parse(recipient)],subject:card.kind==='card_expiring'?'RC: Your saved card expires soon':'RC: Please update your expired card',text:`The saved payment card for this RC room ${card.kind==='card_expiring'?'expires':'expired'} in ${String(card.month).padStart(2,'0')}/${card.year}.\n\nIf you have already received a replacement card, please update the card saved for your RC payments. Otherwise, contact your card issuer if you need a replacement.\n\nSign in to RC to update your payment method:\n${link.toString()}\n\nRC will never ask you to email your card number or CVV.`};
}
async function candidate(row:LedgerOrder,now=new Date()){
 const {stripe,catalog,origin}=checkoutRuntime();
 if(row.snapshot.accountId!==catalog.accountId||row.snapshot.origin!==origin||!row.activated_at)return null;
 const card=await currentCardReminder(stripe,row,now);if(!card)return null;
 const account=await orderLedger().db.auth.admin.getUserById(row.owner_id);
 if(account.error)throw new Error('RCV3_STORAGE');
 const user=account.data.user;
 if(!user?.email||!user.email_confirmed_at)return null;
 return {card,envelope:cardReminderEnvelope(row.owner_id,user.email,row.room_id,origin,card)};
}
// No public request accepts a card category, provider data, or recipient.
export async function enqueueCardReminder(row:LedgerOrder,now=new Date()){
 const value=await candidate(row,now);if(!value)return;
 const r=await orderLedger().db.from(EMAIL_TABLE).insert({id:value.envelope.id,envelope:value.envelope,sender:emailSender(),kind:value.card.kind,order_id:row.id,status:'approved'});
 if(r.error&&r.error.code!=='23505')throw new Error('RCV3_STORAGE');
}
export async function validateCardNotice(notice:EmailNotice){
 if(!notice.order_id||!['card_expiring','card_expired'].includes(notice.kind))return false;
 const row=await orderLedger().one('id',notice.order_id);if(!row)return false;
 const current=await candidate(row);
 // Recipient change, replacement card, new expiry, cancellation, or altered
// notice text cancels this queued reminder instead of sending stale advice.
 return !!current&&current.card.kind===notice.kind&&emailDigest(current.envelope)===emailDigest(notice.envelope);
}
