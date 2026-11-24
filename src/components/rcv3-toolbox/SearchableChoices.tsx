"use client";
import { useState } from "react";

/** Shared, local-only search over supplied choices. Selection is handled by the parent. */
export default function SearchableChoices({options,selected,onToggle,searchLabel,emptyLabel,labelFor}:{options:string[];selected:string[];onToggle:(option:string)=>void;searchLabel:string;emptyLabel:string;labelFor:(option:string)=>string}) {
  const [query,setQuery]=useState("");
  const visible=options.filter(option=>labelFor(option).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())||option.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div><label>{searchLabel}<input type="search" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    {visible.length?<div className="rc-searchable-choices">{visible.map(option=><label key={option}><input type="checkbox" checked={selected.includes(option)} onChange={()=>onToggle(option)}/>{labelFor(option)}</label>)}</div>:<p role="status">{emptyLabel}</p>}
  </div>;
}
