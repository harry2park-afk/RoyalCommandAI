"use client";
import { useEffect, useState } from "react";
import { simpleCreateText } from "@/lib/locale/rcv3-simple-create";
import BankPicker from "./BankPicker";

type Balance={customerNumber:string;balance:number;cost:number};
type Quote={currency:string;totalMinor:number;lines:{serviceId:string;label:string;amountMinor:number}[];quoteHash:string;terms:{version:string;text:string};termsHash:string};
export default function PreviewTokenPanel({draftId,revision,disabled,language}:{draftId:string;revision:number;disabled:boolean;language:string}) {
 const [account,setAccount]=useState<Balance|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [signature,setSignature]=useState(""),[agreed,setAgreed]=useState(false),[url,setUrl]=useState("");
 const [showBank,setShowBank]=useState(false);
 const [pendingRoomUrl,setPendingRoomUrl]=useState("");
 const [bankNumber,setBankNumber]=useState(""),[quote,setQuote]=useState<Quote|null>(null),[bankError,setBankError]=useState(""),[bankBusy,setBankBusy]=useState(false),[bankAgreed,setBankAgreed]=useState(false),[bankSignature,setBankSignature]=useState(""),[bankSigned,setBankSigned]=useState(false);
 const t=(key:Parameters<typeof simpleCreateText>[0])=>simpleCreateText(key,language);
 useEffect(()=>{let active=true;fetch("/api/rcv3/token-room",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(v=>{if(active)setAccount(v);}).catch(()=>{}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 useEffect(()=>{let active=true;fetch("/api/rcv3/checkout/bank-start",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(v=>{if(active&&v?.customerNumber)setBankNumber(v.customerNumber);}).catch(()=>{});return()=>{active=false;};},[]);
 async function requestBankQuote() {
  if(disabled||bankBusy)return;
  setBankBusy(true);setBankError("");
  try {
   const response=await fetch("/api/rcv3/checkout/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({draftId,expectedRevision:revision})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.code||"RCV3_ERROR");
   setQuote(result);
  } catch(e) {setBankError(e instanceof Error?e.message:"RCV3_ERROR");}
  finally{setBankBusy(false);}
 }
 async function signBankRequest() {
  if(!quote||!bankNumber||disabled||bankBusy||!bankAgreed||bankSignature.trim().length<2)return;
  setBankBusy(true);setBankError("");
  try {
   const response=await fetch("/api/rcv3/checkout/bank-start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({draftId,expectedRevision:revision,quoteHash:quote.quoteHash,termsHash:quote.termsHash,signature:bankSignature,termsConsent:true})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.code||"RCV3_ERROR");
   if(result.status!=="pending")throw new Error("RCV3_ERROR");
   if(!/^\/rcv3\?room=[a-f0-9-]+$/.test(result.url))throw new Error("RCV3_ERROR");
   setPendingRoomUrl(result.url);setBankSigned(true);
  } catch(e) {setBankError(e instanceof Error?e.message:"RCV3_ERROR");}
  finally{setBankBusy(false);}
 }
 async function open() {
  if(busy||disabled||!account||!agreed||signature.trim().length<2)return;
  if(account.balance<account.cost){setError("RCV3_LIMIT");return;}
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
  {!quote?<button type="button" disabled={disabled||bankBusy} onClick={()=>void requestBankQuote()}>{bankBusy?t("wait"):(language.startsWith("ko")?"금액 확인":"Check amount")}</button>:<>
   <p><strong>{language.startsWith("ko")?"이용 금액":"Amount"}: {new Intl.NumberFormat(language||"en",{style:"currency",currency:quote.currency}).format(quote.totalMinor/100)}</strong></p>
   <details><summary>{t("terms")} · {quote.terms.version}</summary><div style={{whiteSpace:"pre-wrap",maxHeight:260,overflowY:"auto"}}>{quote.terms.text}</div></details>
   {!bankSigned?<><label><input type="checkbox" checked={bankAgreed} onChange={e=>setBankAgreed(e.target.checked)}/>{t("bankConsent")}</label>
   <label>{t("signature")}<input maxLength={160} autoComplete="name" value={bankSignature} onChange={e=>setBankSignature(e.target.value)}/></label>
   <button type="button" disabled={disabled||bankBusy||!bankNumber||!bankAgreed||bankSignature.trim().length<2} onClick={()=>void signBankRequest()}>{bankBusy?t("wait"):(language.startsWith("ko")?"방 만들기":"Create Room")}</button></>:<p role="status">{language.startsWith("ko")?"방이 만들어졌습니다. 확인 전까지 연결 기능은 잠겨 있습니다. 입금 확인까지 기다려 주세요.":"Your room is created. Connections remain locked until payment is confirmed. Please wait for confirmation."} <a href={pendingRoomUrl}>{t("open")}</a></p>}
  </>}
  {bankError&&<p role="alert">{bankError==="RCV3_CONFLICT"?t("tokenConflict"):(language.startsWith("ko")?`방을 만들 수 없습니다 (${bankError}). 저장한 방과 요금 설정을 확인하세요.`:`Could not create the room (${bankError}). Check your saved room and pricing setup.`)}</p>}
  <p>{language.startsWith("ko")?"보유 토큰으로 사용하면 별도 송금이 필요 없습니다. 토큰이 부족하면 방은 만들어져도 연결은 입금 확인까지 잠깁니다.":"You can use available tokens without a transfer. If tokens are insufficient, the room remains created and connections stay locked until payment is confirmed."}</p>
  <button type="button" disabled>{t("cardChoice")} · Not Connected</button>{" "}
  <button type="button" aria-expanded={showBank} onClick={()=>setShowBank(v=>!v)}>{t("bankChoice")}</button>
  {showBank&&<div style={{border:"1px solid #466078",borderRadius:12,padding:16,marginTop:12,marginBottom:16}}>
   <p>{t("bankAccount")}: <strong>ROYAL COMMAND PTY LTD</strong></p>
   <p>BSB: <strong>032070</strong> · {language.startsWith("ko")?"계좌번호":"Account number"}: <strong>914904</strong></p>
   <p>{t("bankReference")}: <strong>{bankNumber||account?.customerNumber||(language.startsWith("ko")?"로그인 후 RC 번호 확인":"Sign in to view RC number")}</strong></p>
   {quote&&<p><strong>{language.startsWith("ko")?"송금할 금액":"Transfer amount"}: {new Intl.NumberFormat(language||"en",{style:"currency",currency:quote.currency}).format(quote.totalMinor/100)}</strong></p>}
   <BankPicker customerNumber={bankNumber||account?.customerNumber||""} language={language}/>
   <p role="status">{language.startsWith("ko")?"은행 사이트에서 직접 로그인하고 수취인 계좌와 본인의 RC 번호를 입력하세요. RC는 은행 비밀번호를 받지 않습니다. 입금 확인 또는 보유 토큰 결제 후 유료 기능이 열립니다. 현재 RC는 은행 거래내역을 조회할 수 없습니다.":"Sign in on your bank's site and enter the recipient account and your RC number. RC never receives your bank password. Paid features unlock after the deposit is verified or you pay with available tokens. RC currently has no access to the bank's incoming transaction feed."}</p>
  </div>}
  {!loading&&!account&&<p role="status">{t("tokenAccountUnavailable")}</p>}
  {account&&<div>
   <p>{account.customerNumber} · {t("tokenBalance")}: <strong>{account.balance.toLocaleString(language)}</strong></p>
   <p>{t("tokenPreviewTerms")}</p>
   <label><input type="checkbox" checked={agreed} disabled={busy||!!url} onChange={e=>setAgreed(e.target.checked)}/>{t("tokenAgree")}</label>
   <label>{t("signature")}<input maxLength={160} autoComplete="name" value={signature} disabled={busy||!!url} onChange={e=>setSignature(e.target.value)}/></label>
   {url?<a href={url}>{t("open")}</a>:<button type="button" disabled={busy||disabled||!agreed||signature.trim().length<2} onClick={()=>void open()}>{busy?t("wait"):t("tokenOpen")}</button>}
  </div>}
  {error&&<p role="alert">{error==="RCV3_LIMIT"?t("tokenInsufficient"):error==="RCV3_CONFLICT"?t("tokenConflict"):t("tokenFailed")}</p>}
 </section>;
}
