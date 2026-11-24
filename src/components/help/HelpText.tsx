"use client";
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import {findHelp} from "@/lib/locale/help-catalog";
import styles from "./help.module.css";
const Revision=createContext(0);
// Installed once in RC's root layout: the same behavior is available in every
// room, account page and onboarding flow without country-specific copies.
export function HelpTranslationProvider({children}:{children:ReactNode}) {
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  const reset=()=>setRevision(v=>v+1);
  const changed=(e:StorageEvent)=>{if(!e.key||["royalcommand:selected-language","royalcommand:ui-locale"].includes(e.key))reset();};
  window.addEventListener("royalcommand:language-change",reset);
  window.addEventListener("storage",changed);
  window.addEventListener("royalcommand:language-saved",reset);
  return()=>{window.removeEventListener("royalcommand:language-change",reset);window.removeEventListener("storage",changed);window.removeEventListener("royalcommand:language-saved",reset);};
 },[]);
 return <Revision.Provider value={revision}>{children}</Revision.Provider>;
}
export default function HelpText({helpKey}:{helpKey:string}) {
 const revision=useContext(Revision);
 return <Translation key={`${helpKey}:${revision}`} helpKey={helpKey}/>;
}
function Translation({helpKey}:{helpKey:string}) {
 const help=findHelp(helpKey);
 const [translated,setTranslated]=useState<{text:string;language:string}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>abort.current?.abort(),[]);
 if(!help)return null;
 async function translate() {
  if(abort.current)return;
  if(translated){setTranslated(null);return;}
  const controller=new AbortController();abort.current=controller;setBusy(true);setError("");
  try{
   const response=await fetch("/api/ui/help",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:helpKey}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});
   const result=await response.json();
   if(!response.ok||typeof result.text!=="string"||!result.text.trim()||typeof result.language!=="string")throw new Error("HELP_FAILED");
   if(!controller.signal.aborted)setTranslated({text:result.text,language:result.language});
  }catch{if(!controller.signal.aborted)setError("Could not translate. Try again.");}
  finally{abort.current=null;if(!controller.signal.aborted)setBusy(false);}
 }
 return <span className={styles.help} data-rc-help={helpKey}>
  <span lang={translated?.language||"en"} dir="auto">{translated?.text||help.en}</span>{" "}
  <button type="button" className={styles.translate} disabled={busy} aria-label={`${translated?"Show English":"Translate"}: ${help.en}`} aria-pressed={Boolean(translated)} onClick={event=>{event.preventDefault();event.stopPropagation();void translate();}}>{busy?"Translating…":translated?"English":"Translate"}</button>
  {error&&<span role="status" className={styles.error}>{error}</span>}
 </span>;
}
