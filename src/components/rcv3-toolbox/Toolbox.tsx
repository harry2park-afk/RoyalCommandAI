'use client';
import { useMemo, useState } from 'react';
import { TOOL_REGISTRY,type ToolId } from '@/lib/rcv3/toolbox';
import styles from './toolbox.module.css';

export default function Toolbox({installed,busy,onInstall}:{installed:ToolId[];busy:boolean;onInstall:(id:ToolId)=>void}) {
  const [search,setSearch]=useState(''),[manual,setManual]=useState<ToolId|null>(null);
  const installedSet=useMemo(()=>new Set(installed),[installed]);
  const tools=useMemo(()=>{
    const clean=search.trim().toLowerCase();
    return TOOL_REGISTRY
      .filter(tool=>!clean||`${tool.label} ${tool.description} ${tool.manual.use} ${tool.manual.requirements}`.toLowerCase().includes(clean))
      .sort((a,b)=>Number(installedSet.has(a.id))-Number(installedSet.has(b.id))||a.label.localeCompare(b.label));
  },[search,installedSet]);
  return <section className={styles.root} aria-label="RC Toolbox">
    <div className={styles.intro}>
      <div><small>RC BUTTON WAREHOUSE</small><h2>Choose a tool to place</h2><p>Every stored button includes its manual. Choose Place, move the shadow button with your pointer, click an empty location, then Save.</p></div>
      <div className={styles.count}>{installed.length} in room</div>
    </div>
    <label className={styles.search}><span>Find tool</span><input type="search" value={search} placeholder="Search…" onChange={event=>setSearch(event.target.value)}/></label>
    <div className={styles.list}>
      {tools.map(tool=>{
        const inRoom=installedSet.has(tool.id),open=manual===tool.id;
        return <article key={tool.id} className={`${styles.item} ${inRoom?styles.inRoom:''}`} data-tool-card={tool.id}>
          <div className={styles.row}>
            <span className={styles.marker}>{inRoom?'✓':'＋'}</span>
            <span className={styles.copy}><strong>{tool.label}</strong><small>{tool.description}</small></span>
            <div className={styles.actions}>
              <button type="button" className={styles.manualButton} aria-expanded={open} onClick={()=>setManual(open?null:tool.id)}>Manual</button>
              <button type="button" className={styles.placeButton} disabled={busy||inRoom} onClick={()=>onInstall(tool.id)}>{inRoom?'In Room':'Place'}</button>
            </div>
          </div>
          {open&&<div className={styles.manual} role="region" aria-label={`${tool.label} manual`}>
            <dl>
              <dt>Function</dt><dd>{tool.manual.purpose}</dd>
              <dt>How to use</dt><dd>{tool.manual.use}</dd>
              <dt>Requirements</dt><dd>{tool.manual.requirements}</dd>
              <dt>Install</dt><dd>{tool.manual.install}</dd>
              <dt>Save</dt><dd>{tool.manual.save}</dd>
              <dt>Version</dt><dd>{tool.version}</dd>
            </dl>
          </div>}
        </article>;
      })}
    </div>
    {!tools.length&&<p className={styles.empty}>No matching tools.</p>}
  </section>;
}
