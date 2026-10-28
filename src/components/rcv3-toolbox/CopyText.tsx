'use client';
import { useState } from 'react';
import ToolButton from './ToolButton';
export async function copyText(text: string) {
  if (!text.trim()) throw new Error('There is no answer to copy yet.');
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable in this browser. Select the text to copy it.');
  try { await navigator.clipboard.writeText(text); }
  catch { throw new Error('Could not copy. Allow clipboard access or select the text to copy it.'); }
}
export default function CopyText({text}:{text:string}) {
  const [notice,setNotice]=useState('');
  return <span><ToolButton toolId="copy-answer" disabled={!text.trim()} onClick={async event=>{
    event.stopPropagation();try{await copyText(text);setNotice('Copied');}catch(error){setNotice((error as Error).message);}
  }}/>{notice&&<small role="status"> {notice}</small>}</span>;
}
