"use client";
import {useEffect,useMemo,useState} from "react";
import ToolButton from "./ToolButton";
import {TOOL_REGISTRY} from "../../../rcv3/tool-registry.mjs";

type Capability="chat"|"secretary"|"files";
export default function Toolbox({installedCapabilities,onInstall,disabled=false}:{installedCapabilities:Capability[];onInstall:(capability:Capability)=>void;disabled?:boolean}){
  const [open,setOpen]=useState(false);
  const installed=useMemo(()=>new Set(installedCapabilities),[installedCapabilities]);
  const roomTools=TOOL_REGISTRY.filter(tool=>tool.mode==="room-button");
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[open]);
  return <div style={{position:"relative"}}>
    <ToolButton aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={()=>setOpen(value=>!value)}>Toolbox</ToolButton>
    {open&&<section role="dialog" aria-label="RC V3 Toolbox" style={{position:"fixed",zIndex:80,right:16,top:76,width:"min(420px,calc(100vw - 24px))",maxHeight:"70vh",overflow:"auto",padding:16,border:"1px solid #3b5568",borderRadius:12,background:"#0b1723",boxShadow:"0 18px 55px rgba(0,0,0,.45)"}}>
      <strong>RC V3 Toolbox</strong>
      <p style={{margin:"8px 0 12px",fontSize:13}}>Shared verified controls are registered here. Room buttons can be added without copying customer data, accounts, credentials or entitlements.</p>
      <label style={{display:"grid",gap:6}}>Add to Room
        <select defaultValue="" disabled={disabled} onChange={event=>{const capability=event.target.value as Capability;if(capability){onInstall(capability);event.currentTarget.value="";}}}>
          <option value="">Choose a room tool…</option>
          {roomTools.map(tool=><option key={tool.id} value={tool.capability} disabled={installed.has(tool.capability as Capability)}>{tool.label}{installed.has(tool.capability as Capability)?" · Installed":""}</option>)}
        </select>
      </label>
      <div style={{display:"grid",gap:7,marginTop:14}}>{TOOL_REGISTRY.map(tool=><div key={tool.id} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"8px 10px",border:"1px solid #263b4b",borderRadius:8}}><span>{tool.label}</span><small>{tool.mode==="room-button"?(installed.has(tool.capability as Capability)?"Installed":"Available"):"Built in"}</small></div>)}</div>
    </section>}
  </div>;
}
