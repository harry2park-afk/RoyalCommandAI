import {expect,it,vi} from 'vitest';
import type Stripe from 'stripe';
import type {LedgerOrder} from './checkout-ledger';
import {roomPaymentLink} from './tool-payment';
const row={owner_id:'owner',room_id:'room',session_id:'cs_test_fixture',subscription_id:'sub_fixture',snapshot:{order:{id:'order',ownerId:'owner',draftId:'draft',draftHash:'hash'}}} as LedgerOrder;
function mock(){
 const metadata={rcv3_owner:'owner',rcv3_order:'order',rcv3_draft:'draft',rcv3_hash:'hash'};
 const session={livemode:false,client_reference_id:'order',metadata,customer:'cus_owner',subscription:'sub_fixture'};
 const invoice={livemode:false,status:'open',amount_remaining:1000,customer:'cus_owner',hosted_invoice_url:'https://invoice.stripe.com/i/test'};
 const sub={livemode:false,metadata,customer:'cus_owner',latest_invoice:invoice};
 const stripe={checkout:{sessions:{retrieve:vi.fn().mockResolvedValue(session)}},subscriptions:{retrieve:vi.fn().mockResolvedValue(sub)},billingPortal:{sessions:{create:vi.fn().mockResolvedValue({url:'https://billing.stripe.com/p/session'})}}};
 return {stripe:stripe as unknown as Stripe,session,sub,portal:stripe.billingPortal.sessions.create};
}
it('opens the existing unpaid invoice without creating a duplicate subscription or charging',async()=>{
 const m=mock();expect(await roomPaymentLink(m.stripe,row,'owner','https://preview.example')).toBe('https://invoice.stripe.com/i/test');expect(m.portal).not.toHaveBeenCalled();
});
it('never opens another customer payment page or a live-mode session',async()=>{
 const m=mock();await expect(roomPaymentLink(m.stripe,row,'attacker','https://preview.example')).rejects.toThrow('RCV3_PAYMENT_MISMATCH');
 m.session.livemode=true;await expect(roomPaymentLink(m.stripe,row,'owner','https://preview.example')).rejects.toThrow('RCV3_PAYMENT_MISMATCH');
});
it('uses the saved Stripe customer for billing management and preserves the room return URL',async()=>{
 const m=mock();m.sub.latest_invoice.status='paid';
 expect(await roomPaymentLink(m.stripe,row,'owner','https://preview.example')).toBe('https://billing.stripe.com/p/session');
 expect(m.portal).toHaveBeenCalledWith({customer:'cus_owner',return_url:'https://preview.example/rcv3?room=room'});
});
it('rejects swapped Stripe customer and untrusted payment URLs',async()=>{
 const m=mock();m.sub.customer='cus_other';await expect(roomPaymentLink(m.stripe,row,'owner','https://preview.example')).rejects.toThrow('RCV3_PAYMENT_MISMATCH');
 m.sub.customer='cus_owner';m.sub.latest_invoice.status='paid';m.portal.mockResolvedValue({url:'https://attacker.invalid'});
 await expect(roomPaymentLink(m.stripe,row,'owner','https://preview.example')).rejects.toThrow('RCV3_PAYMENT_RESPONSE');
});
it('Update Card opens billing management even when an unpaid invoice exists',async()=>{
 const m=mock();expect(await roomPaymentLink(m.stripe,row,'owner','https://preview.example','card')).toBe('https://billing.stripe.com/p/session');expect(m.portal).toHaveBeenCalledOnce();
});
