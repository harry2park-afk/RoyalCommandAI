import {z} from 'zod';
import {access,input,reply,failure} from '@/lib/rcv3/access';
import {reserve} from '@/lib/rcv3/execution';
import {requirePaidService} from '@/lib/rcv3/checkout-ledger';
import {speechTextInLanguage} from '@/lib/rcv3/speech-language';
import {meetingLanguageCodes} from '@/lib/rcv3/meeting-languages';
export const maxDuration=60;
const language=z.string().refine(v=>meetingLanguageCodes.some(c=>c===v));
const schema=z.object({roomId:z.string().uuid(),requestId:z.string().uuid(),source:language,target:language,direction:z.enum(['outgoing','incoming']),voice:z.boolean(),text:z.string().trim().max(2000).optional(),audio:z.string().max(2800000).regex(/^[A-Za-z0-9+/]+={0,2}$/).optional(),mime:z.enum(['audio/webm','audio/mp4','audio/ogg']).optional()}).strict().refine(d=>Boolean(d.text)!==Boolean(d.audio)).refine(d=>!d.audio||Boolean(d.mime));
export async function POST(request:Request){
 try{
  const d=schema.parse(await input(request,2850000));
  const a=await access(d.roomId);requirePaidService(a.entitlement??null,'ai:openai');
  const key=process.env.OPENAI_API_KEY;if(!key)throw new Error('RCV3_AI_NOT_CONNECTED');
  await reserve(a,d.requestId,'meeting-translation');
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(50000)]);
  let original=d.text??'';
  if(d.audio){
   const bytes=Buffer.from(d.audio,'base64');if(bytes.length<100||bytes.length>2000000)throw new Error('RCV3_AUDIO');
   const form=new FormData();form.set('file',new Blob([bytes],{type:d.mime}),`speech.${d.mime==='audio/mp4'?'mp4':d.mime==='audio/ogg'?'ogg':'webm'}`);form.set('model','gpt-4o-mini-transcribe');form.set('language',d.source);
   const r=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal});if(!r.ok)throw new Error('RCV3_TRANSCRIPTION');
   original=z.object({text:z.string().trim().min(1).max(2000)}).parse(await r.json()).text;
  }
  const translated=await speechTextInLanguage(original,d.target,key,signal);
  // A speech failure must not discard a successful translation.
  let audio:string|null=null;
  try{if(d.direction==='outgoing'||d.voice){const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'coral',input:translated,instructions:`Read naturally in ${d.target}.`}),signal});if(r.ok)audio=Buffer.from(await r.arrayBuffer()).toString('base64');}}catch{/* Return captions even if speech is unavailable. */}
  return reply({original,translated,audio,source:d.source,target:d.target});
 }catch(e){return failure(e);}
}
