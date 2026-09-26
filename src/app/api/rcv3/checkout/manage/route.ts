import {z} from 'zod';
import {session,input,reply,failure} from '@/lib/rcv3/access';
import {orderLedger,checkoutRuntime} from '@/lib/rcv3/checkout-ledger';
import {roomPaymentLink} from '@/lib/rcv3/tool-payment';
export async function POST(request:Request){
 try{
  const {user}=await session();
  const {roomId,action}=z.object({roomId:z.string().uuid(),action:z.enum(['payment','card']).default('payment')}).strict().parse(await input(request,1000));
  const row=await orderLedger().one('room_id',roomId,user.id);
  if(!row)throw new Error('RCV3_NOT_FOUND');
  const {stripe,catalog,origin}=checkoutRuntime();
  if(row.snapshot.accountId!==catalog.accountId)throw new Error('RCV3_PAYMENT_ACCOUNT');
  return reply({url:await roomPaymentLink(stripe,row,user.id,origin,action)});
 }catch(error){return failure(error);}
}
