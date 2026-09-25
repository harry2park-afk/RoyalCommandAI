"use client";
import { useEffect, useState } from "react";
import { simpleCreateText } from "@/lib/locale/rcv3-simple-create";

type Balance={customerNumber:string;balance:number;cost:number};
export default function PreviewTokenPanel({draftId,revision,disabled,language}:{draftId:string;revision:number;disabled:boolean;language:string}) {
 const [account,setAccount]=useState<Balance|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [signature,setSignature]=useState(""),[agreed,setAgreed]=useState(false),[url,setUrl]=useState("");
 const [showBank,setShowBank]=useState(false),[bank,setBank]=useState("");
 const t=(key:Parameters<typeof simpleCreateText>[0])=>simpleCreateText(key,language);
 useEffect(()=>{let active=true;fetch("/api/rcv3/token-room",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(v=>{if(active)setAccount(v);}).catch(()=>{}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
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
  <button type="button" aria-expanded={showBank} onClick={()=>setShowBank(v=>!v)}>{t("bankChoice")}</button>
  {showBank&&<div style={{border:"1px solid #466078",borderRadius:12,padding:16,marginTop:12,marginBottom:16}}>
   <p>{t("bankAccount")}: <strong>ROYAL COMMAND PTY LTD</strong></p>
   <p>BSB: <strong>032070</strong> · {language.startsWith("ko")?"계좌번호":"Account number"}: <strong>914904</strong></p>
   <p>{t("bankReference")}: <strong>{account?.customerNumber??(language.startsWith("ko")?"로그인 후 RC 번호 확인":"Sign in to view RC number")}</strong></p>
   <label htmlFor="rc-bank-select">{language.startsWith("ko")?"이용할 은행 선택":"Choose your bank"}</label>{" "}
   <select id="rc-bank-select" value={bank} onChange={e=>setBank(e.target.value)}>
    <option value="">{language.startsWith("ko")?"은행을 선택하세요":"Select a bank"}</option>
    <option value="anz">ANZ</option><option value="cba">CBA (CommBank)</option><option value="westpac">Westpac</option>
   </select>
   {bank&&<p><a href={{anz:"https://www.anz.com.au/personal/internet-banking/",cba:"https://www.my.commbank.com.au/netbank/Logon/Logon.aspx",westpac:"https://banking.westpac.com.au/"}[bank as "anz"|"cba"|"westpac"]} rel="noreferrer">{language.startsWith("ko")?`${bank==="westpac"?"Westpac":bank.toUpperCase()} 공식 은행 로그인으로 이동`:`Continue to ${bank.toUpperCase()} official bank sign in`}</a></p>}
   <p role="status">{language.startsWith("ko")?"은행 사이트에서 직접 로그인하고 수취인 계좌와 본인의 RC 번호를 입력하세요. RC는 은행 비밀번호를 받지 않습니다. 월 이용료와 실제 입금을 확인하기 전에는 방이 열리지 않으며, 현재 자동 입금 확인은 연결되지 않았습니다.":"Sign in on the bank's own site and enter the recipient account and your RC number yourself. RC never receives your bank password. Your room cannot open until the monthly amount and actual deposit are verified; automatic deposit verification is not connected."}</p>
  </div>}
  {!loading&&!account&&<p role="status">{t("tokenAccountUnavailable")}</p>}
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
