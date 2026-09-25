"use client";
import { useEffect, useState } from "react";
import { simpleCreateText } from "@/lib/locale/rcv3-simple-create";

type Balance={customerNumber:string;balance:number;cost:number};
export default function PreviewTokenPanel({draftId,revision,disabled,language}:{draftId:string;revision:number;disabled:boolean;language:string}) {
 const [account,setAccount]=useState<Balance|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [signature,setSignature]=useState(""),[agreed,setAgreed]=useState(false),[url,setUrl]=useState("");
 const t=(key:Parameters<typeof simpleCreateText>[0])=>simpleCreateText(key,language);
 useEffect(()=>{let active=true;fetch("/api/rcv3/token-room",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(v=>{if(active)setAccount(v);}).catch(()=>{});return()=>{active=false;};},[]);
 async function open() {
  if(busy||disabled||!account||!agreed||signature.trim().length<2)return;
  setBusy(true);setError("");
  try {
   const response=await fetch("/api/rcv3/token-room",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({draftId,expectedRevision:revision,signature,termsConsent:true})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.code||"RCV3_ERROR");
   if(!/^\/rcv3\?room=[a-f0-9-]+$/.test(result.url))throw new Error("RCV3_ERROR");
   setAccount(prev=>prev?{...prev,balance:result.balance}:prev);setUrl(result.url);
  } catch(e) {setError(e instanceof Error?e.message:"RCV3_ERROR");}
  finally{setBusy(false);}
 }
 return <section aria-label={t("payment")}>
  <button type="button" disabled>{t("cardChoice")} · Not Connected</button>{" "}
  <button type="button" disabled>{t("bankChoice")} · Not Connected</button>
  {account&&<div>
   <p>{account.customerNumber} · {t("tokenBalance")}: <strong>{account.balance.toLocaleString(language)}</strong></p>
   <p>{t("tokenPreviewTerms")}</p>
   <label><input type="checkbox" checked={agreed} disabled={busy||!!url} onChange={e=>setAgreed(e.target.checked)}/>{t("tokenAgree")}</label>
   <label>{t("signature")}<input maxLength={160} autoComplete="name" value={signature} disabled={busy||!!url} onChange={e=>setSignature(e.target.value)}/></label>
   {url?<a href={url}>{t("open")}</a>:<button type="button" disabled={busy||disabled||!agreed||signature.trim().length<2||account.balance<account.cost} onClick={()=>void open()}>{busy?t("wait"):t("tokenOpen")}</button>}
  </div>}
  {error&&<p role="alert">{error==="RCV3_LIMIT"?t("tokenInsufficient"):error==="RCV3_CONFLICT"?t("tokenConflict"):t("tokenFailed")}</p>}
 </section>;
}
