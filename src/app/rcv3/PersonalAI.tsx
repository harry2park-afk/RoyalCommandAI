"use client";
import {useEffect,useRef,useState} from "react";
const sites=[{name:"ChatGPT",url:"https://chatgpt.com/"},{name:"Claude",url:"https://claude.ai/"},{name:"Gemini",url:"https://gemini.google.com/"},{name:"Grok",url:"https://grok.com/"}];
export default function PersonalAI(){
 const [open,setOpen]=useState(false);const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close);},[open]);
 return <div ref={root} style={{position:"relative",flexShrink:0}} onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);root.current?.querySelector("button")?.focus();}}}><button type="button" aria-expanded={open} aria-controls="personal-ai-options" onClick={()=>setOpen(!open)}>My AI account ▾</button>{open&&<div id="personal-ai-options" aria-label="My AI sites" style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:50,minWidth:180,padding:6,border:"1px solid #425269",borderRadius:9,background:"#102133",boxShadow:"0 8px 24px #0006"}}>{sites.map(site=><a key={site.url} href={site.url} target="_blank" rel="noopener noreferrer" onClick={()=>setOpen(false)} style={{display:"block",padding:"10px 12px",color:"#eef4f8",textDecoration:"none",whiteSpace:"nowrap"}}>{site.name} ↗</a>)}</div>}</div>;
}
