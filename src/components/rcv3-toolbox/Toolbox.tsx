'use client';
import { useMemo, useState } from 'react';
import { TOOL_REGISTRY,type ToolId } from '@/lib/rcv3/toolbox';
import styles from './toolbox.module.css';

export default function Toolbox({installed,busy,onInstall}:{installed:ToolId[];busy:boolean;onInstall:(id:ToolId)=>void}) {
  const [search,setSearch]=useState('');
  const installedSet=useMemo(()=>new Set(installed),[installed]);
  const tools=useMemo(()=>{
    const clean=search.trim().toLowerCase();
    return TOOL_REGISTRY
      .filter(tool=>!clean||`${tool.label} ${tool.description}`.toLowerCase().includes(clean))
      .sort((a,b)=>Number(installedSet.has(a.id))-Number(installedSet.has(b.id))||a.label.localeCompare(b.label));
  },[search,installedSet]);
  return <section className={styles.root} aria-label="RC Toolbox">
    <div className={styles.intro}>
      <div><small>RC BUTTON WAREHOUSE</small><h2>Choose a tool to place</h2><p>Select one item. This list will close, then click the exact empty place where you want the button.</p></div>
      <div className={styles.count}>{installed.length} in room</div>
    </div>
    <label className={styles.search}><span>Find tool</span><input type="search" value={search} placeholder="Search…" onChange={event=>setSearch(event.target.value)}/></label>
    <div className={styles.list}>
      {tools.map(tool=>{
        const inRoom=installedSet.has(tool.id);
        return inRoom
          ? <div key={tool.id} className={`${styles.row} ${styles.inRoom}`} aria-disabled="true" data-tool-card={tool.id}>
              <span className={styles.marker}>✓</span><span className={styles.copy}><strong>{tool.label}</strong><small>{tool.description}</small></span><span className={styles.status}>In Room</span>
            </div>
          : <button key={tool.id} type="button" className={styles.row} data-tool-card={tool.id} disabled={busy} onClick={()=>onInstall(tool.id)}>
              <span className={styles.marker}>＋</span><span className={styles.copy}><strong>{tool.label}</strong><small>{tool.description}</small></span><span className={styles.place}>Place</span>
            </button>;
      })}
    </div>
    {!tools.length&&<p className={styles.empty}>No matching tools.</p>}
  </section>;
}
