'use client';
import {useEffect,useImperativeHandle,useRef,useState,type Ref} from 'react';
import Image from 'next/image';
import {learningLabel} from '@/lib/locale/learning';
import {primeSpeechElement} from '@/lib/client/answer-speaker';
import type {LearningAvatarPlayer,AvatarState} from '@/lib/client/learning-avatar';
import styles from './LearningAvatar.module.css';
export type LearningAvatarHandle={play:(blob:Blob,signal:AbortSignal)=>Promise<boolean>;stop:()=>void;prime:()=>void};
export default function LearningAvatar({ref,language,onTouch,label,disabled}:{ref?:Ref<LearningAvatarHandle>;language:string;onTouch:()=>void;label:string;disabled:boolean}){
 const video=useRef<HTMLVideoElement|null>(null),player=useRef<LearningAvatarPlayer|null>(null);
 const audio=useRef<HTMLAudioElement|null>(null);
 const available=useRef(false),mounted=useRef(false),generation=useRef(0);
 const [status,setStatus]=useState<AvatarState>('offline'),[configured,setConfigured]=useState(false);
 useEffect(()=>{mounted.current=true;const controller=new AbortController();
  void fetch('/api/rcv3/learn/avatar',{signal:controller.signal,cache:'no-store'}).then(r=>r.ok?r.json():{ready:false}).then(data=>{if(mounted.current){available.current=data.ready===true;setConfigured(available.current);}}).catch(()=>{});
  // Generation is a cancellation counter, not a DOM ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return()=>{mounted.current=false;generation.current++;controller.abort();player.current?.stop();player.current=null;};
 },[]);
 useImperativeHandle(ref,()=>({prime:()=>{if(audio.current)primeSpeechElement(audio.current);},stop:()=>{generation.current++;player.current?.stop();},play:async(blob,signal)=>{
  if(!available.current)return false;const current=generation.current;
  const {LearningAvatarPlayer}=await import('@/lib/client/learning-avatar');
  if(!mounted.current||signal.aborted||current!==generation.current||!video.current)throw Error('CANCELLED');
  if(!player.current)player.current=new LearningAvatarPlayer(video.current,s=>{if(mounted.current)setStatus(s);},audio.current??undefined);
  await player.current.play(blob,signal);return true;
 }}));
 return <div className={styles.wrapper}>
  <audio ref={audio} autoPlay hidden/>
  <button className={styles.stage} type="button" onClick={onTouch} aria-label={label} disabled={disabled}>
   <video ref={video} autoPlay playsInline muted className={styles.video} style={{visibility:status==='ready'?'visible':'hidden'}}/>
   {status!=='ready'&&<Image src="/images/katie-avatar.png" alt="" fill sizes="(max-width:760px) 100vw, 50vw" className={styles.poster}/>}
  </button>
  <small role="status">{learningLabel(status==='error'?'avatarError':status==='connecting'?'avatarConnecting':status==='ready'?'avatarLive':configured?'avatarReady':'avatarPending',language)}</small>
 </div>;
}
