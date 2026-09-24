"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./mobile-install.module.css";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{outcome:"accepted"|"dismissed"}> };
export default function MobileInstall() {
  const pending = useRef<InstallEvent|null>(null);
  const [available,setAvailable] = useState(false);
  const [installed,setInstalled] = useState(false);
  const [busy,setBusy] = useState(false);
  useEffect(()=>{
    const display = window.matchMedia("(display-mode: standalone)");
    const detect = ()=>setInstalled(display.matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone));
    const offer = (event:Event)=>{event.preventDefault();pending.current=event as InstallEvent;setAvailable(true);};
    const done = ()=>{pending.current=null;setAvailable(false);setInstalled(true);};
    detect();display.addEventListener("change",detect);
    window.addEventListener("beforeinstallprompt",offer);window.addEventListener("appinstalled",done);
    return ()=>{display.removeEventListener("change",detect);window.removeEventListener("beforeinstallprompt",offer);window.removeEventListener("appinstalled",done);};
  },[]);
  async function install() {
    const event=pending.current;if(!event||busy)return;
    pending.current=null;setAvailable(false);setBusy(true);
    try {await event.prompt();await event.userChoice;} catch {} finally {setBusy(false);}
  }
  if(installed||(!available&&!busy))return null;
  return <aside className={styles.install} aria-label="RC mobile app">
    <button type="button" disabled={busy} onClick={()=>void install()}>{busy?"Installing…":"Install RC"}</button>
  </aside>;
}
