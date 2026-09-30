'use client';
import {useEffect,useRef,useState,useImperativeHandle,type Ref} from 'react';
import Image from 'next/image';
import styles from './LearningVoice.module.css';
import {createDictation} from '../../../rcv3/live-dictation.mjs';
import {LearningDayPlayer,teachingStopCommand,type TeachingSegment} from '@/lib/client/learning-day-player';
import {LearningConversation} from '@/lib/client/learning-conversation';
import {AnswerSpeaker} from '@/lib/client/answer-speaker';
import {learningLabel,type LearningLabel} from '@/lib/locale/learning';
export type LearningVoiceHandle={startDay:()=>void;stop:()=>void;stopDictation:()=>void;start:(question?:string,typed?:boolean)=>void};
type Props={ref?:Ref<LearningVoiceHandle>;language:string;lessonId:string;lessonTitle?:string;resume?:boolean;lessonText:string;answerText:string;draft:string;disabled:boolean;onTranscript:(text:string)=>void;onQuestion?:(text:string,signal:AbortSignal,typed?:boolean)=>Promise<string>;onActiveChange?:(active:boolean)=>void;onDayPlan?:(signal:AbortSignal)=>Promise<{parts:TeachingSegment[];index:number}>;onDaySegment?:(part:TeachingSegment)=>void;onDayComplete?:()=>void};
export default function LearningVoice({ref,language,lessonId,lessonTitle,resume=false,lessonText,answerText,draft,disabled,onTranscript,onQuestion,onActiveChange,onDayPlan,onDaySegment,onDayComplete}:Props){
 const dayPlayer=useRef<LearningDayPlayer|null>(null),dayLoad=useRef<AbortController|null>(null),dayMic=useRef<ReturnType<typeof createDictation>|null>(null),dayRetry=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [dayMicError,setDayMicError]=useState(false);
 const conversation=useRef<LearningConversation|null>(null),speechDone=useRef<{resolve:()=>void;reject:()=>void}|null>(null);
 const [talking,setTalking]=useState(false),[paused,setPaused]=useState(false);
 const background=useRef(false);
 const [listenOnly,setListenOnly]=useState(false);
 const [listening,setListening]=useState(false),[status,setStatus]=useState<LearningLabel|null>(null),[auto,setAuto]=useState(false);
 const recognition=useRef<ReturnType<typeof createDictation>|null>(null),speaker=useRef<AnswerSpeaker|null>(null);
 const latest=useRef({draft,onTranscript,onQuestion,onActiveChange,onDayPlan,onDaySegment,onDayComplete});latest.current={draft,onTranscript,onQuestion,onActiveChange,onDayPlan,onDaySegment,onDayComplete};
 const seenAnswer=useRef(answerText);
 const t=(key:LearningLabel)=>learningLabel(key,language);
 const cancelDay=()=>{dayLoad.current?.abort();dayLoad.current=null;dayPlayer.current?.stop();dayPlayer.current=null;dayMic.current?.cancel();dayMic.current=null;if(dayRetry.current)clearTimeout(dayRetry.current);dayRetry.current=null;};
 const stop=()=>{const daily=Boolean(dayPlayer.current||dayLoad.current);cancelDay();conversation.current?.stop();conversation.current=null;setTalking(false);setPaused(false);latest.current.onActiveChange?.(false);recognition.current?.cancel();recognition.current=null;speaker.current?.stop();setListening(false);setStatus(daily?'dayStopped':null);};
 useImperativeHandle(ref,()=>({stop,startDay:()=>{void startDay();},stopDictation:()=>{if(recognition.current){recognition.current.cancel();recognition.current=null;setListening(false);setStatus(null);}},start:(question?:string,typed=false)=>{if(question||!talking)startConversation(question,typed);}}));
 useEffect(()=>{
  const player=new AnswerSpeaker({load:async(_job,text,signal)=>{
   const r=await fetch('/api/rcv3/learn/speech',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language}),signal});
   if(!r.ok)throw Error('SPEECH');return r.blob();
  },status:(_id,value)=>{setStatus(value==='error'?'voiceError':value==='preparing'?'voicePreparing':value==='reading'?'voiceReading':null);if(value==='idle')speechDone.current?.resolve();if(value==='error')speechDone.current?.reject();}});
  speaker.current=player;
  const halt=()=>{cancelDay();conversation.current?.stop();setTalking(false);setPaused(false);latest.current.onActiveChange?.(false);recognition.current?.cancel();recognition.current=null;player.stop();setListening(false);setStatus(null);};
  const hide=()=>{if(document.hidden){cancelDay();conversation.current?.stop();setTalking(false);setPaused(false);latest.current.onActiveChange?.(false);recognition.current?.cancel();recognition.current=null;setListening(false);if(!background.current){player.stop();setStatus(null);}}};
  document.addEventListener('visibilitychange',hide);
  navigator.mediaDevices?.addEventListener('devicechange',halt);
  return()=>{cancelDay();conversation.current?.stop();latest.current.onActiveChange?.(false);document.removeEventListener('visibilitychange',hide);navigator.mediaDevices?.removeEventListener('devicechange',halt);recognition.current?.cancel();recognition.current=null;player.stop();speaker.current=null;};
 },[language]);
 // External speech sessions must stop immediately when access or exam state disables voice.
 // stop reads refs only; rerun this external cancellation only when disabled changes.
 // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
 useEffect(()=>{if(disabled)stop();},[disabled]);
 useEffect(()=>{seenAnswer.current=answerText;if(!conversation.current&&!dayPlayer.current){recognition.current?.cancel();recognition.current=null;speaker.current?.stop();setListening(false);setStatus(null);}},[lessonId]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(answerText===seenAnswer.current)return;seenAnswer.current=answerText;if(!conversation.current&&!dayPlayer.current&&auto&&answerText&&!document.hidden&&!recognition.current)speaker.current?.enqueue({id:'tutor',text:answerText});},[answerText,auto]);
 function speakText(text:string,signal:AbortSignal){return new Promise<void>((resolve,reject)=>{
  const finish=(failed=false)=>{signal.removeEventListener('abort',abort);speechDone.current=null;if(failed)reject(Error('VOICE'));else resolve();};
  const abort=()=>finish(true);if(signal.aborted){abort();return;}
  speechDone.current={resolve:()=>finish(),reject:()=>finish(true)};signal.addEventListener('abort',abort,{once:true});speaker.current?.enqueue({id:'conversation',text});
 });}
 async function startDay(){
  if(disabled||!latest.current.onDayPlan)return;stop();setDayMicError(false);setAuto(false);background.current=false;setListenOnly(false);speaker.current?.prime();setTalking(true);latest.current.onActiveChange?.(true);setStatus('voicePreparing');
  const abort=new AbortController();dayLoad.current=abort;
  try{
   const plan=await latest.current.onDayPlan(AbortSignal.any([abort.signal,AbortSignal.timeout(65000)]));if(abort.signal.aborted)return;
   dayLoad.current=null;
   const player=new LearningDayPlayer({speak:speakText,stopAudio:()=>speaker.current?.stop(),segment:(_index,part)=>{latest.current.onDaySegment?.(part);setStatus('dayTeaching');},done:()=>{latest.current.onDayComplete?.();stop();setStatus('dayFinished');},error:()=>{stop();setStatus('voiceError');}});
   dayPlayer.current=player;
   const monitor=()=>{
    if(dayPlayer.current!==player)return;
    const retry=()=>{if(dayPlayer.current===player)dayRetry.current=setTimeout(monitor,300);};
    try{const w=window as unknown as {SpeechRecognition?:new()=>unknown;webkitSpeechRecognition?:new()=>unknown};
     dayMic.current=createDictation(w.SpeechRecognition||w.webkitSpeechRecognition,{language,onText:(_text:string,utterance?:string)=>{if(dayPlayer.current===player&&utterance&&teachingStopCommand(utterance))stop();},onEnd:retry,onError:(_message:string,reason?:string)=>{if(reason==='no-speech')retry();else setDayMicError(true);}});dayMic.current.start();
    }catch{setDayMicError(true);}
   };monitor();void player.start(plan.parts,plan.index);
  }catch{if(!abort.signal.aborted){stop();setStatus('voiceError');}}
 }
 function startConversation(opening?:string,typed=false){
  if(talking&&!opening){stop();return;}
  if(disabled||(!opening&&draft.trim()))return;
  stop();setAuto(false);background.current=false;setListenOnly(false);
  speaker.current?.prime();setTalking(true);latest.current.onActiveChange?.(true);
  let typedTurn=typed;
  const engine=new LearningConversation({
   listen:(onText,onEnd,onError)=>{const w=window as unknown as {SpeechRecognition?:new()=>unknown;webkitSpeechRecognition?:new()=>unknown};return createDictation(w.SpeechRecognition||w.webkitSpeechRecognition,{language,onText,onEnd,onError:(_message:string,reason?:string)=>onError(reason)});},
   draft:text=>latest.current.onTranscript(text),
   ask:(text,signal)=>{if(!latest.current.onQuestion)throw Error('UNAVAILABLE');const isTyped=typedTurn;typedTurn=false;return latest.current.onQuestion(text,signal,isTyped);},
   speak:speakText,
   stopAudio:()=>speaker.current?.stop(),
   phase:value=>{setPaused(value==='paused');if(value!=='idle'&&value!=='error'){setTalking(true);latest.current.onActiveChange?.(true);}setStatus(value==='paused'?'teacherPaused':value==='listening'?'voiceListening':value==='thinking'?'voicePreparing':value==='speaking'?'voiceReading':value==='error'?'voiceError':null);if(value==='idle'||value==='error'){conversation.current=null;setTalking(false);setPaused(false);latest.current.onActiveChange?.(false);}},
  });
  conversation.current=engine;engine.start(opening||t(resume?'voiceContinueOpening':'voiceOpening'));
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
 function touchTeacher(){if(dayPlayer.current||dayLoad.current){stop();return;}if(!talking){void startDay();return;}if(paused)conversation.current?.resume();else conversation.current?.pause();}
 return <div className={styles.voice} aria-label={t('voiceTitle')}>
  <div className={styles.teacher}>
   <button className={styles.portrait} type="button" disabled={!talking&&(disabled||Boolean(draft.trim()))} onClick={touchTeacher} aria-label={t(talking?(paused?'teacherResume':'teacherPause'):'teacherStart')}><Image src="/images/katie-avatar.png" alt="" width={80} height={92}/><span aria-hidden="true">{talking?(paused?'▶':'Ⅱ'):'▶'}</span></button>
   <div className={styles.caption}><strong>{t('teacherReady')}</strong><small>{lessonTitle}</small><span role="status" aria-live="polite">{status?t(status):t('teacherHint')}</span></div>
   <div className={styles.actions}><button type="button" onClick={stop} disabled={!talking&&!listening&&status!=='voiceReading'}>{t('teacherStop')}</button>{talking&&<button type="button" onClick={touchTeacher}>{t(paused?'teacherResume':'teacherPause')}</button>}</div>
  </div>
  {dayMicError&&<p role="status">{t('dayMicUnavailable')}</p>}
  {!talking&&draft.trim()&&<p>{t('voiceDraftFirst')}</p>}
  <details className={styles.options}><summary>{t('teacherMore')}</summary>
  {onQuestion&&<button type="button" disabled={(disabled||Boolean(draft.trim()))&&!talking} aria-pressed={talking} onClick={()=>startConversation()}>{t(talking?'voiceConversationStop':'voiceConversationStart')}</button>}
  <p>{t('voiceConversationHint')}</p>
  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
   <button type="button" disabled={disabled||listenOnly||talking} aria-pressed={listening} onClick={microphone}>{t(listening?'voiceFinish':'voiceMic')}</button>
   <button type="button" disabled={disabled||talking||!lessonText} onClick={()=>read(lessonText)}>{t('voiceLesson')}</button>
   <button type="button" disabled={disabled||talking||!answerText} onClick={()=>read(answerText)}>{t('voiceAnswer')}</button>
   <button type="button" onClick={stop}>{t('voiceStop')}</button>
  </div>
  <label><input type="checkbox" disabled={talking} checked={listenOnly} onChange={e=>{stop();background.current=e.target.checked;setListenOnly(e.target.checked);setAuto(false);}}/> {t('voiceListenOnly')}</label><br/>
  <label><input type="checkbox" disabled={listenOnly||talking} checked={auto} onChange={e=>{setAuto(e.target.checked);if(e.target.checked)speaker.current?.prime();else speaker.current?.stop();}}/> {t('voiceAuto')}</label>
  <p>{t('voiceHint')}</p>
  </details>
 </div>;
}
