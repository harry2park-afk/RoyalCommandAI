"use client";
import {useEffect,useImperativeHandle,useRef,useState,type Ref} from "react";
import ToolButton from "./ToolButton";
import {basicNavigationRoom,roomNavigationTarget,type NavigationRoom} from "@/lib/rcv3/room-navigation";
import {navigationText} from "@/lib/locale/room-navigation";
import styles from "./room-navigation.module.css";
// basicRoom is supplied only after the caller resolves the authenticated account's
// canonical basic room. Never guess it from creation order or the current room.
export type RoomNavigationHandle={open:()=>void};
export default function RoomNavigation({language,currentRoomId,basicRoom,disabled=false,onOpen,ref}:{language:string;currentRoomId?:string;basicRoom?:NavigationRoom|null;disabled?:boolean;onOpen?:(id:string)=>void;ref?:Ref<RoomNavigationHandle>}) {
 const [open,setOpen]=useState(false),[rooms,setRooms]=useState<NavigationRoom[]>([]),[query,setQuery]=useState("");
 const [loading,setLoading]=useState(false),[failed,setFailed]=useState(false),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[retry,setRetry]=useState(0);
 function show(){if(disabled)return;setOffset(0);setQuery("");setRooms([]);setMore(false);setLoading(true);setOpen(true);}
 useImperativeHandle(ref,()=>({open:show}));
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const t=(key:Parameters<typeof navigationText>[0])=>navigationText(key,language);
 useEffect(()=>{if(open)dialog.current?.showModal();else if(dialog.current?.open)dialog.current.close();},[open]);
 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();
  const timer=setTimeout(()=>{setLoading(true);setFailed(false);void fetch(`/api/rcv3/rooms?${new URLSearchParams({q:query,offset:String(offset)})}`,{cache:"no-store",signal:controller.signal})
   .then(async response=>{if(!response.ok)throw new Error("rooms");return response.json();})
   .then(result=>{if(controller.signal.aborted)return;setRooms(previous=>offset?[...new Map([...previous,...result.rooms].map(room=>[room.id,room])).values()]:result.rooms);setMore(result.hasMore===true);})
   .catch(()=>{if(!controller.signal.aborted)setFailed(true);})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});},200);
  return()=>{clearTimeout(timer);controller.abort();};
 },[open,query,offset,retry]);
 function close(){setOpen(false);trigger.current?.focus();}
 function go(room:NavigationRoom){if(disabled)return;const target=roomNavigationTarget([room],room.id);close();if(onOpen)onOpen(room.id);else window.location.assign(target);}
 const base=basicNavigationRoom(basicRoom?[basicRoom]:[],basicRoom?.id);
 return <nav className={styles.navigation} aria-label={t("list")}>
  {base&&base.id!==currentRoomId&&<ToolButton toolId="room-list" disabled={disabled} onClick={()=>go(base)}>← {base.name}</ToolButton>}
  <span ref={element=>{trigger.current=element?.querySelector("button")??null;}}><ToolButton toolId="room-list" disabled={disabled} aria-haspopup="dialog" onClick={show}>{t("list")}</ToolButton></span>
  <dialog ref={dialog} className={styles.dialog} onCancel={close} onClose={()=>setOpen(false)} aria-label={t("list")}>
   <header><h2>{t("list")}</h2><ToolButton toolId="room-list" onClick={close}>{t("close")}</ToolButton></header>
   <label>{t("search")}<input autoFocus value={query} maxLength={80} onChange={event=>{setLoading(true);setMore(false);setQuery(event.target.value);setOffset(0);setRooms([]);}}/></label>
   {loading&&<p role="status">{t("loading")}</p>}
   {failed&&<p role="alert">{t("error")} <ToolButton toolId="room-list" onClick={()=>{setLoading(true);setRetry(value=>value+1);}}>{t("retry")}</ToolButton></p>}
   {!loading&&!failed&&!rooms.length&&<p>{t("empty")}</p>}
   <div className={styles.rooms}>{rooms.map(room=><ToolButton toolId="room-list" key={room.id} disabled={disabled||room.id===currentRoomId} aria-current={room.id===currentRoomId?"page":undefined} onClick={()=>go(room)}>{room.name}{room.id===currentRoomId?` · ${t("current")}`:""}</ToolButton>)}</div>
   {more&&!failed&&<ToolButton toolId="room-list" disabled={loading} onClick={()=>{if(loading)return;setLoading(true);setOffset(value=>value+100);}}>{t("more")}</ToolButton>}
  </dialog>
 </nav>;
}
