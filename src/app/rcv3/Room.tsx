"use client";
import { useCallback, useEffect, useRef, useState, createElement } from "react";
import { Move, Mic, Send, Settings2, Plus, Copy, Image as ImageIcon, Folder, X } from "lucide-react";
import type { CloudState, Button } from "@/lib/rcv3/cloud-state";
import type { Turn } from "@/lib/rcv3/execution";
import type { AIProviderId } from "@/lib/ai/types";
import {roomTemplates,templateImage} from "@/lib/rcv3/templates";
import styles from "./room.module.css";
import RoomCatalog from "./RoomCatalog";
import AnswerCards from "./AnswerCards";
import { appearanceLimits } from "@/lib/rcv3/appearance-limits";

type VoiceElement = HTMLElement & { autoSubmit:boolean; liveDictation:boolean; language:string; cancel:()=>void; transcribe: (blob: Blob, options: { signal: AbortSignal }) => Promise<string>; start: () => Promise<void>; stop: () => void };
async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(`/api/rcv3/${path}`, body === undefined ? { cache: "no-store" } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  const value = await response.json();
  if (!response.ok) throw new Error(`${value.error ?? "요청 실패"} (${value.code ?? response.status})`);
  return value;
}
export default function Room({ providers, secretaryRooms, language }: { providers: { id: AIProviderId; label: string; configured:boolean }[]; secretaryRooms:{id:string;name:string}[]; language:string }) {
  const [rooms,setRooms] = useState<{id:string;name:string}[]>([]), [roomId,setRoomId] = useState("");
  const [state,setState] = useState<CloudState|null>(null), [background,setBackground] = useState("");

  const [scope,setScope] = useState<"chat"|"secretary">("chat"), [turns,setTurns] = useState<Turn[]>([]);
  const [text,setText] = useState(""), [busy,setBusy] = useState(false), [error,setError] = useState("");
  const [editing,setEditing] = useState(false), [selected,setSelected] = useState<string|null>(null);
  const [editorPosition,setEditorPosition]=useState<{left:number;top:number}|null>(null);
  const editorDrag=useRef<{pointerId:number;x:number;y:number;left:number;top:number;width:number;height:number}|null>(null);
  useEffect(()=>{if(!editing){setEditorPosition(null);editorDrag.current=null;}},[editing]);
  const [files,setFiles] = useState<{id:string;name:string;text:string}[]>([]), [showFiles,setShowFiles] = useState(false);

  const [warehouse,setWarehouse]=useState(false), [galleryTab,setGalleryTab]=useState("Rooms"), [roomSearch,setRoomSearch]=useState(""), [creatingTemplate,setCreatingTemplate]=useState<string|null>(null);
  const galleryRef=useRef<HTMLElement>(null);
  const templateRequest=useRef<{id:string;requestId:string}|null>(null);
  const [aiSearch,setAISearch]=useState("");
  const [cardStatus,setCardStatus]=useState<Record<string,string>>({});
  const [batchIds,setBatchIds]=useState<AIProviderId[]>([]);
  const drag=useRef<{id:string;x:number;y:number;left:number;top:number;width:number;height:number}|null>(null);
  const canvasRef=useRef<HTMLElement>(null);
  function logo(id:string){return ({openai:"/rc-ai-logos/openai.svg",codex:"/rc-ai-logos/openai.svg",astra:"/rc-ai-logos/openai.svg",anthropic:"/rc-ai-logos/anthropic.svg",google:"/rc-ai-logos/gemini.svg",xai:"/rc-ai-logos/xai.svg",deepseek:"/brand-logos/deepseek.svg",perplexity:"/rc-ai-logos/perplexity.svg",mistral:"/rc-ai-logos/mistral.svg",meta:"/rc-ai-logos/meta.svg",qwen:"/rc-ai-logos/qwen.svg",cohere:"/brand-logos/cohere.svg"} as Record<string,string>)[id];}
  function brand(id:string){const p=providers.find(p=>p.id===id);return <>{logo(id)?<img src={logo(id)} alt="" width={24} height={24}/>:<span aria-hidden="true">{p?.label.slice(0,2)}</span>}<span>{p?.label??id}</span></>;}

  const [voiceLoaded,setVoiceLoaded] = useState(false), [dirty,setDirty] = useState(false);
  const dictationBase=useRef(""), draftRef=useRef(""); draftRef.current=text;
  const continuousVoice=useRef(false), playbackDone=useRef<(()=>void)|null>(null);
  const voiceRef = useRef<VoiceElement|null>(null), busyRef = useRef(false), roomRef=useRef("");
  const createId = useRef<string|null>(null), generation=useRef(0), audioRef=useRef<HTMLAudioElement|null>(null);
  const mounted = Boolean(state);
  const liveState=useRef<CloudState|null>(state);liveState.current=state;
  const editBaseline=useRef<CloudState|null>(null), editingNow=useRef(editing);editingNow.current=editing;
  const writes=useRef<Promise<unknown>>(Promise.resolve()), writeCount=useRef(0), writeSequence=useRef(0), writeFailed=useRef(false);
  const [saving,setSaving]=useState(false);
  const saved = useRef<CloudState|null>(null), transcriptHandler=useRef<(text:string)=>void>(()=>{});
  const imageInput=useRef<HTMLInputElement>(null), fileInput=useRef<HTMLInputElement>(null);
  const chatPanel=useRef<HTMLElement>(null), messageInput=useRef<HTMLTextAreaElement>(null), filesPanel=useRef<HTMLElement>(null);
  function openConversation(next:"chat"|"secretary"){
    if(busyRef.current)return;
    setShowFiles(false);setScope(next);
    requestAnimationFrame(()=>{chatPanel.current?.scrollIntoView({block:"start",behavior:"instant"});messageInput.current?.focus({preventScroll:true});});
  }
  useEffect(()=>{if(showFiles)filesPanel.current?.scrollIntoView({block:"start",behavior:"instant"});},[showFiles]);

  const openRoom = useCallback(async (id:string) => {
    const token=++generation.current; roomRef.current=id; setRoomId(id); setState(null); setError(""); setDirty(false); setEditing(false); setSelected(null); setTurns([]); setText(""); setFiles([]); setShowFiles(false); setBackground("");setBatchIds([]);setCardStatus({});
    audioRef.current?.pause();continuousVoice.current=false;
    try { const result=await api(`state?room=${id}`); if(token!==generation.current)return;
      setState(result.state); saved.current=result.state; setBackground(result.background?.data??"");
      window.history.replaceState(null,"",`/rcv3?room=${id}`);
    } catch(e){if(token===generation.current)setError((e as Error).message);}
  },[]);
  useEffect(()=>{let active=true; api("rooms").then(result=>{if(!active)return;setRooms(result.rooms); const id=new URLSearchParams(window.location.search).get("room")||result.rooms[0]?.id;if(id)void openRoom(id);}).catch(e=>setError(e.message));return()=>{active=false;};},[openRoom]);
  useEffect(()=>{if(!roomId)return;let active=true;setTurns([]);api(`chat?room=${roomId}&scope=${scope}`).then(r=>{if(active)setTurns(current=>[...new Map([...r.turns,...current].map((t:Turn)=>[t.requestId,t])).values()].sort((a,b)=>a.at.localeCompare(b.at)));}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[roomId,scope]);
  useEffect(()=>{import("../../../rcv3/voice-control.mjs").then(()=>setVoiceLoaded(true)).catch(()=>setError("마이크 구성요소를 불러오지 못했습니다."));return()=>{audioRef.current?.pause();};},[]);
  useEffect(()=>{const el=voiceRef.current;if(!el||!roomId||!voiceLoaded)return;
    el.autoSubmit=false;el.liveDictation=true;el.language=language;el.transcribe=async(blob,{signal})=>{const form=new FormData();form.set("roomId",roomId);form.set("requestId",crypto.randomUUID());form.set("audio",blob,blob.type.includes("mp4")?"voice.mp4":"voice.webm");const r=await fetch("/api/rcv3/audio",{method:"POST",body:form,signal});const d=await r.json();if(!r.ok)throw new Error(d.error);return d.text;};
    const listener=(event:Event)=>transcriptHandler.current((event as CustomEvent).detail.text);const toggle=(event:Event)=>{continuousVoice.current=false;if((event as CustomEvent).detail.enabled){dictationBase.current=draftRef.current;audioRef.current?.pause();playbackDone.current?.();messageInput.current?.focus({preventScroll:true});}};el.addEventListener("voice-toggle",toggle);el.addEventListener("transcript",listener);return()=>{el.removeEventListener("transcript",listener);el.removeEventListener("voice-toggle",toggle);};
  },[roomId,voiceLoaded,mounted,language]);
  useEffect(()=>{const hide=()=>{if(document.hidden){continuousVoice.current=false;voiceRef.current?.cancel();audioRef.current?.pause();playbackDone.current?.();}};document.addEventListener("visibilitychange",hide);return()=>{document.removeEventListener("visibilitychange",hide);hide();};},[]);
  async function create(copy=false){if(busyRef.current)return;busyRef.current=true;setBusy(true);setError("");
    try{createId.current??=crypto.randomUUID();const name=copy?`${state?.name??"RCV3"} 복사`:"RCV3 · Room6";const r=await api("rooms",{requestId:createId.current,name,...(copy?{sourceRoom:roomId}:{})});createId.current=null;const list=await api("rooms");setRooms(list.rooms);await openRoom(r.roomId);setWarehouse(false);setEditing(true);}
    catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
  async function send(message=text,spoken=false){
    if(!message.trim()||busyRef.current||!state)return;
    const chosen=[...state.selectedProviders];if(!chosen.length){setError("Select at least one AI in AI List.");return;}
    voiceRef.current?.cancel();busyRef.current=true;setBusy(true);setError("");const target=roomId;
    setBatchIds(chosen);setCardStatus(Object.fromEntries(chosen.map(id=>[id,"Working…"])));
    try{
      await writes.current;if(writeFailed.current)throw new Error("Settings were not saved. Please retry your selection.");
      const outcomes=await Promise.allSettled(chosen.map(async id=>{
        try{const turn:Turn=await api("chat",{roomId:target,requestId:crypto.randomUUID(),scope:"chat",provider:id,prompt:message});
          if(roomRef.current===target){setTurns(old=>[...old,turn]);setCardStatus(old=>({...old,[id]:""}));}return turn;
        }catch(e){if(roomRef.current===target)setCardStatus(old=>({...old,[id]:`Failed: ${(e as Error).message}`}));throw e;}
      }));
      if(roomRef.current!==target)return;
      const t=outcomes.find((r):r is PromiseFulfilledResult<Turn>=>r.status==="fulfilled")?.value;
      if(t)setText(current=>current===message?"":current);
      if(spoken&&t){const r=await fetch("/api/rcv3/audio",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({roomId:target,requestId:crypto.randomUUID(),text:t.answer.slice(0,4000)}),signal:AbortSignal.timeout(35000)});if(!r.ok)throw new Error("글 답변은 저장됐지만 음성 재생을 준비하지 못했습니다.");const url=URL.createObjectURL(await r.blob());if(roomRef.current!==target){URL.revokeObjectURL(url);return;}const audio=new Audio(url);audioRef.current=audio;await new Promise<void>((resolve,reject)=>{const done=()=>{URL.revokeObjectURL(url);playbackDone.current=null;resolve();};playbackDone.current=done;audio.onended=done;audio.onerror=()=>{done();reject(new Error("음성을 재생하지 못했습니다."));};void audio.play().catch(reject);});if(continuousVoice.current&&roomRef.current===target&&!document.hidden)void voiceRef.current?.start();}
    }catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}
  }
  transcriptHandler.current=(message)=>{const base=dictationBase.current;setText(base+(base&&!/\s$/.test(base)?" ":"")+message);requestAnimationFrame(()=>{const input=messageInput.current;if(input)input.scrollTop=input.scrollHeight;});};
  function update(next:CloudState){setState(next);setDirty(true);}
  function editButton(patch:Partial<Button>){if(!state||!selected)return;update({...state,design:{...state.design,buttons:state.design.buttons.map(b=>b.id===selected?{...b,...patch}:b)}});}
  async function save(){if(!state||!saved.current||busyRef.current)return;const draft=state,token=generation.current,sequence=writeSequence.current+1;setDirty(false);setEditing(false);editingNow.current=false;setSelected(null);try{await persist(draft);}catch(e){if(token!==generation.current)return;if(sequence===writeSequence.current){setState(draft);liveState.current=draft;setDirty(true);setEditing(true);setSelected(draft.design.buttons[0]?.id??null);}setError((e as Error).message);}}

  function add(capability:Button["capability"]){if(!state)return;const id=crypto.randomUUID();update({...state,bindings:{...state.bindings,[id]:capability},design:{...state.design,buttons:[...state.design.buttons,{id,capability,label:capability==="secretary"?"Katie":capability==="files"?"파일":"AI 대화",x:5,y:5,width:20,height:12,opacity:1}]}});setSelected(id);}
  async function uploadImage(file?:File){if(!file||!state||busyRef.current)return;const target=roomId,token=generation.current;busyRef.current=true;setBusy(true);try{if(file.size>950000)throw new Error("배경 그림은 950KB 이하의 PNG·JPG·WebP를 선택하세요.");const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file);});const r=await api("asset",{roomId,image:{data}});if(target!==roomRef.current||token!==generation.current)return;setBackground(r.image.data);setEditing(true);setSelected(state.design.buttons[0]?.id??null);setError("");update({...state,design:{...state.design,backgroundAssetId:r.id}});}catch(e){if(token===generation.current)setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
  async function openFiles(){const token=generation.current;setShowFiles(true);requestAnimationFrame(()=>filesPanel.current?.scrollIntoView({block:"start",behavior:"instant"}));try{const result=await api(`files?room=${roomId}`);if(token===generation.current)setFiles(result.files);}catch(e){if(token===generation.current)setError((e as Error).message);}}
  async function uploadFile(file?:File){if(!file||busyRef.current)return;const target=roomId,token=generation.current;busyRef.current=true;setBusy(true);try{if(file.size>100000||!/[.](txt|md|csv)$/i.test(file.name))throw new Error("100KB 이하 TXT·MD·CSV 파일을 선택하세요.");const value={id:crypto.randomUUID(),name:file.name,text:await file.text()};await api("files",{roomId,file:value});if(target===roomRef.current&&token===generation.current)setFiles(old=>[value,...old]);}catch(e){if(token===generation.current)setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
  function persist(next:CloudState){
    const target=roomId,token=generation.current,sequence=++writeSequence.current;
    if(writeCount.current===0)writeFailed.current=false;
    writeCount.current++;setSaving(true);setError("");liveState.current=next;setState(next);
    const job=writes.current.then(async()=>{
      if(writeFailed.current||token!==generation.current)throw new Error("Settings were not saved. Please retry.");
      const previous=saved.current!;
      const r=await api("state",{roomId:target,revision:previous.revision,state:{...next,revision:previous.revision+1}},"PUT");
      if(token===generation.current){saved.current=r.state;if(sequence===writeSequence.current&&!editingNow.current){liveState.current=r.state;setState(r.state);}}
      return r.state as CloudState;
    }).catch(e=>{writeFailed.current=true;if(token===generation.current&&sequence===writeSequence.current&&!editingNow.current){liveState.current=saved.current;setState(saved.current);}throw e;}).finally(()=>{writeCount.current--;if(writeCount.current===0)setSaving(false);});
    writes.current=job.catch(()=>{});return job;
  }
  const orderedProviders=[...providers].sort((a,b)=>{const order=state?.providerOrder??[];const rank=(id:AIProviderId)=>{const i=order.indexOf(id);return i<0?order.length+providers.findIndex(p=>p.id===id):i;};return rank(a.id)-rank(b.id);});
  const [movingAI,setMovingAI]=useState<AIProviderId|null>(null);
  const movingAIRef=useRef<AIProviderId|null>(null);
  const [movePoint,setMovePoint]=useState<{x:number;y:number}|null>(null);

  async function reorderAI(id:AIProviderId,target:AIProviderId){
    if(!state||busyRef.current||dirty||id===target)return;
    const order=orderedProviders.map(p=>p.id);const from=order.indexOf(id),to=order.indexOf(target);if(from<0||to<0)return;
    order.splice(from,1);order.splice(to,0,id);setError("");
    try{await persist({...liveState.current!,providerOrder:order});}catch(e){setError((e as Error).message);}
  }
  async function selectAI(id:AIProviderId,connect:boolean){
    if(!state||busyRef.current||dirty)return;setError("");
    if(!connect){const current=liveState.current!;try{await persist({...current,selectedProviders:current.selectedProviders.includes(id)?current.selectedProviders.filter(p=>p!==id):[...current.selectedProviders,id]});}catch(e){setError((e as Error).message);}return;}
    busyRef.current=true;setBusy(true);
    try{
      if(connect&&!state.connectedProviders.includes(id)){
        await api("providers",{roomId,requestId:crypto.randomUUID(),provider:id});
        await persist({...state,connectedProviders:[...state.connectedProviders,id],selectedProviders:[...state.selectedProviders,id]});
      }else if(connect){await persist({...state,connectedProviders:state.connectedProviders.filter(p=>p!==id),selectedProviders:state.selectedProviders.filter(p=>p!==id)});}
      else{await persist({...state,selectedProviders:state.selectedProviders.includes(id)?state.selectedProviders.filter(p=>p!==id):[...state.selectedProviders,id]});}
    }catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}
  }
  async function linkKatie(id:string){if(!state||busyRef.current)return;busyRef.current=true;setBusy(true);try{await persist({...state,secretaryRoomId:id||null});}catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
  function openKatie(){if(state?.secretaryRoomId)window.location.assign(`/secretary?room=${encodeURIComponent(state.secretaryRoomId)}`);else {setGalleryTab("Connections");setWarehouse(true);}}
  async function chooseTemplate(id:string){
    if(busyRef.current||dirty)return;
    const template=roomTemplates.find(t=>t.id===id);if(!template)return;
    busyRef.current=true;setBusy(true);setError("");setCreatingTemplate(id);voiceRef.current?.cancel();
    if(templateRequest.current?.id!==id)templateRequest.current={id,requestId:crypto.randomUUID()};
    try{
      const r=await api("rooms",{requestId:templateRequest.current.requestId,name:template.name,templateId:id,...(roomId?{sourceRoom:roomId}:{})});
      const loaded=await api(`state?room=${r.roomId}`);
      generation.current++;roomRef.current=r.roomId;setRoomId(r.roomId);setState(loaded.state);saved.current=loaded.state;setBackground(loaded.background?.data??"");setTurns([]);setText("");setFiles([]);setShowFiles(false);setBatchIds([]);setCardStatus({});setDirty(false);setSelected(null);
      window.history.replaceState(null,"",r.url);setWarehouse(false);setEditing(false);setSelected(null);templateRequest.current=null;window.scrollTo({top:0,behavior:"instant"});
    }catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);setCreatingTemplate(null);}
  }
  useEffect(()=>{if(!warehouse)return;const old=document.body.style.overflow;document.body.style.overflow="hidden";const previous=document.activeElement as HTMLElement|null;const close=(e:KeyboardEvent)=>{if(e.key==="Escape"&&!busyRef.current)setWarehouse(false);if(e.key==="Tab"){const items=Array.from(galleryRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')??[]);const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};window.addEventListener("keydown",close);return()=>{document.body.style.overflow=old;window.removeEventListener("keydown",close);previous?.focus();};},[warehouse]);
  function placeTemplate(){
    if(!state){void create();return;}
    const buttons:Button[]=(["chat","secretary","files"] as const).map((capability,i)=>({id:crypto.randomUUID(),capability,label:capability==="chat"?"My AI":capability==="secretary"?"Katie":"Files",x:5+i*30,y:8,width:24,height:18,opacity:1}));
    update({...state,design:{backgroundAssetId:null,buttons},bindings:{...state.bindings,...Object.fromEntries(buttons.map(b=>[b.id,b.capability]))}});setBackground("");setWarehouse(false);setEditing(true);setSelected(null);
  }
  function moveButton(e:React.PointerEvent<HTMLButtonElement>,b:Button){
    if(!editing||!drag.current||drag.current.id!==b.id)return;const d=drag.current;
    const x=Math.max(0,Math.min(100-b.width,d.left+(e.clientX-d.x)/d.width*100)),y=Math.max(0,Math.min(100-b.height,d.top+(e.clientY-d.y)/d.height*100));
    setState(old=>old?{...old,design:{...old.design,buttons:old.design.buttons.map(v=>v.id===b.id?{...v,x,y}:v)}}:old);setDirty(true);
  }
  const visibleProviders=new Set([...(state?.selectedProviders??[]),...batchIds]);
  const shownProviders=orderedProviders.filter(p=>visibleProviders.has(p.id)).map(p=>p.id);
  const button=state?.design.buttons.find(b=>b.id===selected);
  return <main className={styles.root}>
    <header className={styles.header}><a href="/rooms/rca">← RC</a><strong>RC V3 · My Room</strong><button disabled={busy||dirty} onClick={()=>{setGalleryTab("Rooms");setWarehouse(!warehouse);}}>Room List</button>{state&&<button disabled={busy||dirty} onClick={()=>{editBaseline.current=liveState.current;setEditing(true);setSelected(state.design.buttons[0]?.id??null);}}>Edit Buttons</button>}</header>
    {saving&&<span className={styles.saveStatus} role="status">Saving…</span>}
    {error&&<div className={styles.error} role="alert">{error}</div>}
    {movingAI&&movePoint&&<div className={styles.aiGhost} style={{left:movePoint.x+12,top:movePoint.y+12}}>{brand(movingAI)}</div>}
    {warehouse&&<section ref={galleryRef} className={styles.gallery} role="dialog" aria-modal="true" aria-label={galleryTab==="Rooms"?"Room List":"AI List"}>
      <div className={styles.galleryHeader}><div><small>ROYAL COMMAND</small><h1>{galleryTab==="Rooms"?"Room List":"AI List"}</h1></div><input autoFocus aria-label={galleryTab==="Rooms"?"Search rooms":"Search AIs"} placeholder={galleryTab==="Rooms"?"Search rooms…":"Search AIs…"} value={galleryTab==="Rooms"?roomSearch:aiSearch} onChange={e=>galleryTab==="Rooms"?setRoomSearch(e.target.value):setAISearch(e.target.value)}/><button disabled={busy} onClick={()=>setWarehouse(false)}>Close</button></div>
      <nav className={styles.galleryTabs} aria-label="Warehouse sections">{["Rooms","Connections"].map(t=><button key={t} aria-pressed={galleryTab===t} onClick={()=>setGalleryTab(t)}>{t==="Connections"?"AI List":t}</button>)}</nav>
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      {galleryTab==="Rooms"?<RoomCatalog search={roomSearch} busy={busy||dirty} creating={creatingTemplate} onChoose={id=>void chooseTemplate(id)}/>
      :state?<><h2>Select AIs</h2><div className={styles.providerGrid}>{orderedProviders.filter(p=>p.label.toLowerCase().includes(aiSearch.toLowerCase().trim())).map(p=><div key={p.id} data-ai-order={p.id} data-connected={state.connectedProviders.includes(p.id)&&state.selectedProviders.includes(p.id)} className={styles.providerChoice} style={{opacity:movingAI===p.id?.6:1}}><button type="button" className={styles.aiMove} aria-label={`Move ${p.label}`} disabled={busy||dirty} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);movingAIRef.current=p.id;setMovingAI(p.id);setMovePoint({x:e.clientX,y:e.clientY});}} onPointerMove={e=>{if(movingAIRef.current)setMovePoint({x:e.clientX,y:e.clientY});}} onPointerUp={e=>{if(!movingAIRef.current)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>("[data-ai-order]")?.dataset.aiOrder;movingAIRef.current=null;setMovingAI(null);setMovePoint(null);if(target)void reorderAI(p.id,target as AIProviderId);}} onPointerCancel={()=>{movingAIRef.current=null;setMovingAI(null);setMovePoint(null);}} onLostPointerCapture={()=>{movingAIRef.current=null;setMovingAI(null);setMovePoint(null);}} onKeyDown={e=>{if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;e.preventDefault();const grid=e.currentTarget.closest("[data-ai-order]")!.parentElement!;const columns=getComputedStyle(grid).gridTemplateColumns.split(" ").length;const delta=e.key==="ArrowLeft"?-1:e.key==="ArrowRight"?1:e.key==="ArrowUp"?-columns:columns;const visible=orderedProviders.filter(p=>p.label.toLowerCase().includes(aiSearch.toLowerCase().trim()));const target=visible[visible.findIndex(x=>x.id===p.id)+delta];if(target)void reorderAI(p.id,target.id);}}><Move size={20}/></button><label className={styles.aiSelect}><input type="checkbox" aria-label={`Select ${p.label}`} checked={state.selectedProviders.includes(p.id)} disabled={busy||dirty||!p.configured} onChange={()=>void selectAI(p.id,!state.connectedProviders.includes(p.id))}/>{brand(p.id)}<small>{state.connectedProviders.includes(p.id)&&state.selectedProviders.includes(p.id)?"Connected":p.configured?"Connect":"Unavailable"}</small></label></div>)}</div><h2>Katie</h2><label>Existing secretary room <select aria-label="Katie room" value={state.secretaryRoomId??""} disabled={busy||dirty} onChange={e=>void linkKatie(e.target.value)}><option value="">Select your existing secretary room</option>{secretaryRooms.map(r=><option key={r.id} value={r.id}>{r.name} · {r.id.slice(0,8)}</option>)}</select></label></>:<p>Choose a room first.</p>}
    </section>}
    {!state?<section className={styles.empty}><h1>Choose a room from Room List</h1></section>:<>
      <section className={styles.toolbar} aria-label="Answer AIs"><button disabled={busy||dirty} onClick={()=>{setGalleryTab("Connections");setAISearch("");setWarehouse(true);}}>AI List</button>{orderedProviders.filter(p=>state.connectedProviders.includes(p.id)).map(p=><button key={p.id} className={styles.fixedAI} title={`${p.label}: ${state.selectedProviders.includes(p.id)?"On":"Off"}`} aria-label={`Answer with ${p.label}`} aria-pressed={state.selectedProviders.includes(p.id)} disabled={busy||editing} onClick={()=>void selectAI(p.id,false)}>{brand(p.id)}<span className={styles.aiTick} aria-hidden="true">✓</span></button>)}</section>

      <section ref={canvasRef} tabIndex={0} onPaste={e=>{const file=Array.from(e.clipboardData.items).find(item=>item.kind==="file"&&item.type.startsWith("image/"))?.getAsFile();if(file){e.preventDefault();void uploadImage(file);}}} onDragOver={e=>{if(e.dataTransfer.types.includes("Files"))e.preventDefault();}} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();void uploadImage(e.dataTransfer.files[0]);}}} className={`${styles.canvas} ${!background?styles.compactCanvas:""} ${editing?styles.placing:""}`} aria-label="Room layout" style={{backgroundImage:background?`url("${background}")`:undefined}}>
        {state.design.buttons.map(b=>{const appearance=state.appearances[b.id];return <button key={b.id} className={styles.tile} disabled={busy} aria-label={({"내 AI":"My AI","파일":"Files","Chat":"My AI"} as Record<string,string>)[b.label]??b.label} style={{left:`${b.x}%`,top:`${b.y}%`,width:`${b.width}%`,height:`${b.height}%`,opacity:b.opacity,color:appearance?.color,backgroundColor:appearance?.background,borderColor:appearance?.borderColor,borderWidth:appearance?.borderWidth??0,borderRadius:appearance?.radius,fontSize:appearance?.fontSize}} onPointerDown={e=>{if(!editing)return;const rect=canvasRef.current!.getBoundingClientRect();drag.current={id:b.id,x:e.clientX,y:e.clientY,left:b.x,top:b.y,width:rect.width,height:rect.height};e.currentTarget.setPointerCapture(e.pointerId);setSelected(b.id);}} onPointerMove={e=>moveButton(e,b)} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onClick={()=>{if(editing)setSelected(b.id);else if(b.capability==="files")void openFiles();else if(b.capability==="secretary")openKatie();else openConversation("chat");}}>{({"내 AI":"My AI","파일":"Files","Chat":"My AI"} as Record<string,string>)[b.label]??b.label}</button>;})}
      </section>
      {editing&&<fieldset aria-label="Button editor" disabled={busy} className={styles.editor} style={editorPosition?{left:editorPosition.left,top:editorPosition.top,right:"auto",bottom:"auto"}:undefined}>
      {button&&<div className={styles.fields}><button type="button" className={styles.editorHandle} aria-label="Move Button Settings" onPointerDown={e=>{if(e.button!==0)return;const r=e.currentTarget.closest("fieldset")!.getBoundingClientRect();editorDrag.current={pointerId:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,width:r.width,height:r.height};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}} onPointerMove={e=>{const d=editorDrag.current;if(!d||d.pointerId!==e.pointerId)return;setEditorPosition({left:Math.max(8,Math.min(window.innerWidth-d.width-8,d.left+e.clientX-d.x)),top:Math.max(8,Math.min(window.innerHeight-d.height-8,d.top+e.clientY-d.y))});}} onPointerUp={()=>{editorDrag.current=null;}} onPointerCancel={()=>{editorDrag.current=null;}} onLostPointerCapture={()=>{editorDrag.current=null;}} onKeyDown={e=>{const delta=({ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]} as Record<string,number[]>)[e.key];if(!delta)return;e.preventDefault();const r=e.currentTarget.closest("fieldset")!.getBoundingClientRect();setEditorPosition({left:Math.max(8,Math.min(window.innerWidth-r.width-8,r.left+delta[0])),top:Math.max(8,Math.min(window.innerHeight-r.height-8,r.top+delta[1]))});}}>⠿ Button Settings</button><label>Label<input maxLength={80} value={button.label} onChange={e=>editButton({label:e.target.value})}/></label>{([['x','Left',0,100-button.width],['y','Top',0,100-button.height],['width','Width',4,100-button.x],['height','Height',4,100-button.y],['opacity','Opacity',0,1]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="range" min={min} max={max} step={key==="opacity"?.05:1} value={button[key]} onChange={e=>editButton({[key]:Number(e.target.value)})}/></label>)}{([['color','Text colour'],['background','Background'],['borderColor','Border']] as const).map(([key,label])=><label key={key}>{label}<input type="color" value={state.appearances[button.id]?.[key]??"#ffffff"} onChange={e=>update({...state,appearances:{...state.appearances,[button.id]:{...(state.appearances[button.id]??{color:"#ffffff",background:"#172a41",borderColor:"#64748b",borderWidth:0,radius:12,fontSize:16}),[key]:e.target.value}}})}/></label>)}{([['borderWidth','Border width',appearanceLimits.borderWidth.min,appearanceLimits.borderWidth.max],['radius','Corners',appearanceLimits.radius.min,appearanceLimits.radius.max],['fontSize','Text size',appearanceLimits.fontSize.min,appearanceLimits.fontSize.max]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="range" min={min} max={max} value={state.appearances[button.id]?.[key]??(key==="fontSize"?16:key==="radius"?12:0)} onChange={e=>update({...state,appearances:{...state.appearances,[button.id]:{...(state.appearances[button.id]??{color:"#ffffff",background:"#172a41",borderColor:"#64748b",borderWidth:0,radius:12,fontSize:16}),[key]:Number(e.target.value)}}})}/></label>)}</div>}<div className={`${styles.toolbar} ${styles.editorToolbar}`}><strong>Move buttons, then Save</strong><button onClick={()=>void save()}>Save</button><button onClick={()=>{setState(editBaseline.current??saved.current);liveState.current=editBaseline.current??saved.current;setDirty(false);setEditing(false);setSelected(null);}}>Cancel</button></div></fieldset>}
      <section ref={chatPanel} className={styles.chat} aria-label="AI answers"><h2>AI Answers</h2><AnswerCards key={roomId} roomId={roomId} reorderDisabled={busy||dirty} onReorder={(id,target)=>void reorderAI(id as AIProviderId,target as AIProviderId)} providers={shownProviders.map(id=>({id,label:providers.find(p=>p.id===id)?.label??id,logo:logo(id)}))} turns={turns} statuses={cardStatus} onRead={()=>{continuousVoice.current=false;voiceRef.current?.cancel();audioRef.current?.pause();playbackDone.current?.();}}/>
      <div className={styles.composerBox}><textarea ref={messageInput} aria-label="Message" value={text} onChange={e=>{voiceRef.current?.cancel();setText(e.target.value);}} placeholder="Ask your selected AIs…" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/><div className={styles.compose}>{voiceLoaded?createElement('rc-voice-control',{key:roomId,ref:(el:VoiceElement|null)=>{voiceRef.current=el;}}):<Mic/>}<button aria-label="Send" className={styles.send} disabled={busy||!text.trim()||!state.selectedProviders.length} onClick={()=>void send()}><Send size={19}/></button></div></div></section>
      {showFiles&&<section ref={filesPanel} className={styles.editor}><div className={styles.toolbar}><h2>Files</h2><button onClick={()=>fileInput.current?.click()}>Add Text File</button><button onClick={()=>setShowFiles(false)}>Close Files</button></div>{files.map(f=><button key={f.id} onClick={()=>{voiceRef.current?.cancel();setText(`Please summarise this file.\nFile: ${f.name}\n${f.text.slice(0,11000)}`);setShowFiles(false);openConversation("chat");}}>{f.name}</button>)}</section>}
    </>}
    <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Room background image" onChange={e=>{void uploadImage(e.target.files?.[0]);e.target.value="";}}/><input ref={fileInput} type="file" accept=".txt,.md,.csv" hidden onChange={e=>void uploadFile(e.target.files?.[0])}/>
  </main>;
}
