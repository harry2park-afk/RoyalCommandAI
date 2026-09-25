"use client";
import { useEffect, useRef, useState } from "react";
import { simpleCreateText } from "@/lib/locale/rcv3-simple-create";
import { selectedCreationText, type CreationMessage } from "@/lib/locale/rcv3-creation";
type Quote = {quoteHash:string;termsHash:string;terms:{version:string;text:string};currency:string;totalMinor:number;lines:{serviceId:string;label:string;amountMinor:number}[];checkoutEnabled:boolean};
async function post(path:string,body:unknown) {
 const r=await fetch(`/api/rcv3/checkout/${path}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 const d=await r.json();if(!r.ok)throw new Error(d.code||"RCV3_ERROR");return d;
}
export default function CheckoutPanel({draftId,revision,disabled,language,onFork}:{onFork:()=>void;draftId:string;revision:number;disabled:boolean;language:string}) {
 const [quote,setQuote]=useState<Quote|null>(null),[accepted,setAccepted]=useState(false),[signature,setSignature]=useState("");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState<CreationMessage|"">("");
 const [checking,setChecking]=useState(false),[roomUrl,setRoomUrl]=useState("");
 const [paymentMethod,setPaymentMethod]=useState<"card"|"bank"|"balance">("card");
 const flight=useRef(false);
 const t=(key:Parameters<typeof simpleCreateText>[0])=>simpleCreateText(key,language);
 async function run(action:()=>Promise<void>) {
  if(flight.current)return;flight.current=true;setBusy(true);setMessage("");
  try{await action();}catch(e){const code=e instanceof Error?e.message:"";setMessage(code==="RCV3_COUNTRY_NOT_SUPPORTED"?"countryUnavailable":/RCV3_(?:AI_|PERSONAL_AI_|EMAIL_|PHONE_)/.test(code)?"setupConnection":["RCV3_CHECKOUT_NOT_CONFIGURED","RCV3_PRICE_NOT_CONFIGURED","RCV3_ACTIVATION_NOT_READY"].includes(code)?"paymentSetup":code==="RCV3_SERVICE_NOT_READY"?"serviceNotReady":code==="RCV3_ORDER_LOCKED"||code==="RCV3_QUOTE_EXPIRED"?"orderLocked":"checkoutError");}
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
 useEffect(()=>{
  const returned=new URLSearchParams(window.location.search);
  if(disabled||(returned.has("checkout")&&returned.get("draft")===draftId))return;
  let active=true;
  const timer=window.setTimeout(()=>{
   void run(async()=>{const q=await post("quote",{draftId,expectedRevision:revision});if(active)setQuote(q);});
  },500);
  return ()=>{active=false;window.clearTimeout(timer);};
  // The parent remounts this panel when the saved snapshot changes.
 },[disabled,draftId,revision]);
 const money=(minor:number)=>new Intl.NumberFormat(language||"en",{style:"currency",currency:quote?.currency||"AUD"}).format(minor/100);
 return <section aria-label="Monthly subscription">
  <p>{selectedCreationText("sandbox",language)}</p>
  <div role="group" aria-label={selectedCreationText("sandbox",language)}>
   <label><input type="radio" name={`payment-method-${draftId}`} checked={paymentMethod==="card"} onChange={()=>setPaymentMethod("card")}/>{t("cardChoice")}</label>
   <label><input type="radio" name={`payment-method-${draftId}`} checked={paymentMethod==="bank"} onChange={()=>setPaymentMethod("bank")}/>{t("bankChoice")}</label>
   <label><input type="radio" name={`payment-method-${draftId}`} checked={paymentMethod==="balance"} onChange={()=>setPaymentMethod("balance")}/>{t("balanceChoice")}</label>
  </div>
  {paymentMethod==="balance"?<div role="status"><p>{t("balancePending")}</p></div>:paymentMethod==="bank"?<div role="status">
   {quote?<>
    <p>{t("bankAccount")}: <strong>ROYAL COMMAND PTY LTD</strong></p>
    <p>BSB: <strong>032070</strong> · Account: <strong>914904</strong></p>
    <p>{t("bankReference")}: <strong>RC {language.toLowerCase().startsWith("ko")?"고객번호":"customer number"}</strong></p>
    <p><strong>{t("total")}: {money(quote.totalMinor)}</strong></p>
   </>:<p>{t("bankNoQuote")}</p>}
   <p>{t("bankInstructions")}</p>
  </div>:<>
  {!checking&&!roomUrl&&<button disabled={busy||disabled} onClick={()=>{setChecking(true);void check();}}>{t("check")}</button>}
  {message&&<p role="status">{selectedCreationText(message,language)}</p>}
  {message==="orderLocked"&&<button disabled={busy||disabled} onClick={onFork}>{t("fork")}</button>}
  {roomUrl?<a href={roomUrl}>{t("open")}</a>:checking?<><button disabled={busy} onClick={()=>void check()}>{busy?t("wait"):t("check")}</button><button disabled={busy} onClick={()=>{setChecking(false);setMessage("");}}>{t("return")}</button></>:<>
   {!quote&&<button disabled={disabled||busy} onClick={()=>void run(async()=>{setQuote(null);setAccepted(false);const q=await post("quote",{draftId,expectedRevision:revision});setQuote(q);})}>{busy?t("wait"):t("price")}</button>}
   {quote&&<>
    <table><tbody>{quote.lines.map(l=><tr key={l.serviceId}><td>{l.label}</td><td>{money(l.amountMinor)}</td></tr>)}</tbody></table>
    <p>{selectedCreationText("taxIncluded",language)}</p>
    <details><summary>{t("terms")} · {quote.terms.version}</summary>
    <div style={{whiteSpace:"pre-wrap",maxHeight:320,overflowY:"auto",border:"1px solid #596273",padding:16}} tabIndex={0}>{quote.terms.text}</div></details>
    <label><input type="checkbox" checked={accepted} disabled={busy} onChange={e=>setAccepted(e.target.checked)}/>{t("consent")}</label>
    <label>{t("signature")}<input maxLength={160} autoComplete="name" value={signature} disabled={busy} onChange={e=>setSignature(e.target.value)}/></label>
    <p><strong>{t("total")}: {money(quote.totalMinor)}</strong></p>
    <button disabled={disabled||busy||!accepted||signature.trim().length<2||!quote.checkoutEnabled} onClick={()=>void run(async()=>{
     const result=await post("start",{draftId,expectedRevision:revision,quoteHash:quote.quoteHash,termsHash:quote.termsHash,signature,recurringConsent:accepted});
     if(result.url&&new URL(result.url).origin==="https://checkout.stripe.com")window.location.assign(result.url);
     else {setChecking(true);setMessage("paymentPending");}
    })}>{busy?t("wait"):t("approve")}</button>
   </>}
  </>}
  </>}
 </section>;
}
