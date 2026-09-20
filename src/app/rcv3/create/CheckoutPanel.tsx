"use client";
import { useEffect, useRef, useState } from "react";
import HelpText from "@/components/help/HelpText";
import { creationText, type CreationMessage } from "@/lib/locale/rcv3-creation";
type Quote = {quoteHash:string;termsHash:string;terms:{version:string;text:string};currency:string;totalMinor:number;lines:{serviceId:string;label:string;amountMinor:number}[];checkoutEnabled:boolean};
async function post(path:string,body:unknown) {
 const r=await fetch(`/api/rcv3/checkout/${path}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 const d=await r.json();if(!r.ok)throw new Error(d.code||"RCV3_ERROR");return d;
}
export default function CheckoutPanel({draftId,revision,disabled,language,onFork}:{onFork:()=>void;draftId:string;revision:number;disabled:boolean;language:string}) {
 const [quote,setQuote]=useState<Quote|null>(null),[accepted,setAccepted]=useState(false),[signature,setSignature]=useState("");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState<CreationMessage|"">("");
 const [checking,setChecking]=useState(false),[roomUrl,setRoomUrl]=useState("");
 const flight=useRef(false);
 async function run(action:()=>Promise<void>) {
  if(flight.current)return;flight.current=true;setBusy(true);setMessage("");
  try{await action();}catch(e){const code=e instanceof Error?e.message:"";setMessage(["RCV3_CHECKOUT_NOT_CONFIGURED","RCV3_PRICE_NOT_CONFIGURED","RCV3_ACTIVATION_NOT_READY"].includes(code)?"paymentSetup":code==="RCV3_SERVICE_NOT_READY"?"serviceNotReady":code==="RCV3_ORDER_LOCKED"||code==="RCV3_QUOTE_EXPIRED"?"orderLocked":"checkoutError");}
  finally{flight.current=false;setBusy(false);}
 }
 async function check() {await run(async()=>{const result=await post("status",{draftId});if(result.status==="active"&&/^\/rcv3\?room=[a-f0-9-]+$/.test(result.url)){setRoomUrl(result.url);setMessage("roomReady");}else setMessage("paymentPending");});}
 useEffect(()=>{
  const returned=new URLSearchParams(window.location.search);
  let active=true;
  if(returned.get("checkout")&&returned.get("draft")===draftId) {
   void post("status",{draftId}).then(result=>{
    if(!active)return;
    setChecking(true);
    if(result.status==="active"&&/^\/rcv3\?room=[a-f0-9-]+$/.test(result.url)){setRoomUrl(result.url);setMessage("roomReady");}
    else setMessage("paymentPending");
   }).catch(()=>{if(active){setChecking(true);setMessage("checkoutError");}});
  }
  // Return parameters trigger only authenticated server lookup; never activation.
  return ()=>{active=false;};
 },[draftId]);
 const money=(minor:number)=>new Intl.NumberFormat(language||"en",{style:"currency",currency:quote?.currency||"AUD"}).format(minor/100);
 return <section aria-label="Monthly subscription">
  <p>{<HelpText helpKey="creation.paymentFlow"/>}</p>
  <p>{<HelpText helpKey="creation.sandbox"/>}</p>
  {!checking&&!roomUrl&&<button disabled={busy||disabled} onClick={()=>{setChecking(true);void check();}}>Check Existing Payment</button>}
  {message&&<p role="status">{<HelpText helpKey={`creation.${message}`}/>}</p>}
  {message==="orderLocked"&&<button disabled={busy||disabled} onClick={onFork}>Save as New Draft</button>}
  {roomUrl?<a href={roomUrl}>Open Room</a>:checking?<><button disabled={busy} onClick={()=>void check()}>{busy?"Checking…":"Check Payment"}</button><button disabled={busy} onClick={()=>{setChecking(false);setMessage("");}}>Back</button></>:<>
   <button disabled={disabled||busy} onClick={()=>void run(async()=>{setQuote(null);setAccepted(false);const q=await post("quote",{draftId,expectedRevision:revision});setQuote(q);})}>{busy?"Please wait…":"Review Monthly Price"}</button>
   {quote&&<>
    <table><caption>{creationText("monthlyTotal","en")}: {money(quote.totalMinor)}</caption><tbody>{quote.lines.map(l=><tr key={l.serviceId}><td>{l.label}</td><td>{money(l.amountMinor)}</td></tr>)}</tbody></table>
    <p>{<HelpText helpKey="creation.taxIncluded"/>}</p>
    <h3>{creationText("termsTitle","en")} · {quote.terms.version}</h3>
    <div style={{whiteSpace:"pre-wrap",maxHeight:320,overflowY:"auto",border:"1px solid #596273",padding:16}} tabIndex={0}>{quote.terms.text}</div>
    <label><input type="checkbox" checked={accepted} disabled={busy} onChange={e=>setAccepted(e.target.checked)}/>{creationText("recurringConsent","en")}</label><p><HelpText helpKey="creation.recurringConsent"/></p>
    <label>{creationText("signature","en")}<input maxLength={160} autoComplete="name" value={signature} disabled={busy} onChange={e=>setSignature(e.target.value)}/></label>
    <button disabled={disabled||busy||!accepted||signature.trim().length<2||!quote.checkoutEnabled} onClick={()=>void run(async()=>{
     const result=await post("start",{draftId,expectedRevision:revision,quoteHash:quote.quoteHash,termsHash:quote.termsHash,signature,recurringConsent:accepted});
     if(result.url&&new URL(result.url).origin==="https://checkout.stripe.com")window.location.assign(result.url);
     else {setChecking(true);setMessage("paymentPending");}
    })}>{busy?"Please wait…":"Continue to Payment"}</button>
   </>}
  </>}
 </section>;
}
