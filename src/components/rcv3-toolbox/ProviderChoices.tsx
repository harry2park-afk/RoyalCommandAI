"use client";
import { useState } from "react";
import type { AIProviderId } from "@/lib/ai/types";
import { simpleCreateText } from "@/lib/locale/rcv3-simple-create";
import styles from "./ProviderChoices.module.css";

const primary: AIProviderId[] = ["openai", "google", "anthropic", "xai", "deepseek", "perplexity"];
const logos: Partial<Record<AIProviderId,string>> = {openai:"/rc-ai-logos/openai.svg",google:"/rc-ai-logos/gemini.svg",anthropic:"/rc-ai-logos/anthropic.svg",xai:"/rc-ai-logos/xai.svg",deepseek:"/brand-logos/deepseek.svg",perplexity:"/rc-ai-logos/perplexity.svg",mistral:"/rc-ai-logos/mistral.svg",meta:"/rc-ai-logos/meta.svg",qwen:"/rc-ai-logos/qwen.svg",cohere:"/brand-logos/cohere.svg",codex:"/rc-ai-logos/openai.svg"};
/** Shared AI List selection control. Selection never grants a connection or entitlement. */
export default function ProviderChoices({providers,selected,onToggle,language}:{providers:{id:AIProviderId;label:string}[];selected:AIProviderId[];onToggle:(id:AIProviderId)=>void;language:string}) {
 const [searching,setSearching]=useState(false),[query,setQuery]=useState("");
 const t=(key:Parameters<typeof simpleCreateText>[0])=>simpleCreateText(key,language);
 const ordered=[...primary.map(id=>providers.find(p=>p.id===id)).filter((p):p is typeof providers[number]=>!!p),...providers.filter(p=>!primary.includes(p.id))];
 const visible=ordered.filter(p=>searching?(p.label+" "+p.id).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()):primary.includes(p.id)||selected.includes(p.id));
 return <div className={styles.root}>
  <div className={styles.list}>{visible.map(p=><label key={p.id} className={styles.option}><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>onToggle(p.id)}/>{logos[p.id]&&<img src={logos[p.id]} width={24} height={24} alt=""/>}<span>{p.label}</span></label>)}</div>
  <button type="button" aria-expanded={searching} onClick={()=>setSearching(v=>!v)}>{searching?"Close":"Search"}</button>
  {searching&&<label className={styles.search}>{t("providerSearch")}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
  {searching&&!visible.length&&<p role="status">{t("providerNotFound")}</p>}
 </div>;
}
