'use client';
import {useEffect,useRef,useState} from 'react';
import {meetingBackgrounds} from '@/lib/rcv3/meeting-backgrounds';
import {MeetingCamera} from '@/lib/rcv3/meeting-camera';
import {meetingPreviewText} from '@/lib/locale/meeting-preview';
import styles from './meeting.module.css';
export default function MeetingPreview({language}:{language:string}){
 const [selected,setSelected]=useState<string>(meetingBackgrounds[0].id),[active,setActive]=useState(false),[starting,setStarting]=useState(false),[error,setError]=useState<'failed'|'unavailable'|null>(null);
 const [zoom,setZoom]=useState(0.85),[offset,setOffset]=useState(0),[brightness,setBrightness]=useState(1),[loadedImage,setLoadedImage]=useState('');
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),camera=useRef<MeetingCamera|null>(null),background=useRef<HTMLImageElement|null>(null),run=useRef(0);
 const chosen=meetingBackgrounds.find(b=>b.id===selected)??meetingBackgrounds[0];
 const imageReady=loadedImage===chosen.image;
 const current=useRef({zoom,offset,brightness,deskTop:chosen.deskTop});
 useEffect(()=>{current.current={zoom,offset,brightness,deskTop:chosen.deskTop};},[zoom,offset,brightness,chosen]);
 useEffect(()=>{
  let valid=true;background.current=null;const img=new Image();img.onload=()=>{if(valid){background.current=img;setLoadedImage(chosen.image);}};img.onerror=()=>{if(valid){background.current=null;setLoadedImage('');setError('unavailable');camera.current?.stop();setActive(false);}};img.src=chosen.image;
  return()=>{valid=false;};
 },[chosen]);
 useEffect(()=>{
  const controller=new MeetingCamera(video.current!,canvas.current!,()=>({...current.current,background:background.current}),()=>{setActive(false);setStarting(false);setError('unavailable');});camera.current=controller;
  const stop=()=>{++run.current;controller.stop();setActive(false);setStarting(false);};
  const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',stop);
  return()=>{++run.current;controller.stop();camera.current=null;document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',stop);};
 },[]);
 function stop(){++run.current;camera.current?.stop();setActive(false);setStarting(false);}
 async function start(){const token=++run.current;setStarting(true);setError(null);try{const ready=await camera.current?.start();if(token===run.current)setActive(Boolean(ready));}catch{if(token===run.current)setError('failed');}finally{if(token===run.current)setStarting(false);}}
 function choose(id:string){setSelected(id);}
 return <main className={styles.page}>
  <header><a href="/rcv3">← RC V3</a><span>ROYAL COMMAND · DESKTOP PREVIEW</span></header>
  <div className={styles.heading}><div><p>MEETING ROOMS · PERSONAL & BUSINESS</p><h1>Your seat at the table</h1></div><span>10 designs</span></div>
  <p className={styles.notice}>{meetingPreviewText('intro',language)}</p>
  <section className={styles.workspace} aria-label="Camera preview">
   <div className={styles.stage}>
    <img src={chosen.image} alt={chosen.name} width={1672} height={941}/>
    <canvas ref={canvas} width={1280} height={720} aria-label="Local camera with selected background" style={{visibility:active&&imageReady?'visible':'hidden'}}/>
    <video ref={video} muted playsInline className={styles.hiddenVideo} aria-hidden="true"/>
    <span className={styles.badge}>{active?'LOCAL CAMERA PREVIEW':'BACKGROUND PREVIEW'}</span>
   </div>
   <aside className={styles.controls}><h2>{chosen.name}</h2><p>{meetingPreviewText('pose',language)}</p>
    {active||starting?<button onClick={stop}>{starting?'Cancel':'Camera Off'}</button>:<button onClick={()=>void start()} disabled={!imageReady}>Camera On</button>}
    {starting&&<p role="status">{meetingPreviewText('loading',language)}</p>}
    {error&&<p role="alert">{meetingPreviewText(error,language)}</p>}
    <label>Size<input type="range" min="0.7" max="1.4" step="0.02" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
    <label>Position<input type="range" min="-0.2" max="0.2" step="0.01" value={offset} onChange={e=>setOffset(Number(e.target.value))}/></label>
    <label>Brightness<input type="range" min="0.8" max="1.3" step="0.02" value={brightness} onChange={e=>setBrightness(Number(e.target.value))}/></label>
    <button onClick={()=>{setZoom(0.85);setOffset(0);setBrightness(1);}}>Reset</button>
    <p className={styles.small}>{meetingPreviewText('privacy',language)}</p><p className={styles.small}>{meetingPreviewText('staff',language)}</p>
   </aside>
  </section>
  <section aria-label="Meeting background designs" className={styles.grid}>{meetingBackgrounds.map((b,i)=><button key={b.id} aria-pressed={b.id===chosen.id} onClick={()=>choose(b.id)}><img src={b.image} alt={b.name} width={1672} height={941}/><span><small>{String(i+1).padStart(2,'0')}</small>{b.name}</span></button>)}</section>
 </main>;
}
