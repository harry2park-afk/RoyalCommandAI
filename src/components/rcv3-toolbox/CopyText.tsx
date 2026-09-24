"use client";
import {useState} from "react";

export default function CopyText({text,label="Copy"}:{text:string;label?:string}){
  const [copied,setCopied]=useState(false);
  async function copy(){
    try{await navigator.clipboard.writeText(text);setCopied(true);window.setTimeout(()=>setCopied(false),1200);}catch{setCopied(false);}
  }
  return <button type="button" onClick={()=>void copy()} aria-label={label}>{copied?"Copied":"Copy"}</button>;
}
