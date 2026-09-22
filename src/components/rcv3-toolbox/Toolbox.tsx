'use client';
import { useState } from 'react';
import HelpText from '@/components/help/HelpText';
import { TOOL_REGISTRY,type ToolId } from '@/lib/rcv3/toolbox';
import styles from './toolbox.module.css';
export default function Toolbox({installed,busy,onInstall}:{installed:ToolId[];busy:boolean;onInstall:(id:ToolId)=>Promise<void>}) {
  const [search,setSearch]=useState(''),[notice,setNotice]=useState('');
  const tools=TOOL_REGISTRY.filter(tool=>`${tool.label} ${tool.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className={styles.root}>
    <p><HelpText helpKey="toolboxOverview"/></p>
    <label>Search tools<input type="search" value={search} onChange={event=>setSearch(event.target.value)}/></label>
    {notice&&<p role="status">{notice}</p>}
    <div className={styles.grid}>{tools.map(tool=><article key={tool.id} data-tool-card={tool.id}>
      <h2>{tool.label}</h2><p><HelpText helpKey={`toolbox.${tool.id}`}/></p>
      <button type="button" disabled={busy||installed.includes(tool.id)} onClick={async()=>{setNotice('');try{await onInstall(tool.id);setNotice(`${tool.label} added to this room.`);}catch(error){setNotice((error as Error).message);}}}>{installed.includes(tool.id)?'Added':'Add to Room'}</button>
    </article>)}</div>
    {!tools.length&&<p>No tools found.</p>}
  </div>;
}
