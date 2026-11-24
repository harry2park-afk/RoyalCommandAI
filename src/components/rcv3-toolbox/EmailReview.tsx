'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import HelpText from '@/components/help/HelpText';
type Notice={id:string;envelope:{id:string;recipients:string[];subject:string;text:string};status:string;digest:string;provider_id?:string|null;created_at:string};
export default function EmailReview({onClose}:{onClose:()=>void}){
 const [notices,setNotices]=useState<Notice[]>([]),[configured,setConfigured]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [recipient,setRecipient]=useState(''),[subject,setSubject]=useState(''),[text,setText]=useState('');
 const draftRequest=useRef<{id:string;value:string}|null>(null);
 const call=useCallback(async(method:string,body?:unknown)=>{
  const response=await fetch('/api/rcv3/email-notices',{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
  const value=await response.json();if(!response.ok)throw new Error('request');return value;
 },[]);
 const refresh=useCallback(async()=>{const value=await call('GET');setNotices(value.notices);setConfigured(value.configured===true);},[call]);
 useEffect(()=>{let active=true;void call('GET').then(value=>{if(active){setNotices(value.notices);setConfigured(value.configured===true);}}).catch(()=>{if(active)setMessage('emailReviewFailure');});return()=>{active=false;};},[call]);
 async function saveDraft(){
  if(busy)return;setBusy(true);setMessage('');try{
   const value=JSON.stringify({recipient,subject,text});if(draftRequest.current?.value!==value)draftRequest.current={id:crypto.randomUUID(),value};
   await call('POST',{recipient,subject,text,requestId:draftRequest.current!.id});draftRequest.current=null;setRecipient('');setSubject('');setText('');setMessage('emailDraftSaved');await refresh();
  }catch{setMessage('emailReviewFailure');}finally{setBusy(false);}
 }
 async function decide(notice:Notice,decision:'approve'|'reject'){
  if(busy)return;setBusy(true);setMessage('');try{await call('PUT',{id:notice.id,digest:notice.digest,decision});setMessage(decision==='approve'?'emailReviewApproved':'emailReviewRejected');await refresh();}catch{setMessage('emailReviewFailure');}finally{setBusy(false);}
 }
 return <section role="dialog" aria-modal="true" aria-label="Email Review" style={{position:'fixed',inset:'5% max(16px, calc((100vw - 800px) / 2))',zIndex:10010,overflow:'auto',padding:24,background:'#172a41',color:'#fff',border:'2px solid #94a3b8',borderRadius:16}}>
  <h2>Email Review</h2><button disabled={busy} onClick={onClose}>Close</button>{' '}<button disabled={busy} onClick={()=>{setBusy(true);void refresh().catch(()=>setMessage('emailReviewFailure')).finally(()=>setBusy(false));}}>Refresh</button>
  <p><HelpText helpKey="emailReviewOverview"/></p>{!configured&&<p><HelpText helpKey="emailReviewUnconfigured"/></p>}{message&&<p role="status"><HelpText helpKey={message}/></p>}
  <form onSubmit={event=>{event.preventDefault();void saveDraft();}}>
   <h3>Create Draft</h3><label>Recipient<input type="email" required value={recipient} onChange={e=>setRecipient(e.target.value)}/></label><label>Subject<input required maxLength={200} value={subject} onChange={e=>setSubject(e.target.value)}/></label><label>Message<textarea required rows={6} maxLength={20000} value={text} onChange={e=>setText(e.target.value)} style={{width:'100%'}}/></label><button disabled={busy||!recipient.trim()||!subject.trim()||!text.trim()}>Save Draft</button>
  </form>
  {notices.map(notice=><article key={notice.id} style={{padding:'20px 0',borderTop:'1px solid #94a3b8'}}>
   <p>Status: <strong>{notice.status}</strong></p><p>Recipient: <span>{notice.envelope.recipients.join(', ')}</span></p><p>Subject: <span style={{whiteSpace:'pre-wrap'}}>{notice.envelope.subject}</span></p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontFamily:'inherit'}}>{notice.envelope.text}</pre>
   {notice.status==='accepted'&&<p><HelpText helpKey="emailProviderAccepted"/></p>}
   {notice.status==='pending'&&<div><button disabled={busy||!configured} onClick={()=>void decide(notice,'approve')}>Approve Email</button>{' '}<button disabled={busy} onClick={()=>void decide(notice,'reject')}>Reject</button></div>}
  </article>)}
 </section>;
}
