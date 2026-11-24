"use client";
import {useEffect, useMemo, useState} from "react";
import {orderedAustralianBanks, majorAustralianBanks, bankNames, verifiedBankSites} from "@/lib/rcv3/australian-banks";

const label=(id:string)=>id.startsWith("foreign:")?id.slice(8).replace("|"," · "):bankNames[id]||id;
const destination=(id:string)=>verifiedBankSites[id]||`https://www.google.com/search?q=${encodeURIComponent(`${label(id)} official internet banking website`)}`;
export default function BankPicker({customerNumber,language}:{customerNumber:string;language:string}) {
 const ko=language.toLowerCase().startsWith("ko"),[recent,setRecent]=useState<string[]>([]),[ready,setReady]=useState(false);
 const [query,setQuery]=useState(""),[foreignName,setForeignName]=useState(""),[country,setCountry]=useState("");
 const key=customerNumber?`rcv3-banks:${customerNumber.replace(/[^\d]/g,"")}`:"";
 useEffect(()=>{if(!key)return;try{const x=JSON.parse(localStorage.getItem(key)||"[]");setRecent(Array.isArray(x)?x.filter((v):v is string=>typeof v==="string").slice(0,3):[]);}catch{setRecent([]);}setReady(true);},[key]);
 function save(next:string[]) {setRecent(next);if(key)try{localStorage.setItem(key,JSON.stringify(next.slice(0,3)));}catch{}}
 function go(id:string) {if(!key)return;window.open(destination(id),"_blank","noopener,noreferrer");save([id,...recent.filter(x=>x!==id)].slice(0,3));}
 const results=useMemo(()=>orderedAustralianBanks.filter(name=>name.toLowerCase().includes(query.trim().toLowerCase())||(bankNames[name]||"").toLowerCase().includes(query.trim().toLowerCase())),[query]);
 const button=(id:string)=> <button type="button" key={id} onClick={()=>go(id)} disabled={!key} style={{textAlign:"left",padding:"10px 14px",minHeight:44}}>{label(id)} · {verifiedBankSites[id]?(ko?"은행 웹사이트 열기":"Open bank website"):(ko?"공식 사이트 검색":"Find official site")}</button>;
 const shown=ready?[...recent,...majorAustralianBanks.filter(id=>!recent.includes(id))].slice(0,3):majorAustralianBanks.slice(0,3);
 return <div>
  <p><strong>{ko?"최근 은행 · 최대 3개":"Recent banks · up to 3"}</strong></p>
  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{shown.map(button)}</div>
  <details style={{marginTop:12}}><summary>{ko?"호주 은행 전체 목록에서 찾기":"Find an Australian bank"}</summary>
   <label>{ko?"은행 이름 검색":"Search bank name"}<input value={query} onChange={e=>setQuery(e.target.value)} autoComplete="off"/></label>
   <div style={{maxHeight:300,overflowY:"auto",display:"grid",gap:4}}>{results.map(button)}</div>
   <p><a href="https://www.apra.gov.au/registers/list-registered-authorised-deposit-taking-institutions">{ko?"APRA 공식 은행 등록 목록 확인":"View official APRA register"}</a></p>
  </details>
  <details style={{marginTop:12}}><summary>{ko?"해외 은행 찾기":"Find a bank in another country"}</summary>
   <label>{ko?"은행 이름":"Bank name"}<input value={foreignName} maxLength={100} onChange={e=>setForeignName(e.target.value)}/></label>
   <label>{ko?"국가":"Country"}<input value={country} maxLength={60} onChange={e=>setCountry(e.target.value)}/></label>
   <button type="button" disabled={!key||foreignName.trim().length<2||country.trim().length<2} onClick={()=>go(`foreign:${foreignName.trim()}|${country.trim()}`)}>{ko?"공식 은행 웹사이트 검색":"Search for official bank website"}</button>
  </details>
  <p>{ko?"확인된 은행은 사이트로 바로 이동합니다. 그 밖의 은행은 검색 결과에서 공식 주소를 확인하세요. 은행 로그인 정보는 RC에 입력하지 마세요.":"Verified banks open directly. For other banks, check the official address in search results. Never enter bank credentials in RC."}</p>
 </div>;
}
