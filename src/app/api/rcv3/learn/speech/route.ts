import {z} from 'zod';
import {session,input,failure} from '@/lib/rcv3/access';
import {reserveLearning} from '@/lib/rcv3/learning/store';
import {learningLanguages} from '@/lib/locale/learning';
export const maxDuration=40;
export async function PUT(request:Request){
 try{
  const ctx=await session();
  const data=z.object({text:z.string().trim().min(1).max(3500),language:z.enum(learningLanguages)}).strict().parse(await input(request,20000));
  const key=process.env.OPENAI_API_KEY;if(!key)throw Error('RCV3_AI_NOT_CONNECTED');
  await reserveLearning(ctx.user.id,'chat');
  const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'coral',input:data.text,instructions:`Read the supplied text naturally in ${data.language}. Do not add commentary.`}),signal:AbortSignal.any([request.signal,AbortSignal.timeout(32000)])});
  if(!response.ok)throw Error('RCV3_SPEECH');
  return new Response(response.body,{headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-store'}});
 }catch(e){return failure(e);}
}
