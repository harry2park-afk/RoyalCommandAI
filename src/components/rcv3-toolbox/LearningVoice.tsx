'use client';
import {useEffect,useRef,useState,useImperativeHandle,type Ref} from 'react';
import {createDictation} from '../../../rcv3/live-dictation.mjs';
import {AnswerSpeaker} from '@/lib/client/answer-speaker';
import {learningLabel,type LearningLabel} from '@/lib/locale/learning';
export type LearningVoiceHandle={stop:()=>void};
type Props={ref?:Ref<LearningVoiceHandle>;language:string;lessonText:string;answerText:string;draft:string;disabled:boolean;onTranscript:(text:string)=>void};
export default function LearningVoice({ref,language,lessonText,answerText,draft,disabled,onTranscript}:Props){
 const [listening,setListening]=useState(false),[status,setStatus]=useState<LearningLabel|null>(null),[auto,setAuto]=useState(false);
 const recognition=useRef<ReturnType<typeof createDictation>|null>(null),speaker=useRef<AnswerSpeaker|null>(null);
 const latest=useRef({draft,onTranscript});latest.current={draft,onTranscript};
 const seenAnswer=useRef(answerText);
 const t=(key:LearningLabel)=>learningLabel(key,language);
 const stop=()=>{recognition.current?.cancel();recognition.current=null;speaker.current?.stop();setListening(false);setStatus(null);};
 useImperativeHandle(ref,()=>({stop}));
 useEffect(()=>{
  const player=new AnswerSpeaker({load:async(_job,text,signal)=>{
   const r=await fetch('/api/rcv3/learn/speech',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language}),signal});
   if(!r.ok)throw Error('SPEECH');return r.blob();
  },status:(_id,value)=>setStatus(value==='error'?'voiceError':value==='preparing'?'voicePreparing':value==='reading'?'voiceReading':null)});
  speaker.current=player;
  const halt=()=>{recognition.current?.cancel();recognition.current=null;player.stop();setListening(false);setStatus(null);};
  const hide=()=>{if(document.hidden)halt();};
  document.addEventListener('visibilitychange',hide);
  navigator.mediaDevices?.addEventListener('devicechange',halt);
  return()=>{document.removeEventListener('visibilitychange',hide);navigator.mediaDevices?.removeEventListener('devicechange',halt);recognition.current?.cancel();recognition.current=null;player.stop();speaker.current=null;};
 },[language]);
 useEffect(()=>{if(disabled){recognition.current?.cancel();recognition.current=null;speaker.current?.stop();setListening(false);}},[disabled]);
 useEffect(()=>{if(answerText===seenAnswer.current)return;seenAnswer.current=answerText;if(auto&&answerText&&!document.hidden&&!recognition.current)speaker.current?.enqueue({id:'tutor',text:answerText});},[answerText,auto]);
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
  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
   <button type="button" disabled={disabled} aria-pressed={listening} onClick={microphone}>{t(listening?'voiceFinish':'voiceMic')}</button>
   <button type="button" disabled={disabled||!lessonText} onClick={()=>read(lessonText)}>{t('voiceLesson')}</button>
   <button type="button" disabled={disabled||!answerText} onClick={()=>read(answerText)}>{t('voiceAnswer')}</button>
   <button type="button" onClick={stop}>{t('voiceStop')}</button>
  </div>
  <label><input type="checkbox" checked={auto} onChange={e=>{setAuto(e.target.checked);if(e.target.checked)speaker.current?.prime();else speaker.current?.stop();}}/> {t('voiceAuto')}</label>
  <p>{t('voiceHint')}</p>
  {status&&<p role="status" aria-live="polite">{t(status)}</p>}
 </div>;
}
