'use client';
import {useState} from 'react';
import {roomCatalog,roomCategories,templateImage} from '@/lib/rcv3/room-catalog';
import styles from './room.module.css';

export default function RoomCatalog({search,busy,creating,onChoose}:{search:string;busy:boolean;creating:string|null;onChoose:(id:string)=>void}){
 const [category,setCategory]=useState('All');
 const query=search.toLowerCase().trim();
 const rooms=roomCatalog.filter(t=>(category==='All'||t.category===category)&&`${t.name} ${t.keywords}`.toLowerCase().includes(query));
 return <div className={styles.catalogLayout}>
  <aside className={styles.catalogSidebar} aria-label="Room designs"><strong>DESIGNS</strong><button disabled={busy} onClick={()=>window.location.assign("/rcv3/learn")}>AI Learning Room · Free</button><button aria-pressed={category==='All'} onClick={()=>setCategory('All')}>All Designs <span>{roomCatalog.length}</span></button>{roomCategories.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}<button onClick={()=>window.location.assign('/rcv3/meetings')}>Meeting Rooms <span>10</span></button></aside>
  <div className={styles.catalogContent}>
   <div className={styles.catalogHeading}><h2>Choose Your Room</h2><span>{rooms.length} designs</span>{creating&&<p role="status">Creating…</p>}</div>
   <div className={styles.artworkGrid}>
    {rooms.map(t=><button className={styles.catalogCard} key={t.id} disabled={busy} aria-label={`Create ${t.name}`} onClick={()=>onChoose(t.id)}><img src={templateImage(t)} alt={t.name} loading="lazy" width={1672} height={941}/><div className={styles.catalogCaption}><strong>{t.name}</strong>{creating===t.id&&<span>Creating…</span>}</div></button>)}
   </div>
   {!rooms.length&&<p>No rooms found.</p>}
  </div>
 </div>;
}
