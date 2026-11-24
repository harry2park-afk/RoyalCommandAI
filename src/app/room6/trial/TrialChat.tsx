"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {Mic,Square,Send} from "lucide-react";
import type {AIProviderId} from "@/lib/ai/types";
import type {TrialProfile} from "@/lib/rooms/room6-trial";
import type {TrialTurn} from "@/lib/rooms/room6-trial-store";
import {COUNTRY_ROOM_PRESETS} from "@/lib/rooms/countryPresets";
import {RealtimeSecretaryVoiceSession} from "@/lib/ai-secretary/realtime-voice-session";
export default function TrialChat({roomId,providers,initialProfile}:{roomId:string;providers:{id:AIProviderId;label:string}[];initialProfile:TrialProfile}){
 const [profile,setProfile]=useState(initialProfile),[draft,setDraft]=useState(initialProfile),[revision,setRevision]=useState(0);
 const [provider,setProvider]=useState<AIProviderId|"">(providers[0]?.id||""),[turns,setTurns]=useState<TrialTurn[]>([]);
 const [text,setText]=useState(""),[status,setStatus]=useState(""),[error,setError]=useState(""),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[voice,setVoice]=useState(false),[settings,setSettings]=useState(false);
 const session=useRef<RealtimeSecretaryVoiceSession|null>(null),lock=useRef(false),alive=useRef(true),request=useRef<AbortController|null>(null),bottom=useRef<HTMLDivElement>(null);
 useEffect(()=>{alive.current=true;const c=new AbortController();fetch("/api/room6/trial-chat",{cache:"no-store",signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);if(alive.current){setProfile(d.profile);setDraft(d.profile);setRevision(d.revision);setTurns(d.turns);setLoaded(true);}}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>{alive.current=false;c.abort();session.current?.stop();request.current?.abort();};},[]);
 useEffect(()=>{const hide=()=>{if(document.hidden)session.current?.stop("음성 대화를 종료했습니다.");};document.addEventListener("visibilitychange",hide);return()=>document.removeEventListener("visibilitychange",hide);},[]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:"nearest"});},[turns,text,status]);
 async function send(prompt:string){
  if(lock.current||!provider||!loaded||!prompt.trim())throw new Error("Not ready");
  lock.current=true;setBusy(true);setError("");setStatus("AI 답변을 기다리고 있습니다…");
  const controller=new AbortController();request.current=controller;const timer=setTimeout(()=>controller.abort(),110000);
  try{const r=await fetch("/api/room6/trial-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:crypto.randomUUID(),provider,prompt}),signal:controller.signal});const d=await r.json();if(!alive.current)throw new Error("Closed");if(d.requestId&&typeof d.answer==="string")setTurns(t=>[...t,d]);if(!r.ok)throw new Error(d.error===true?d.answer:d.error||"AI 응답 실패");setText("");setStatus("답변을 저장했습니다.");return d.answer as string;}catch(e){if(alive.current){setError(e instanceof Error&&e.name!=="AbortError"?e.message:"응답 시간이 초과됐습니다. 재접속하여 저장 결과를 확인해 주세요.");setStatus("");}throw e;}finally{clearTimeout(timer);lock.current=false;if(alive.current)setBusy(false);}
 }
 function microphone(){
  if(session.current){session.current.stop();session.current=null;return;}
  setError("");setVoice(true);
  let prefix=text.trim();
  const v=new RealtimeSecretaryVoiceSession({language:profile.language,answerTimeoutMs:115000,speakerLabel:providers.find(p=>p.id===provider)?.label||"AI",
   negotiate:async(sdp,signal)=>{
    const tokenResponse=await fetch("/api/room6/voice-token",{method:"POST",signal});const token=await tokenResponse.json();
    if(!tokenResponse.ok){const message=token.error||"음성 인증 실패";if(alive.current)setError(`${message} (${token.code||tokenResponse.status})`);throw new Error("Voice token failed");}
    // Only an expiring session credential, held in memory; never stored or logged.
    const r=await fetch("https://api.openai.com/v1/realtime/calls",{method:"POST",headers:{Authorization:`Bearer ${token.value}`,"Content-Type":"application/sdp"},body:sdp,signal});
    if(!r.ok&&alive.current)setError(`음성 직접 연결 실패 (VOICE_DIRECT_${r.status})`);return r;
   },onMessage:async t=>{const answer=await send([prefix,t].filter(Boolean).join(" "));prefix="";return answer;},onTranscript:t=>{if(alive.current)setText([prefix,t].filter(Boolean).join(" "));},onStatus:t=>{if(alive.current)setStatus(t);},onStop:t=>{session.current=null;if(alive.current){setVoice(false);setStatus(t);}},
  });session.current=v;void v.start();
 }
 async function saveProfile(){setBusy(true);setError("");try{const r=await fetch("/api/room6/trial-chat",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision,profile:draft})});const d=await r.json();if(!r.ok)throw new Error(d.error);setProfile(d.profile);setRevision(d.revision);setSettings(false);setStatus("국가·언어 설정을 저장했습니다.");}catch(e){setError(e instanceof Error?e.message:"설정 저장 실패");}finally{setBusy(false);}}
 return <section className="mx-auto max-w-6xl rounded-2xl border border-amber-300/40 p-4">
  <div className="mb-4 flex flex-wrap items-center gap-3"><select aria-label="AI 선택" className="rounded bg-slate-800 p-3" disabled={busy||voice} value={provider} onChange={e=>setProvider(e.target.value as AIProviderId)}>{!providers.length&&<option value="">연결된 AI 없음</option>}{providers.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select><button disabled={busy||voice||!loaded} className="rounded border border-white/30 p-3" onClick={()=>{setDraft(profile);setSettings(!settings);}}>국가·언어 설정</button><Link className="p-3 text-amber-200" href={`/room6?room=${roomId}`}>그림·버튼 꾸미기</Link><span className="text-sm text-slate-300">{profile.country} · {profile.language} · {profile.currency}</span></div>
  {settings&&<fieldset disabled={busy||voice} className="mb-4 grid gap-3 rounded bg-slate-900 p-4 sm:grid-cols-2"><label>국가<select className="ml-2 rounded bg-slate-800 p-2" value={draft.country} onChange={e=>{const p=COUNTRY_ROOM_PRESETS.find(p=>p.id===e.target.value)!;setDraft(d=>({...d,country:p.id,timeZone:p.timeZone,currency:p.currencyCode}));}}>{COUNTRY_ROOM_PRESETS.map(p=><option key={p.id} value={p.id}>{p.id} {p.label}</option>)}</select></label><label>언어<input className="ml-2 rounded bg-slate-800 p-2" value={draft.language} onChange={e=>setDraft(d=>({...d,language:e.target.value}))}/></label><label>시간대<input className="ml-2 rounded bg-slate-800 p-2" value={draft.timeZone} onChange={e=>setDraft(d=>({...d,timeZone:e.target.value}))}/></label><label>통화<input className="ml-2 rounded bg-slate-800 p-2" value={draft.currency} onChange={e=>setDraft(d=>({...d,currency:e.target.value}))}/></label><button onClick={()=>void saveProfile()} className="rounded bg-amber-300 p-2 text-black">저장</button><button onClick={()=>setSettings(false)}>취소</button></fieldset>}
  <div className="min-h-64 max-h-[48vh] overflow-y-auto" aria-live="polite">{turns.filter(t=>t.provider===provider).map(t=><div key={t.requestId}><p className="my-3 ml-auto max-w-[90%] whitespace-pre-wrap rounded-xl bg-blue-950 p-4">{t.prompt}</p><p className={`my-3 max-w-[90%] whitespace-pre-wrap rounded-xl p-4 ${t.error?"bg-red-950":"bg-slate-800"}`}>{t.answer}</p></div>)}<div ref={bottom}/></div>
  {error&&<p role="alert" className="my-3 text-red-300">{error}</p>}<p role="status" className="my-2 min-h-6 text-sm text-amber-200">{status}</p>
  <div className="rounded-xl border border-amber-200 p-3"><textarea aria-label="질문" rows={5} maxLength={4000} className="w-full resize-y bg-transparent p-2 text-lg outline-none" value={text} disabled={!loaded||busy||voice} onChange={e=>setText(e.target.value)}/><div className="flex justify-between"><button aria-label={voice?"마이크 중지":"마이크 시작"} aria-pressed={voice} disabled={!loaded||!provider||(busy&&!voice)} onClick={microphone} className={`rounded-full p-4 ${voice?"bg-emerald-700":"bg-rose-900"}`}>{voice?<Square/>:<Mic/>}</button><button aria-label="보내기" disabled={!loaded||busy||voice||!provider||!text.trim()} onClick={()=>void send(text).catch(()=>{})} className="rounded-xl bg-rose-900 p-4 disabled:opacity-40"><Send/></button></div></div>
 </section>;
}
