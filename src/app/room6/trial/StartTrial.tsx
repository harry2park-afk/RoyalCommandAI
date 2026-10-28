"use client";
import {useState} from "react";
export default function StartTrial(){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 return <div><button disabled={busy} className="rounded-xl bg-amber-300 px-6 py-4 text-black disabled:opacity-50" onClick={async()=>{setBusy(true);setError("");try{const r=await fetch("/api/room6/trial",{method:"POST"});const d=await r.json();if(!r.ok)throw new Error(d.error);window.location.assign("/room6/trial");}catch(e){setError(e instanceof Error?e.message:"생성 실패");setBusy(false);}}}>{busy?"시험방 준비 중…":"새 시험방 만들기"}</button>{error&&<p role="alert">{error}</p>}</div>;
}
