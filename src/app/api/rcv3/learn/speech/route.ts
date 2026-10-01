import {z} from 'zod';
import {session,input,failure} from '@/lib/rcv3/access';
import {reserveLearning} from '@/lib/rcv3/learning/store';
import {learningLanguages} from '@/lib/locale/learning';
export const maxDuration=40;
export async function PUT(request:Request){
 try{
  const ctx=await session();
  const data=z.object({text:z.string().trim().min(1).max(3500),language:z.enum(learningLanguages),tutor:z.literal('v4-male').optional(),stream:z.literal(true).optional()}).strict().refine(d=>!d.stream||d.tutor==='v4-male').parse(await input(request,20000));
  const key=process.env.OPENAI_API_KEY;if(!key)throw Error('RCV3_AI_NOT_CONNECTED');
  await reserveLearning(ctx.user.id,'chat');
  // Fixed presentation profile: no client-selected model, voice, speed or instructions.
  // Legacy callers retain Katie's original voice and pacing.
  const male=data.tutor==='v4-male';
  const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:male?'onyx':'coral',input:data.text,instructions:male?`Read the supplied text naturally in ${data.language}, as a calm male teacher with a deep, resonant lower-register voice. Use clear, flowing speech with brief natural pauses between sentences, without long silences or drawn-out syllables. Do not rush or skip any words. Do not add commentary.`:`Read the supplied text naturally in ${data.language}. Do not add commentary.`,...(male?{speed:1.15}:{}),...(data.stream?{response_format:'pcm'}:{})}),signal:AbortSignal.any([request.signal,AbortSignal.timeout(32000)])});
  if(!response.ok)throw Error('RCV3_SPEECH');
  return new Response(response.body,{headers:{'Content-Type':data.stream?'audio/pcm':'audio/mpeg','Cache-Control':'no-store'}});
 }catch(e){return failure(e);}
}
