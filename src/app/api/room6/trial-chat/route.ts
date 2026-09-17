import {z} from "zod";
import {trialAccess,trialReply,trialFailure,defaultTrialProfile,trialProfileSchema} from "@/lib/rooms/room6-trial";
import {trialStore,readTrialProfile,turnSchema,type TrialTurn} from "@/lib/rooms/room6-trial-store";
import {AI_PROVIDER_IDS,type AIMessage} from "@/lib/ai/types";
import {getConnector,isProviderConfigured} from "@/lib/ai/connectors";
import {getServerDomainRuntimeContext} from "@/lib/runtime/serverDomainContext";
import {isDomainFeatureReady} from "@/config/countryResolver";
import {room6RevisionName} from "@/lib/rooms/room6-design";
export const maxDuration=120;
const input=z.object({requestId:z.string().uuid(),provider:z.enum(AI_PROVIDER_IDS),prompt:z.string().trim().min(1).max(4000)}).strict();
async function context(){const a=await trialAccess();const store=trialStore(a.db,a.user.id,a.roomId);return {...a,store,settings:await readTrialProfile(store,defaultTrialProfile(a.user.countryCode,a.user.defaultLanguage))};}
async function history(store:ReturnType<typeof trialStore>){const files=await store.list("turns",50);return (await Promise.all(files.map(f=>store.read(`turns/${f.name}`)))).map(t=>turnSchema.parse(t)).sort((a,b)=>a.at.localeCompare(b.at));}
async function body(request:Request){const raw=await request.text();if(raw.length>15000)throw new Error("TRIAL_INPUT");return JSON.parse(raw);}
export async function GET(){try{const a=await context();return trialReply({...a.settings,turns:await history(a.store)});}catch(e){return trialFailure(e);}}
export async function PUT(request:Request){try{const a=await context();const d=z.object({revision:z.number().int().min(0).max(9999999998),profile:trialProfileSchema}).strict().parse(await body(request));if(d.revision!==a.settings.revision)throw new Error("TRIAL_CONFLICT");const revision=d.revision+1;await a.store.insert(`profile/${room6RevisionName(revision)}`,d.profile);return trialReply({revision,profile:d.profile});}catch(e){return trialFailure(e);}}
export async function POST(request:Request){
 try{
  const a=await context(),d=input.parse(await body(request));
  const runtime=await getServerDomainRuntimeContext();if(!runtime||!isDomainFeatureReady(runtime,"ai"))return trialReply({error:"이 도메인에서 AI 사용이 허용되지 않습니다."},403);
  if(!isProviderConfigured(d.provider))return trialReply({error:"선택한 AI가 연결되지 않았습니다."},503);
  const turns=await history(a.store);const prior=turns.find(t=>t.requestId===d.requestId);if(prior)return trialReply(prior,prior.error?502:200);
  // Reserve before invoking: repeated requests cannot bill twice. Pending requests are never blindly replayed.
  await a.store.insert(`requests/${d.requestId}.txt`,{at:new Date().toISOString()});
  const day=new Date().toISOString().slice(0,10);let reserved=false;
  for(let n=0;n<3&&!reserved;n++){const used=await a.store.list(`budget-${day}`,101);if(used.length>=100)return trialReply({error:"시험방의 오늘 요청 한도에 도달했습니다."},429);try{await a.store.insert(`budget-${day}/${String(used.length).padStart(4,"0")}.txt`,{id:d.requestId});reserved=true;}catch(e){if(!(e instanceof Error)||e.message!=="TRIAL_CONFLICT")throw e;}}
  if(!reserved)throw new Error("TRIAL_CONFLICT");
  const p=a.settings.profile;
  const messages:AIMessage[]=[{role:"system",content:`You are the customer's Royal Command work assistant. Answer their actual question directly. Do not turn every question into a task acknowledgement. You have no external action tools; do not claim to send, book, pay, modify or complete external work. Use only supplied conversation history. Reply in ${p.language} unless requested otherwise. Country context ${p.country}; currency ${p.currency}; local time ${new Intl.DateTimeFormat("en-GB",{dateStyle:"full",timeStyle:"long",timeZone:p.timeZone}).format(new Date())}. Do not infer legal compliance from these settings.`},...turns.filter(t=>t.provider===d.provider&&!t.error).slice(-12).flatMap(t=>[{role:"user" as const,content:t.prompt},{role:"assistant" as const,content:t.answer}]),{role:"user",content:d.prompt}];
  let answer="",error=false;try{const r=await getConnector(d.provider).complete({messages,maxTokens:1500});error=Boolean(r.error)||!r.content?.trim();answer=error?"AI 응답을 받지 못했습니다. 연결 상태를 확인해 주세요.":r.content;}catch{error=true;answer="AI 요청에 실패했습니다.";}
  const turn:TrialTurn={...d,answer:answer.slice(0,50000),at:new Date().toISOString(),error};
  await a.store.insert(`turns/${Date.now()}-${d.requestId}.txt`,turn);
  return trialReply(turn,error?502:200);
 }catch(e){return trialFailure(e);}
}
