"use client";
import { useEffect, useRef, useState } from "react";
import HelpText from "@/components/help/HelpText";
import type { RoomDraftInput } from "@/lib/rcv3/room-draft";
type Setup=NonNullable<RoomDraftInput["onboarding"]>;
type Status={connected:boolean;routingReady:boolean;accountConnectionAvailable:boolean;numbers:{id:string;number:string}[]};
async function accountRequest(body?:unknown):Promise<Status> {
 const response=await fetch("/api/rcv3/customer-phone/account",{method:body?"PUT":"GET",cache:"no-store",signal:AbortSignal.timeout(30000),...(body?{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw new Error("PHONE_CONNECTION_FAILED");return data;
}
export default function CustomerPhoneSetup({setup,change,disabled}:{setup:Setup;change:(patch:Partial<Setup>)=>void;disabled:boolean}) {
 const [status,setStatus]=useState<Status|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 const [sid,setSid]=useState(""),[token,setToken]=useState("");
 const pending=useRef(false);
 useEffect(()=>{let active=true;accountRequest().then(value=>{if(active)setStatus(value);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[]);
 async function connect() {
  if(pending.current)return;pending.current=true;setBusy(true);setError(false);
  const credential={accountSid:sid.trim(),authToken:token.trim()};setToken("");
  try{await accountRequest(credential);setStatus(await accountRequest());change({phoneNumberId:"",phoneConsent:false});}
  catch{setError(true);}finally{pending.current=false;setBusy(false);}
 }
 return <fieldset disabled={disabled||busy}>
  <legend>Connect your own phone account</legend>
  <p><HelpText helpKey="setupCarrierAccount"/></p>
  {status?.accountConnectionAvailable&&<details><summary>{status?.connected?"Update phone account":"Connect phone account"}</summary>
   <label>Twilio Account SID<input autoComplete="off" spellCheck={false} maxLength={34} value={sid} onChange={e=>setSid(e.target.value)}/></label>
   <label>Twilio Auth Token<input type="password" autoComplete="new-password" spellCheck={false} maxLength={32} value={token} onChange={e=>setToken(e.target.value)}/></label>
   <button type="button" disabled={!/^AC[a-f0-9]{32}$/i.test(sid.trim())||!/^[a-f0-9]{32}$/i.test(token.trim())} onClick={()=>void connect()}>Connect Phone Account</button>
  </details>}
  {status?.connected&&<>
   <label>Your purchased number<select value={setup.phoneNumberId||""} onChange={e=>change({phoneNumberId:e.target.value,phoneConsent:false})}><option value="">Choose your number</option>{status.numbers.map(n=><option key={n.id} value={n.id}>{n.number}</option>)}</select></label>
   {!status.numbers.length&&<p><HelpText helpKey="setupOwnedNumbersEmpty"/></p>}
   <button type="button" onClick={()=>{if(pending.current)return;pending.current=true;setBusy(true);setError(false);void accountRequest().then(setStatus).catch(()=>setError(true)).finally(()=>{pending.current=false;setBusy(false);});}}>Refresh Numbers</button>
  </>}
  {status&&!status.routingReady&&<p><HelpText helpKey="setupPhoneRoutingPending"/></p>}
  {setup.phoneNumberId&&<label><input type="checkbox" checked={Boolean(setup.phoneConsent)} onChange={e=>change({phoneConsent:e.target.checked})}/> <HelpText helpKey="setupPhoneConsent"/></label>}
  {error&&<p role="alert"><HelpText helpKey="setupPhoneAccountError"/></p>}
 </fieldset>;
}
