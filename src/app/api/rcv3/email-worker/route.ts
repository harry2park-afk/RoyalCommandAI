import { reply,failure } from '@/lib/rcv3/access';
import { orderLedger,type LedgerOrder } from '@/lib/rcv3/checkout-ledger';
import { EMAIL_TABLE,emailReady,requireEmailWorker,deliverNotice,type EmailNotice } from '@/lib/rcv3/email-outbox';
import { enqueueCardReminder,validateCardNotice } from '@/lib/rcv3/card-reminders';
export const maxDuration=60;
// The scheduler must call this Preview endpoint with its dedicated secret.
// No Production cron is installed or customer emails enabled by deployment.
export async function POST(request:Request){try{
 requireEmailWorker(request);if(!emailReady())throw new Error('RCV3_EMAIL_NOT_READY');
 const {db}=orderLedger();
 const progress=await db.from('rcv3_preview_email_worker_state').select('cursor_id').eq('id','card_sweep').single();
 if(progress.error)throw new Error('RCV3_STORAGE');
 let query=db.from('rcv3_preview_orders').select('*').not('activated_at','is',null).order('id').limit(5);
 if(progress.data.cursor_id)query=query.gt('id',progress.data.cursor_id);
 const orders=await query;if(orders.error)throw new Error('RCV3_STORAGE');
 let sweepErrors=0;
 for(const row of (orders.data??[]) as LedgerOrder[]){try{await enqueueCardReminder(row);}catch{sweepErrors++;}}
 const next=orders.data.length===5?orders.data.at(-1)!.id:null;
 const saved=await db.from('rcv3_preview_email_worker_state').update({cursor_id:next,updated_at:new Date().toISOString(),last_error:sweepErrors?'RCV3_CARD_SWEEP_PARTIAL':null}).eq('id','card_sweep');
 if(saved.error)throw new Error('RCV3_STORAGE');
 const pending=await db.from(EMAIL_TABLE).select('*').in('status',['approved','sending']).order('created_at').limit(3);
 if(pending.error)throw new Error('RCV3_STORAGE');
 let deliveryErrors=0;
 for(const row of (pending.data??[]) as EmailNotice[]){try{await deliverNotice(row,validateCardNotice,db);}catch{deliveryErrors++;}}
 return reply({scanned:orders.data.length,processed:pending.data.length,sweepErrors,deliveryErrors});
}catch(e){return failure(e);}}
