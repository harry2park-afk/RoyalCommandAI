'use client';
import {useEffect,useRef,useState} from 'react';
import {meetingLanguages} from '@/lib/rcv3/meeting-languages';
import {meetingTranslationText as message} from '@/lib/locale/meeting-translation';
import styles from './meeting.module.css';
type Direction='outgoing'|'incoming';
type Result={original:string;translated:string;audio:string|null;source:string;target:string};
export default function MeetingTranslation({language,rooms}:{language:string;rooms:{id:string;name:string}[]}){
 const initial=meetingLanguages.some(([c])=>c===language.split('-')[0])?language.split('-')[0]:'en';
 const [enabled,setEnabled]=useState(false),[mine,setMine]=useState(initial),[theirs,setTheirs]=useState(initial==='en'?'ko':'en'),[room,setRoom]=useState(rooms[0]?.id??''),[direction,setDirection]=useState<Direction>('outgoing'),[voice,setVoice]=useState(false),[text,setText]=useState(''),[result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[error,setError]=useState<'error'|'microphone'|null>(null);
 const request=useRef<AbortController|null>(null),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),generation=useRef(0),player=useRef<HTMLAudioElement>(null);
 function cancel(){generation.current++;request.current?.abort();request.current=null;if(timer.current)clearTimeout(timer.current);if(recorder.current){recorder.current.onstop=null;recorder.current.ondataavailable=null;recorder.current.onerror=null;if(recorder.current.state!=='inactive')recorder.current.stop();recorder.current=null;}stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;player.current?.pause();setBusy(false);setRecording(false);}
 useEffect(()=>{const hide=()=>{if(document.hidden){cancel();setEnabled(false);}};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);cancel();};},[]);
 function reset(){cancel();setResult(null);setError(null);}
 async function translate(audio?:string,mime?:string,token=generation.current){
  if(token!==generation.current)return;
  setBusy(true);setError(null);setResult(null);const controller=new AbortController();request.current=controller;
  try{
   const response=await fetch('/api/rcv3/meetings/translate',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({roomId:room,requestId:crypto.randomUUID(),source:direction==='outgoing'?mine:theirs,target:direction==='outgoing'?theirs:mine,direction,voice:direction==='outgoing'||voice,...(audio?{audio,mime}:{text})})});
   if(!response.ok)throw new Error('translation');const data=await response.json() as Result;
   if(token===generation.current)setResult(data);
  }catch{if(token===generation.current&&!controller.signal.aborted)setError('error');}finally{if(token===generation.current){setBusy(false);request.current=null;}}
 }
 async function record(){
  reset();const token=generation.current;setBusy(true);
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('microphone');
   const media=await navigator.mediaDevices.getUserMedia({audio:true,video:false});if(token!==generation.current){media.getTracks().forEach(t=>t.stop());return;}stream.current=media;
   const mime=['audio/webm','audio/mp4','audio/ogg'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)throw new Error('mime');
   const rec=new MediaRecorder(media,{mimeType:mime});recorder.current=rec;const chunks:Blob[]=[];let size=0;
   rec.ondataavailable=e=>{if(token!==generation.current)return;chunks.push(e.data);size+=e.data.size;if(size>2000000){cancel();setError('microphone');}};
   rec.onerror=()=>{if(token!==generation.current)return;cancel();setError('microphone');};
   rec.onstop=async()=>{if(timer.current)clearTimeout(timer.current);media.getTracks().forEach(t=>t.stop());stream.current=null;recorder.current=null;if(token!==generation.current)return;setRecording(false);try{const bytes=new Uint8Array(await new Blob(chunks,{type:mime}).arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);await translate(btoa(binary),mime,token);}catch{if(token===generation.current){setBusy(false);setError('microphone');}}};
   rec.start(500);setRecording(true);timer.current=setTimeout(()=>{if(rec.state==='recording')rec.stop();},20000);
  }catch{if(token===generation.current){cancel();setError('microphone');}}
 }
 return <section className={styles.translation} aria-label="Translation">
  <div className={styles.translationHeading}><h2>Translation</h2><button aria-pressed={enabled} onClick={()=>{reset();setEnabled(!enabled);}}>{enabled?'Translation Off':'Translation On'}</button></div>
  <p>{message('scope',language)}</p>
  {enabled&&<>
   <div className={styles.translationOptions}>
    <label>My Language<select value={mine} onChange={e=>{reset();setMine(e.target.value);}}>{meetingLanguages.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select></label>
    <label>Other Person’s Language<select value={theirs} onChange={e=>{reset();setTheirs(e.target.value);}}>{meetingLanguages.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select></label>
    <label>My Translation<select value={voice?'voice':'text'} onChange={e=>{reset();setVoice(e.target.value==='voice');}}><option value="text">Text Only</option><option value="voice">Voice + Text</option></select></label>
    <label>For Other Person<output>Translated Voice Only</output></label>
   </div>
   <p>{message('room',language)}</p>
   {rooms.length?<label>My Room<select value={room} onChange={e=>{reset();setRoom(e.target.value);}}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>:<p>{message('noRooms',language)} <a href="/rcv3">My Rooms</a></p>}
   <div className={styles.translationOptions}>
    <button aria-pressed={direction==='outgoing'} onClick={()=>{reset();setDirection('outgoing');}}>Me → Other Person</button>
    <button aria-pressed={direction==='incoming'} onClick={()=>{reset();setDirection('incoming');}}>Other Person → Me</button>
   </div>
   <p>{message('privacy',language)}</p>
   <label>Original Text<textarea maxLength={2000} value={text} disabled={busy} onChange={e=>{setText(e.target.value);setResult(null);}} rows={3}/></label>
   <div className={styles.translationOptions}>
    <button disabled={busy||!room||!text.trim()} onClick={()=>{reset();void translate();}}>Translate</button>
    <button disabled={!room||busy&&!recording} onClick={()=>recording?recorder.current?.stop():void record()}>{recording?'Stop & Translate':'Microphone'}</button>
    {busy&&<button onClick={cancel}>Cancel</button>}
   </div>
   {busy&&<p role="status">{message(recording?'recording':'loading',language)}</p>}
   {error&&<p role="alert">{message(error,language)}</p>}
   {result&&<div aria-live="polite"><h3>Original</h3><p>{result.original}</p><h3>{direction==='outgoing'?'Translated Voice · Local Preview':'For Me'}</h3>{direction==='incoming'&&<p className={styles.translatedText}>{result.translated}</p>}{(direction==='outgoing'||voice)&&(result.audio?<audio ref={player} controls src={`data:audio/mpeg;base64,${result.audio}`}/>:<p>{message(direction==='outgoing'?'outgoingVoice':'voice',language)}</p>)}</div>}
  </>}
 </section>;
}
