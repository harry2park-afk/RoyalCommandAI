"use client";
import {useRef,useState} from "react";
import ToolButton from "./ToolButton";
import styles from "./confirm-delete.module.css";

export type DeleteLabels={
  trigger:string;title:string;body:string;cancel:string;confirm:string;busy:string;error:string;
};

export default function ConfirmDeleteButton({disabled=false,className,labels,onConfirm}:{
  disabled?:boolean;className?:string;labels:DeleteLabels;onConfirm:()=>Promise<void>;
}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  function open(){if(disabled||busy)return;setError("");dialog.current?.showModal();}
  function close(){if(busy)return;setError("");dialog.current?.close();}
  async function confirm(){
    if(busy)return;setBusy(true);setError("");
    try{await onConfirm();dialog.current?.close();}
    catch{setError(labels.error);}
    finally{setBusy(false);}
  }
  return <>
    <ToolButton toolId="room-list" className={className} disabled={disabled||busy} onClick={open}>{labels.trigger}</ToolButton>
    <dialog ref={dialog} className={styles.dialog} onCancel={event=>{if(busy)event.preventDefault();else close();}}>
      <h3>{labels.title}</h3>
      <p>{labels.body}</p>
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <ToolButton toolId="room-list" disabled={busy} onClick={close}>{labels.cancel}</ToolButton>
        <ToolButton toolId="room-list" disabled={busy} onClick={()=>void confirm()}>{busy?labels.busy:labels.confirm}</ToolButton>
      </div>
    </dialog>
  </>;
}
