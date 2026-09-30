import {z} from 'zod';
import {session,input,reply,failure} from '@/lib/rcv3/access';
import {reserveLearning} from '@/lib/rcv3/learning/store';
import {avatarConfig,startAvatar,stopAvatar,receiptSession} from '@/lib/rcv3/learning/avatar';
export const maxDuration=45;
export async function GET(){try{const ctx=await session();return reply({ready:avatarConfig(ctx.user.id).ready});}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 const ctx=await session();const data=z.discriminatedUnion('action',[z.object({action:z.literal('start')}).strict(),z.object({action:z.literal('stop'),receipt:z.string().max(2000)}).strict()]).parse(await input(request,3000));
 if(data.action==='stop'){
  const key=process.env.LIVEAVATAR_API_KEY?.trim();if(!key)throw Error('RCV3_AVATAR_UNAVAILABLE');
  await stopAvatar(receiptSession(data.receipt,ctx.user.id,key),key);return reply({stopped:true});
 }
 if(!avatarConfig(ctx.user.id).ready)throw Error('RCV3_AVATAR_UNAVAILABLE');
 await reserveLearning(ctx.user.id,'chat');
 return reply(await startAvatar(ctx.user.id,request.signal));
}catch(e){return failure(e);}}
