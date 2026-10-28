import {createHash} from "node:crypto";
import {trialAccess,trialReply,trialFailure,defaultTrialProfile} from "@/lib/rooms/room6-trial";
import {trialStore,readTrialProfile} from "@/lib/rooms/room6-trial-store";
import {getServerDomainRuntimeContext} from "@/lib/runtime/serverDomainContext";
import {isDomainFeatureReady} from "@/config/countryResolver";
import {logger} from "@/lib/logger";
export const maxDuration=30;
export async function POST(){
 const requestId=crypto.randomUUID();
 try{
  const a=await trialAccess(),runtime=await getServerDomainRuntimeContext();
  if(!runtime||!isDomainFeatureReady(runtime,"ai"))return trialReply({error:"음성 사용이 허용되지 않습니다."},403);
  const key=process.env.OPENAI_API_KEY;if(!key)return trialReply({error:"음성 서비스 설정이 없습니다.",code:"VOICE_CONFIG"},503);
  const store=trialStore(a.db,a.user.id,a.roomId),{profile}=await readTrialProfile(store,defaultTrialProfile(a.user.countryCode,a.user.defaultLanguage));
  // One mint per 30 seconds per owner; atomic across function instances.
  await store.insert(`voice-budget/${Math.floor(Date.now()/30000)}.txt`,{requestId});
  const language=profile.language.toLowerCase().startsWith("zh-")?profile.language.toLowerCase():profile.language.split("-")[0].toLowerCase();
  logger.info("room6.voice.token_started",{requestId});
  const r=await fetch("https://api.openai.com/v1/realtime/client_secrets",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","OpenAI-Safety-Identifier":createHash("sha256").update(a.user.id).digest("hex")},body:JSON.stringify({expires_after:{anchor:"created_at",seconds:60},session:{type:"transcription",audio:{input:{transcription:{model:"gpt-live-transcribe",languages:[language],delay:"low"},turn_detection:{type:"server_vad",threshold:0.45,prefix_padding_ms:300,silence_duration_ms:1800}}}}}),signal:AbortSignal.timeout(15000),cache:"no-store"});
  if(!r.ok){logger.warn("room6.voice.token_failed",{requestId,status:r.status});return trialReply({error:"외부 음성 인증에 실패했습니다.",code:`VOICE_TOKEN_${r.status}`,requestId},502);}
  const d=await r.json();if(typeof d.value!=="string"||!d.value)throw new Error("TRIAL_VOICE_TOKEN");
  logger.info("room6.voice.token_ready",{requestId});return trialReply({value:d.value,requestId});
 }catch(e){if(e instanceof Error&&["TimeoutError","AbortError"].includes(e.name)){logger.warn("room6.voice.token_timeout",{requestId});return trialReply({error:"음성 인증 서버 응답 시간이 초과됐습니다.",code:"VOICE_TOKEN_TIMEOUT",requestId},504);}return trialFailure(e);}
}
