'use client';
import {useEffect,useState,useRef,useCallback} from 'react';
import type {ToolRequest} from '@/lib/rcv3/tool-approval-types';
import {TOOL_REGISTRY} from '@/lib/rcv3/toolbox';
type RequestItem=ToolRequest&{roomId?:string;roomName?:string};
export default function ToolRequests({roomId,manager,onClose}:{roomId:string;manager:boolean;onClose:()=>void}){
 const pendingSubmission=useRef<{id:string;text:string}|null>(null);
 const [requests,setRequests]=useState<RequestItem[]>([]),[text,setText]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[choices,setChoices]=useState<Record<string,string>>({});
 const call=useCallback(async(method:string,body?:unknown)=>{
  const r=await fetch(`/api/rcv3/tool-requests?room=${encodeURIComponent(roomId)}`,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
  const value=await r.json();if(!r.ok)throw new Error(value.error??'Request failed. Try again.');return value;
 },[roomId]);
 async function refresh(){const value=await call('GET');setRequests(value.requests);}
 useEffect(()=>{let active=true;void call('GET').then(value=>{if(active)setRequests(value.requests);}).catch(()=>{if(active)setNotice('Could not load requests. Close and try again.');});return()=>{active=false;};},[call,manager]);
 async function submit(){if(busy)return;setBusy(true);setNotice('');try{if(!pendingSubmission.current||pendingSubmission.current.text!==text)pendingSubmission.current={id:crypto.randomUUID(),text};await call('POST',{roomId,requestId:pendingSubmission.current.id,text});pendingSubmission.current=null;setText('');setNotice('Request submitted for RC review.');await refresh();}catch(error){setNotice((error as Error).message);}finally{setBusy(false);}}
 async function review(item:RequestItem,decision:'approve'|'reject'){
  if(busy)return;setBusy(true);setNotice('');try{await call('PUT',{roomId:item.roomId,requestId:item.id,decision,...(decision==='approve'?{toolId:choices[item.id]??item.toolId}:{})});setNotice(decision==='approve'?'Tool approved and installed.':'Request rejected.');await refresh();}catch(error){setNotice((error as Error).message);}finally{setBusy(false);}
 }
 return <section role="dialog" aria-modal="true" aria-label={manager?'RC tool requests':'Request a tool'} style={{position:'fixed',inset:'8% max(16px, calc((100vw - 720px) / 2))',zIndex:10000,overflow:'auto',padding:24,background:'#172a41',color:'#fff',border:'2px solid #94a3b8',borderRadius:16}}>
  <h2>{manager?'RC tool requests':'Request a tool'}</h2><button disabled={busy} onClick={onClose}>Close</button>
  {!manager&&<div><p>Describe the function you need and its purpose. RC reviews requests before installing tools. Approval does not include paid services.</p><textarea aria-label="Tool request" maxLength={1500} rows={5} value={text} onChange={e=>setText(e.target.value)}/><button disabled={busy||text.trim().length<5} onClick={()=>void submit()}>Submit Request</button></div>}
  {notice&&<p role="status">{notice}</p>}
  {requests.map(item=><article key={`${item.roomId??roomId}:${item.id}`} style={{padding:12,borderBottom:'1px solid #94a3b8'}}><strong>{item.roomName??'This room'} · {item.status}</strong><p style={{whiteSpace:'pre-wrap'}}>{item.text}</p>{manager&&item.status!=='rejected'&&<div><select aria-label={`Tool for request ${item.id}`} disabled={busy||item.status==='approved'} value={choices[item.id]??item.toolId??''} onChange={e=>setChoices(old=>({...old,[item.id]:e.target.value}))}><option value="">Select tool</option>{TOOL_REGISTRY.filter(tool=>tool.id!=='toolbox').map(tool=><option key={tool.id} value={tool.id}>{tool.label}</option>)}</select><button disabled={busy||!(choices[item.id]??item.toolId)} onClick={()=>void review(item,'approve')}>{item.status==='approved'?'Retry Installation':'Approve and Install'}</button>{item.status==='pending'&&<button disabled={busy} onClick={()=>void review(item,'reject')}>Reject</button>}</div>}</article>)}
  {!requests.length&&<p>No requests.</p>}
 </section>;
}
