'use client';
import {useState} from 'react';
import HelpText from '@/components/help/HelpText';
export default function PaymentGate({roomId,bankPending=false,language="en",onCheck,onClose}:{roomId:string;bankPending?:boolean;language?:string;onCheck:()=>Promise<void>;onClose:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(false);
 async function pay(action:'payment'|'card'='payment'){
  if(busy)return;setBusy(true);setError(false);
  try{
   const response=await fetch('/api/rcv3/checkout/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId,action}),signal:AbortSignal.timeout(30000)});
   const value=await response.json();
   if(!response.ok || !['https://invoice.stripe.com','https://billing.stripe.com'].includes(new URL(value.url).origin))throw new Error('payment');
   window.location.assign(value.url);
  }catch{setError(true);}finally{setBusy(false);}
 }
 return <section role="dialog" aria-modal="true" aria-label="Billing" style={{position:'fixed',inset:'20% max(16px, calc((100vw - 520px) / 2)) auto',zIndex:10000,padding:24,background:'#172a41',color:'#fff',border:'2px solid #94a3b8',borderRadius:16}}>
  <h2>Billing</h2>{bankPending?<p role="status">{language.startsWith('ko')?'방이 만들어졌습니다. 입금 확인까지 기다려 주세요. 연결 기능은 잠겨 있습니다.':'Your room is created. Please wait for payment confirmation. Connections are locked.'}</p>:<><p><HelpText helpKey="toolPaymentRequired"/></p><p><HelpText helpKey="creation.sandbox"/></p></>}
  {error&&<p role="alert"><HelpText helpKey="toolPaymentUnavailable"/></p>}
  {!bankPending&&<><button disabled={busy} onClick={()=>void pay()}>Pay</button>{' '}
  <button disabled={busy} onClick={()=>void pay('card')}>Update Card</button>{' '}</>}
  {bankPending&&<><a href="/rcv3/create">Use available tokens</a>{' '}</>}
  <button disabled={busy} onClick={()=>{setBusy(true);void onCheck().finally(()=>setBusy(false));}}>Check Payment</button>{' '}
  <button disabled={busy} onClick={onClose}>Close</button>
 </section>;
}
