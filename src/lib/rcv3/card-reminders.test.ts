import {describe,expect,it,vi} from 'vitest';
import type Stripe from 'stripe';
import type {LedgerOrder} from './checkout-ledger';
import {cardReminderEnvelope,currentCardReminder,expiryReminder} from './card-reminders';
vi.mock('./access',()=>({stableId:(_owner:string,key:string)=>key}));
vi.mock('./checkout-ledger',()=>({checkoutRuntime:vi.fn(),orderLedger:vi.fn()}));
const mock=vi.hoisted(()=>({billing:vi.fn()}));
vi.mock('./tool-payment',()=>({verifiedRoomBilling:mock.billing}));
const now=new Date('2026-09-22T00:00:00Z');
function stripeFixture(){
 const sub={status:'active',collection_method:'charge_automatically',default_payment_method:'pm_current',default_source:null};
 mock.billing.mockResolvedValue({customer:'cus_owner',sub});
 const pm={id:'pm_current',type:'card',livemode:false,customer:'cus_owner',card:{exp_month:9,exp_year:2026}};
 const customer={id:'cus_owner',livemode:false,invoice_settings:{default_payment_method:'pm_customer'},default_source:null};
 const stripe={customers:{retrieve:vi.fn().mockResolvedValue(customer),retrieveSource:vi.fn()},paymentMethods:{retrieve:vi.fn().mockResolvedValue(pm)}};
 return {stripe:stripe as unknown as Stripe,pm,sub,customer,retrieve:stripe.paymentMethods.retrieve};
}
describe('current card expiry reminders',()=>{
 it('treats cards as valid through end of month and limits notices to 30 days',()=>{
  expect(expiryReminder(9,2026,now)).toBe('card_expiring');expect(expiryReminder(10,2026,now)).toBeNull();
  expect(expiryReminder(8,2026,now)).toBe('card_expired');expect(expiryReminder(7,2026,now)).toBeNull();
  expect(expiryReminder(9,2026,new Date('2026-10-01T00:00:00Z'))).toBe('card_expired');
 });
 it('uses the current subscription card and suppresses reminders after replacement',async()=>{
  const m=stripeFixture();expect((await currentCardReminder(m.stripe,{} as LedgerOrder,now))?.kind).toBe('card_expiring');
  expect(m.retrieve).toHaveBeenCalledWith('pm_current');m.pm.card.exp_year=2030;
  expect(await currentCardReminder(m.stripe,{} as LedgerOrder,now)).toBeNull();
 });
 it('rejects foreign or live card data',async()=>{
  const m=stripeFixture();m.pm.customer='cus_other';await expect(currentCardReminder(m.stripe,{} as LedgerOrder,now)).rejects.toThrow('RCV3_PAYMENT_MISMATCH');
  m.pm.customer='cus_owner';m.pm.livemode=true;await expect(currentCardReminder(m.stripe,{} as LedgerOrder,now)).rejects.toThrow('RCV3_PAYMENT_MISMATCH');
 });
 it('skips cancelled subscriptions',async()=>{
  const m=stripeFixture();m.sub.status='canceled';expect(await currentCardReminder(m.stripe,{} as LedgerOrder,now)).toBeNull();expect(m.retrieve).not.toHaveBeenCalled();
 });
 it('renders only expiry data, a signed-in room link, and replacement-card guidance',()=>{
  const card={kind:'card_expiring' as const,cardId:'pm_private',month:9,year:2026,customerId:'cus_private'};
  const first=cardReminderEnvelope('owner','user@example.com','room-a','https://preview.example',card);
  expect(first.text).toContain('already received a replacement card');expect(first.text).toContain('billing=1');expect(first.text).not.toContain('pm_private');
  expect(cardReminderEnvelope('owner','user@example.com','room-a','https://preview.example',card).id).toBe(first.id);
  expect(cardReminderEnvelope('owner','user@example.com','room-b','https://preview.example',card).id).not.toBe(first.id);
 });
});
