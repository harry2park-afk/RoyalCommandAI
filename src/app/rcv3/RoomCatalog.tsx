'use client';
import {useState,useEffect,useRef} from 'react';
import {publishedRoomModels,roomCatalog,modelImage} from '@/lib/rcv3/room-catalog';
import {roomTemplates,templateImage} from '@/lib/rcv3/templates';
import styles from './room.module.css';

export default function RoomCatalog({search,busy,creating,onChoose}:{search:string;busy:boolean;creating:string|null;onChoose:(id:string)=>void}){
 const grid=useRef<HTMLDivElement>(null);
 const [active,setActive]=useState<number|null>(null);
 const [category,setCategory]=useState('All');
 const model=publishedRoomModels.find(m=>m.slot===active);
 const query=search.toLowerCase().trim();
 const slots=roomCatalog.filter(({model:m,slot})=>(category==='All'||m?.category===category)&&(!query||`${m?.name??'Coming soon'} ${m?.category??''} ${slot}`.toLowerCase().includes(query)));
 const variants=roomTemplates.filter(t=>model?.variants.includes(t.id)&&`${t.name} ${t.keywords}`.toLowerCase().includes(query));
 useEffect(()=>{const nodes=Array.from(grid.current?.children??[]) as HTMLElement[];const resize=new ResizeObserver(entries=>{for(const entry of entries){const el=entry.target as HTMLElement;el.style.gridRowEnd=`span ${Math.ceil((el.getBoundingClientRect().height+20)/8)}`;}});nodes.forEach(n=>resize.observe(n));return()=>resize.disconnect();},[active,category,search]);
 function browse(value:string){setActive(null);setCategory(value);}
 return <div className={styles.catalogLayout}>
  <aside className={styles.catalogSidebar} aria-label="Room models"><strong>COLLECTIONS</strong><button aria-pressed={!model&&category==='All'} onClick={()=>browse('All')}>All Models <span>150</span></button>{['Office','Study','Nature','Creative','Simple'].map(c=><button key={c} aria-pressed={!model&&category===c} onClick={()=>browse(c)}>{c}</button>)}<hr/>{publishedRoomModels.map(m=><button key={m.slot} aria-pressed={model?.slot===m.slot} onClick={()=>setActive(m.slot)}>{m.name}</button>)}</aside>
  <div className={styles.catalogContent}>
   <div className={styles.catalogHeading}><div>{model&&<button onClick={()=>setActive(null)}>← All Models</button>}<h2>{model?model.name:'Find your space'}</h2><p>{creating?'Creating your room…':model?'Choose a design to open your room.':'Choose a model, then pick your room design.'}</p></div><span>{model?`${variants.length} designs`:'5 collections available · 150 spaces'}</span></div>
   <div ref={grid} className={styles.catalogMasonry}>
    {model?variants.map(t=><button className={styles.catalogCard} key={t.id} disabled={busy} aria-label={`Create ${t.name}`} onClick={()=>onChoose(t.id)}>{t.id==='blank'?<div className={styles.catalogBlank}>My AI · Katie · Files</div>:<img src={templateImage(t)} alt={t.name} loading="lazy"/>}<div className={styles.catalogCaption}><strong>{t.name}</strong><span>{creating===t.id?'Creating…':'Use this room ↗'}</span></div></button>):slots.map(({slot,model:m})=>m?<button key={slot} className={styles.catalogCard} aria-label={`Browse ${m.name}`} onClick={()=>setActive(slot)}><img src={modelImage(m)} alt={m.name} loading="lazy"/><div className={styles.catalogCaption}><strong>{m.name}</strong><span>{m.variants.length} designs ↗</span></div></button>:<div key={slot} className={styles.catalogPlaceholder} data-room-slot={slot}><div style={{aspectRatio:['4 / 3','3 / 4','16 / 9','1 / 1','2 / 3'][slot%5]}}><span>✧</span><strong>{String(slot).padStart(3,'0')}</strong></div><p>Coming soon</p></div>)}
   </div>
   {!(model?variants.length:slots.length)&&<p>No rooms found. Try another search.</p>}
  </div>
 </div>;
}
