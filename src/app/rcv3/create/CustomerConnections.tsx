"use client";
import { useEffect, useState } from "react";
import HelpText from "@/components/help/HelpText";
import type { AIProviderId } from "@/lib/ai/types";
import type { CustomerPhoneRecommendation } from "@/lib/rcv3/customer-phone";
import type { RoomDraftInput } from "@/lib/rcv3/room-draft";
import CustomerPhoneSetup from "./CustomerPhoneSetup";
import { simpleCreateText } from "@/lib/locale/rcv3-simple-create";

type Setup = NonNullable<RoomDraftInput["onboarding"]>;
type AIStatus = {personalAvailable:boolean;providers:{id:AIProviderId;platform:boolean;personalSupported:boolean;personal:boolean}[]};
type MailStatus = {configured:boolean;connected:boolean;email:string};
async function request(path:string,body?:unknown,method="POST") {
  const response=await fetch(`/api/rcv3/${path}`,{method:body?method:"GET",cache:"no-store",signal:AbortSignal.timeout(60000),...(body?{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{})});
  const result=await response.json(); if(!response.ok)throw new Error(result.code || "RCV3_ERROR");return result;
}
function errorHelp(error:unknown) {
  const code=error instanceof Error?error.message:"";
  if(code.startsWith("RCV3_PHONE"))return "setupPhoneUnavailable";
  if(code.includes("KEY")||code.includes("CREDENTIAL")||code.includes("AI"))return "setupAIError";
  return "setupError";
}
export default function CustomerConnections({input,setup,update,save,providers,disabled,language}: {
  input:RoomDraftInput;setup:Setup;update:(next:RoomDraftInput)=>void;save:()=>Promise<string|null|undefined>;
  providers:{id:AIProviderId;label:string}[];disabled:boolean;language:string;
}) {
  const [ai,setAI]=useState<AIStatus|null>(null),[mail,setMail]=useState<MailStatus|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const [keys,setKeys]=useState<Partial<Record<AIProviderId,string>>>({});
  const [phoneResult,setPhone]=useState<CustomerPhoneRecommendation|null>(null);
  const phone=phoneResult?.country===setup.country?phoneResult:null;
  useEffect(()=>{let current=true;
    request("customer-ai").then(result=>{if(current)setAI(result);}).catch(()=>{if(current)setMessage("setupError");});
    return()=>{current=false;};
  },[]);
  useEffect(()=>{let current=true;
    if(input.secretary&&setup.emailEnabled)request("customer-mail").then(result=>{if(current)setMail(result);}).catch(()=>{if(current)setMessage("setupError");});
    return()=>{current=false;};
  },[input.secretary,setup.emailEnabled]);
  useEffect(()=>{let current=true;
    if(input.secretary&&setup.phoneRequested&&setup.country)request(`customer-phone?${new URLSearchParams({country:setup.country})}`).then(result=>{if(current)setPhone(result);}).catch(()=>{if(current)setMessage("setupPhoneUnavailable");});
    return()=>{current=false;};
  },[input.secretary,setup.phoneRequested,setup.country]);
  async function run(action:()=>Promise<void>) {
    if(busy)return;setBusy(true);setMessage("");
    try{await action();}catch(e){setMessage(errorHelp(e));}finally{setBusy(false);}
  }
  function changeSetup(patch:Partial<Setup>) {update({...input,onboarding:{...setup,...patch}});}
  return <section aria-label="Your connections">
    <p><HelpText helpKey="setupAI"/></p>
    {input.providers.map(id=>{
      const status=ai?.providers.find(p=>p.id===id), personal=setup.aiSources[id]==="personal";
      return <fieldset key={id} disabled={disabled||busy}><legend>{providers.find(p=>p.id===id)?.label || id}</legend>
        <label>AI connection<select value={personal?"personal":"platform"} onChange={event=>{setKeys(old=>({...old,[id]:""}));changeSetup({aiSources:{...setup.aiSources,[id]:event.target.value as "platform"|"personal"}});}}>
          <option value="platform">Use RC AI</option>
          <option value="personal" disabled={!status?.personalSupported||!ai?.personalAvailable}>Use my API account</option>
        </select></label>
        <p><HelpText helpKey={!status?"setupChecking":personal?(status.personal?"setupPersonalConnected":"setupPersonalNeeded"):(status.platform?"setupPlatformAvailable":"setupAIUnavailable")}/></p>
        {personal&&<>
          <p><HelpText helpKey="setupPersonalAI"/></p>
          <label>API key<input type="password" autoComplete="new-password" spellCheck={false} maxLength={4096} value={keys[id]||""} onChange={event=>setKeys(old=>({...old,[id]:event.target.value}))}/></label>
          <button type="button" disabled={!keys[id]?.trim()} onClick={()=>void run(async()=>{
            const apiKey=keys[id]||"";setKeys(old=>({...old,[id]:""}));
            await request("customer-ai",{provider:id,apiKey},"PUT");setAI(await request("customer-ai"));setMessage("setupVerified");
          })}>Connect My AI</button>
          {status?.personal&&<button type="button" onClick={()=>void run(async()=>{await request("customer-ai",{provider:id},"DELETE");setAI(await request("customer-ai"));})}>Disconnect My AI</button>}
        </>}
        {!personal&&status?.personalSupported&&!ai?.personalAvailable&&<p><HelpText helpKey="setupPersonalUnavailable"/></p>}
      </fieldset>;
    })}
    {input.secretary&&<fieldset disabled={disabled||busy}>
      <legend>Email and calls</legend>
      <label><input type="checkbox" checked={setup.emailEnabled} onChange={event=>changeSetup({emailEnabled:event.target.checked})}/>Connect my Gmail</label>
      {(!setup.emailEnabled||!mail?.connected)&&<p role="status">{simpleCreateText("mailNotConnected",language)}</p>}
      {setup.emailEnabled&&<>
        <p><HelpText helpKey="setupEmail"/></p>
        <p><HelpText helpKey={mail?.connected?"setupMailConnected":"setupMailNeeded"}/>{mail?.connected?` ${mail.email}`:""}</p>
        {mail?.connected&&mail.email.toLowerCase()!==input.secretarySetup.email.trim().toLowerCase()&&<button type="button" onClick={()=>update({...input,secretarySetup:{...input.secretarySetup,email:mail.email}})}>Use Connected Email</button>}
        <button type="button" disabled={!mail?.configured} onClick={()=>void run(async()=>{
          const draftId=await save();if(!draftId)throw new Error("RCV3_ERROR");
          const result=await request("customer-mail",{draftId});
          if(new URL(result.url).origin!=="https://accounts.google.com")throw new Error("RCV3_ERROR");
          window.location.assign(result.url);
        })}>Connect Email</button>
        <button type="button" onClick={()=>void run(async()=>setMail(await request("customer-mail")))}>Check Connection</button>
      </>}
      <label><input type="checkbox" checked={Boolean(setup.phoneRequested)} onChange={event=>{setPhone(null);changeSetup({phoneRequested:event.target.checked,phoneOfferId:"",phoneNumberId:"",phoneConsent:false});}}/>Use my own secretary phone number</label>
      {!setup.phoneNumberId&&<p role="status">{simpleCreateText("phoneNotConnected",language)}</p>}
      {setup.phoneRequested&&<>
        <p><HelpText helpKey="setupPhone"/></p>
        {phone?.purchaseUrl?<>
          <p>Phone provider: {phone.label}</p>
          <a href={phone.purchaseUrl} target="_blank" rel="noopener noreferrer">Buy a Number from {phone.label} ↗</a>
          <p><a href={phone.requirementsUrl} target="_blank" rel="noopener noreferrer">Country requirements ↗</a></p>
          <p><HelpText helpKey="setupCarrierBilling"/></p>
        </>:<p><HelpText helpKey={phone?"setupPhoneUnavailable":"setupChecking"}/></p>}
        {phone?.provider==="twilio"&&<CustomerPhoneSetup key={setup.country} setup={setup} change={changeSetup} disabled={disabled||busy}/>}
      </>}
    </fieldset>}
    {message&&<p role="status"><HelpText helpKey={message}/></p>}
  </section>;
}
