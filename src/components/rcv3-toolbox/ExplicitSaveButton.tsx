"use client";
import ToolButton from "./ToolButton";

export default function ExplicitSaveButton({disabled=false,busy=false,label,busyLabel,onSave}:{
  disabled?:boolean;busy?:boolean;label:string;busyLabel:string;onSave:()=>Promise<unknown>|unknown;
}) {
  return <ToolButton toolId="create-room" disabled={disabled||busy} onClick={()=>void onSave()}>{busy?busyLabel:label}</ToolButton>;
}
