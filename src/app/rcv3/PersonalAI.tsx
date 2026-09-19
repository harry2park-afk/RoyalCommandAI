"use client";
import {useRef,useState} from "react";
const sites=[{name:"ChatGPT",url:"https://chatgpt.com/"},{name:"Claude",url:"https://claude.ai/"},{name:"Gemini",url:"https://gemini.google.com/"},{name:"Grok",url:"https://grok.com/"}];
export default function PersonalAI(){
 const [selected,setSelected]=useState(0),[blocked,setBlocked]=useState(false);
 const tabs=useRef(new Map<string,Window>());
 function open(){
  const site=sites[selected],existing=tabs.current.get(site.url);setBlocked(false);
  if(existing&&!existing.closed){try{existing.focus();return;}catch{tabs.current.delete(site.url);}}
  const tab=window.open("about:blank","_blank");
  if(!tab){setBlocked(true);return;}
  tab.opener=null;tab.location.replace(site.url);tabs.current.set(site.url,tab);
 }
 return <section aria-label="Use my AI account" style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",margin:"16px 0"}}><label htmlFor="personal-ai">My AI account</label><select id="personal-ai" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{sites.map((s,i)=><option key={s.url} value={i}>{s.name}</option>)}</select><button type="button" onClick={open}>Open My AI ↗</button><small>Use your own account. Return here using the RC tab.</small>{blocked&&<span role="alert">Allow pop-ups for RC, or <a href={sites[selected].url} target="_blank" rel="noopener noreferrer">open {sites[selected].name}</a>.</span>}</section>;
}
