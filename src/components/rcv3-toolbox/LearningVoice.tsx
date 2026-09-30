'use client';
import {useEffect,useRef,useState,useImperativeHandle,type Ref} from 'react';
import {createDictation} from '../../../rcv3/live-dictation.mjs';
import {LearningConversation} from '@/lib/client/learning-conversation';
import {AnswerSpeaker} from '@/lib/client/answer-speaker';
import {learningLabel,type LearningLabel} from '@/lib/locale/learning';
export type LearningVoiceHandle={stop:()=>void};
type Props={ref?:Ref<LearningVoiceHandle>;language:string;lessonText:string;answerText:string;draft:string;disabled:boolean;onTranscript:(text:string)=>void;onQuestion?:(text:string,signal:AbortSignal)=>Promise<string>;onActiveChange?:(active:boolean)=>void};
export default function LearningVoice({ref,language,lessonText,answerText,draft,disabled,onTranscript,onQuestion,onActiveChange}:Props){
 const conversation=useRef<LearningConversation|null>(null),speechDone=useRef<{resolve:()=>void;reject:()=>void}|null>(null);
 const [talking,setTalking]=useState(false);
 const background=useRef(false);
 const [listenOnly,setListenOnly]=useState(false);
 const [listening,setListening]=useState(false),[status,setStatus]=useState<LearningLabel|null>(null),[auto,setAuto]=useState(false);
 const recognition=useRef<ReturnType<typeof createDictation>|null>(null),speaker=useRef<AnswerSpeaker|null>(null);
 const latest=useRef({draft,onTranscript,onQuestion,onActiveChange});latest.current={draft,onTranscript,onQuestion,onActiveChange};
 const seenAnswer=useRef(answerText);
 const t=(key:LearningLabel)=>learningLabel(key,language);
 const stop=()=>{conversation.current?.stop();conversation.current=null;setTalking(false);latest.current.onActiveChange?.(false);recognition.current?.cancel();recognition.current=null;speaker.current?.stop();setListening(false);setStatus(null);};
 useImperativeHandle(ref,()=>({stop}));
 useEffect(()=>{
  const player=new AnswerSpeaker({load:async(_job,text,signal)=>{
   const r=await fetch('/api/rcv3/learn/speech',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language}),signal});
   if(!r.ok)throw Error('SPEECH');return r.blob();
  },status:(_id,value)=>{setStatus(value==='error'?'voiceError':value==='preparing'?'voicePreparing':value==='reading'?'voiceReading':null);if(value==='idle')speechDone.current?.resolve();if(value==='error')speechDone.current?.reject();}});
  speaker.current=player;
  const halt=()=>{conversation.current?.stop();setTalking(false);latest.current.onActiveChange?.(false);recognition.current?.cancel();recognition.current=null;player.stop();setListening(false);setStatus(null);};
  const hide=()=>{if(document.hidden){conversation.current?.stop();setTalking(false);latest.current.onActiveChange?.(false);recognition.current?.cancel();recognition.current=null;setListening(false);if(!background.current){player.stop();setStatus(null);}}};
  document.addEventListener('visibilitychange',hide);
  navigator.mediaDevices?.addEventListener('devicechange',halt);
  return()=>{conversation.current?.stop();latest.current.onActiveChange?.(false);document.removeEventListener('visibilitychange',hide);navigator.mediaDevices?.removeEventListener('devicechange',halt);recognition.current?.cancel();recognition.current=null;player.stop();speaker.current=null;};
 },[language]);
 useEffect(()=>{if(disabled){recognition.current?.cancel();recognition.current=null;speaker.current?.stop();setListening(false);}},[disabled]);
 useEffect(()=>{if(answerText===seenAnswer.current)return;seenAnswer.current=answerText;if(!conversation.current&&auto&&answerText&&!document.hidden&&!recognition.current)speaker.current?.enqueue({id:'tutor',text:answerText});},[answerText,auto]);
 function startConversation(){
  if(talking){stop();return;}
  if(disabled||draft.trim())return;
  stop();setAuto(false);background.current=false;setListenOnly(false);
  speaker.current?.prime();setTalking(true);latest.current.onActiveChange?.(true);
  const engine=new LearningConversation({
   listen:(onText,onEnd,onError)=>{const w=window as unknown as {SpeechRecognition?:new()=>unknown;webkitSpeechRecognition?:new()=>unknown};return createDictation(w.SpeechRecognition||w.webkitSpeechRecognition,{language,onText,onEnd,onError});},
   draft:text=>latest.current.onTranscript(text),
   ask:(text,signal)=>{if(!latest.current.onQuestion)throw Error('UNAVAILABLE');return latest.current.onQuestion(text,signal);},
   speak:(text,signal)=>new Promise<void>((resolve,reject)=>{
    const finish=(failed=false)=>{signal.removeEventListener('abort',abort);speechDone.current=null;failed?reject(Error('VOICE')):resolve();};
    const abort=()=>finish(true);if(signal.aborted){abort();return;}
    speechDone.current={resolve:()=>finish(),reject:()=>finish(true)};signal.addEventListener('abort',abort,{once:true});speaker.current?.enqueue({id:'conversation',text});
   }),
   stopAudio:()=>speaker.current?.stop(),
   phase:value=>{if(value!=='idle'&&value!=='error'){setTalking(true);latest.current.onActiveChange?.(true);}setStatus(value==='listening'?'voiceListening':value==='thinking'?'voicePreparing':value==='speaking'?'voiceReading':value==='error'?'voiceError':null);if(value==='idle'||value==='error'){conversation.current=null;setTalking(false);latest.current.onActiveChange?.(false);}},
  });
  conversation.current=engine;engine.start(t('voiceOpening'));
 }
 function read(text:string){stop();speaker.current?.prime();speaker.current?.enqueue({id:'tutor',text});}
 function microphone(){
  if(listening){recognition.current?.stop();recognition.current=null;setListening(false);return;}
  stop();
  const base=latest.current.draft.trim();
  try{
   const w=window as unknown as {SpeechRecognition?:new()=>unknown;webkitSpeechRecognition?:new()=>unknown};
   const session=createDictation(w.SpeechRecognition||w.webkitSpeechRecognition,{language,onText:(text:string)=>{latest.current.onTranscript([base,text].filter(Boolean).join(' ').slice(0,2000));},onEnd:()=>{recognition.current=null;setListening(false);setStatus(null);},onError:()=>{recognition.current=null;setListening(false);setStatus('voiceMicError');}});
   recognition.current=session;session.start();setListening(true);setStatus('voiceListening');
  }catch{recognition.current?.cancel();recognition.current=null;setListening(false);setStatus('voiceMicError');}
 }
 return <div aria-label={t('voiceTitle')}>
  {onQuestion&&<button type="button" disabled={(disabled||Boolean(draft.trim()))&&!talking} aria-pressed={talking} onClick={startConversation}>{t(talking?'voiceConversationStop':'voiceConversationStart')}</button>}
  <p>{t('voiceConversationHint')}</p>
  {!talking&&draft.trim()&&<p>{t('voiceDraftFirst')}</p>}
  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
   <button type="button" disabled={disabled||listenOnly||talking} aria-pressed={listening} onClick={microphone}>{t(listening?'voiceFinish':'voiceMic')}</button>
   <button type="button" disabled={disabled||talking||!lessonText} onClick={()=>read(lessonText)}>{t('voiceLesson')}</button>
   <button type="button" disabled={disabled||talking||!answerText} onClick={()=>read(answerText)}>{t('voiceAnswer')}</button>
   <button type="button" onClick={stop}>{t('voiceStop')}</button>
  </div>
  <label><input type="checkbox" disabled={talking} checked={listenOnly} onChange={e=>{stop();background.current=e.target.checked;setListenOnly(e.target.checked);setAuto(false);}}/> {t('voiceListenOnly')}</label><br/>
  <label><input type="checkbox" disabled={listenOnly||talking} checked={auto} onChange={e=>{setAuto(e.target.checked);if(e.target.checked)speaker.current?.prime();else speaker.current?.stop();}}/> {t('voiceAuto')}</label>
  <p>{t('voiceHint')}</p>
  {status&&<p role="status" aria-live="polite">{t(status)}</p>}
 </div>;
}
