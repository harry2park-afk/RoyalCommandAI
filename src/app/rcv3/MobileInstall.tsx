"use client";
import { useEffect, useRef, useState } from "react";
import HelpText from "@/components/help/HelpText";
import styles from "./mobile-install.module.css";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{outcome:"accepted"|"dismissed"}> };
export default function MobileInstall() {
  const pending = useRef<InstallEvent|null>(null);
  const [available,setAvailable] = useState(false);
  const [installed,setInstalled] = useState(false);
  const [busy,setBusy] = useState(false);
  const [failed,setFailed] = useState(false);
  useEffect(()=>{
    const display = window.matchMedia("(display-mode: standalone)");
    const detect = ()=>setInstalled(display.matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone));
    const offer = (event:Event)=>{event.preventDefault();pending.current=event as InstallEvent;setAvailable(true);setFailed(false);};
    const done = ()=>{pending.current=null;setAvailable(false);setInstalled(true);};
    detect();display.addEventListener("change",detect);
    window.addEventListener("beforeinstallprompt",offer);window.addEventListener("appinstalled",done);
    return ()=>{display.removeEventListener("change",detect);window.removeEventListener("beforeinstallprompt",offer);window.removeEventListener("appinstalled",done);};
  },[]);
  async function install() {
    const event=pending.current;if(!event||busy)return;
    pending.current=null;setAvailable(false);setBusy(true);setFailed(false);
    try {await event.prompt();await event.userChoice;} catch {setFailed(true);} finally {setBusy(false);}
  }
  if(installed)return null;
  return <aside className={styles.bar} aria-label="RC mobile app">
    <details><summary>RC on your phone</summary>
      <p><HelpText helpKey="mobileInstall"/></p>
      <p><HelpText helpKey="mobileOnline"/></p>
      {failed&&<p role="status"><HelpText helpKey="mobileInstallFailed"/></p>}
    </details>
    {(available||busy)&&<button type="button" disabled={busy} onClick={()=>void install()}>{busy?"Installing…":"Install RC"}</button>}
  </aside>;
}
