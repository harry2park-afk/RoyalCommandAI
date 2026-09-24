"use client";
import { useCallback, useEffect, useRef, useState, createElement } from "react";
import { Move, Mic, Send, Settings2, Plus, Copy, Image as ImageIcon, Folder, X } from "lucide-react";
import type { CloudState, Button } from "@/lib/rcv3/cloud-state";
import type { Turn } from "@/lib/rcv3/execution";
import type { AIProviderId } from "@/lib/ai/types";
import {roomTemplates,templateImage} from "@/lib/rcv3/templates";
import styles from "./room.module.css";
import RoomCatalog from "./RoomCatalog";
import AnswerCards, { type AnswerCardsHandle } from "./AnswerCards";
import EmailReview from '@/components/rcv3-toolbox/EmailReview';
import ToolRequests from '@/components/rcv3-toolbox/ToolRequests';
import PaymentGate from "@/components/rcv3-toolbox/PaymentGate";
import Toolbox from "@/components/rcv3-toolbox/Toolbox";
import RoomNavigation, {type RoomNavigationHandle} from "@/components/rcv3-toolbox/RoomNavigation";
import ToolButton from "@/components/rcv3-toolbox/ToolButton";
import { copyText } from "@/components/rcv3-toolbox/CopyText";
import HelpText from "@/components/help/HelpText";
import { installTool, removeTool, runTool, type ToolId, type ToolActions } from "@/lib/rcv3/toolbox";
import PersonalAI from "./PersonalAI";
import { appearanceLimits } from "@/lib/rcv3/appearance-limits";

type VoiceElement = HTMLElement & { toggle:()=>void; autoSubmit:boolean; liveDictation:boolean; language:string; cancel:()=>void; transcribe: (blob: Blob, options: { signal: AbortSignal }) => Promise<string>; start: () => Promise<void>; stop: () => void };
async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(`/api/rcv3/${path}`, body === undefined ? { cache: "no-store" } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  const value = await response.json();
  if (!response.ok) throw new Error(`${value.error ?? "Request failed"} (${value.code ?? response.status})`);
  return value;
}
export default function Room({ providers, secretaryRooms, language, toolboxManager = false }: { toolboxManager?:boolean; providers: { id: AIProviderId; label: string; configured:boolean }[]; secretaryRooms:{id:string;name:string}[]; language:string }) {
  const roomNavigation=useRef<RoomNavigationHandle>(null);
  const [rooms,setRooms] = useState<{id:string;name:string}[]>([]), [roomId,setRoomId] = useState("");
  const [state,setState] = useState<CloudState|null>(null), [background,setBackground] = useState("");

  const [motionPaused,setMotionPaused] = useState(false);
  const flowerMotion = background.startsWith("/room-designs/flower-office-20260921-");

  const [scope,setScope] = useState<"chat"|"secretary">("chat"), [turns,setTurns] = useState<Turn[]>([]);
  const [text,setText] = useState(""), [busy,setBusy] = useState(false), [error,setError] = useState("");
  const [editing,setEditing] = useState(false), [selected,setSelected] = useState<string|null>(null);
  const [repeatStyle,setRepeatStyle]=useState(true);
  const [editorPosition,setEditorPosition]=useState<{left:number;top:number}|null>(null);
  const editorDrag=useRef<{pointerId:number;x:number;y:number;left:number;top:number;width:number;height:number}|null>(null);
  useEffect(()=>{if(!editing){setEditorPosition(null);editorDrag.current=null;}},[editing]);
  const [files,setFiles] = useState<{id:string;name:string;text:string}[]>([]), [showFiles,setShowFiles] = useState(false);

  const [warehouse,setWarehouse]=useState(false), [galleryTab,setGalleryTab]=useState("Rooms"), [roomSearch,setRoomSearch]=useState("");
  const galleryRef=useRef<HTMLElement>(null);
  const answerTools=useRef<AnswerCardsHandle>(null);
  const [toolNotice,setToolNotice]=useState("");
  const [emailReviewOpen,setEmailReviewOpen]=useState(false);
  const [requestsOpen,setRequestsOpen]=useState(false);
  const [paymentRequired,setPaymentRequired]=useState(true),[paymentOpen,setPaymentOpen]=useState(false);
  const installing=useRef(false);
  const galleryTitle=({Rooms:"Create Room",Connections:"AI List",Tools:"Toolbox",Help:"AI Helper",MyRooms:"My Rooms",Personal:"My AI account"} as Record<string,string>)[galleryTab]??"Toolbox";
  const [aiSearch,setAISearch]=useState("");
  const [liveTurns,setLiveTurns]=useState<Turn[]>([]);
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
  const generation=useRef(0), audioRef=useRef<HTMLAudioElement|null>(null);
  const mounted = Boolean(state);
  const liveState=useRef<CloudState|null>(state);liveState.current=state;
  const editBackground=useRef("");
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
    const token=++generation.current;editBaseline.current=null;editBackground.current=""; roomRef.current=id; setRoomId(id); setState(null); setPaymentRequired(true); setPaymentOpen(false); setError(""); setDirty(false); setEditing(false); setSelected(null); setTurns([]); setLiveTurns([]); setText(""); setFiles([]); setShowFiles(false); setBackground("");setBatchIds([]);setCardStatus({});
    audioRef.current?.pause();continuousVoice.current=false;
    const billingRequested=new URLSearchParams(window.location.search).get("billing")==="1";
    try { const result=await api(`state?room=${encodeURIComponent(id)}`); if(token!==generation.current)return;
      setPaymentRequired(result.paymentRequired===true); if(billingRequested)setPaymentOpen(true); setState(result.state); saved.current=result.state; setBackground(result.background?.data??"");
      window.history.replaceState(null,"",`/rcv3?room=${encodeURIComponent(id)}`);
    } catch(e){if(token===generation.current)setError((e as Error).message);}
  },[]);
  useEffect(()=>{let active=true; api("rooms").then(result=>{if(!active)return;setRooms(result.rooms); const requested=new URLSearchParams(window.location.search).get("room"); const id=requested||result.rooms[0]?.id;if(id)void openRoom(id);}).catch(e=>setError(e.message));return()=>{active=false;};},[openRoom]);
  useEffect(()=>{if(!roomId||paymentRequired)return;let active=true;setTurns([]);api(`chat?room=${roomId}&scope=${scope}`).then(r=>{if(active)setTurns(current=>[...new Map([...r.turns,...current].map((t:Turn)=>[t.requestId,t])).values()].sort((a,b)=>a.at.localeCompare(b.at)));}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[roomId,scope,paymentRequired]);
  useEffect(()=>{import("../../../rcv3/voice-control.mjs").then(()=>setVoiceLoaded(true)).catch(()=>setError("Could not load microphone."));return()=>{audioRef.current?.pause();};},[]);
  useEffect(()=>{const el=voiceRef.current;if(!el||!roomId||!voiceLoaded)return;
    el.autoSubmit=false;el.liveDictation=true;el.language=language;el.transcribe=async(blob,{signal})=>{const form=new FormData();form.set("roomId",roomId);form.set("requestId",crypto.randomUUID());form.set("audio",blob,blob.type.includes("mp4")?"voice.mp4":"voice.webm");const r=await fetch("/api/rcv3/audio",{method:"POST",body:form,signal});const d=await r.json();if(!r.ok)throw new Error(d.error);return d.text;};
    const listener=(event:Event)=>transcriptHandler.current((event as CustomEvent).detail.text);const toggle=(event:Event)=>{continuousVoice.current=false;if((event as CustomEvent).detail.enabled){dictationBase.current=draftRef.current;window.dispatchEvent(new Event("rc:pause-answer-audio"));audioRef.current?.pause();playbackDone.current?.();messageInput.current?.focus({preventScroll:true});}};el.addEventListener("voice-toggle",toggle);el.addEventListener("transcript",listener);return()=>{el.removeEventListener("transcript",listener);el.removeEventListener("voice-toggle",toggle);};
  },[roomId,voiceLoaded,mounted,language]);
  useEffect(()=>{const hide=()=>{if(document.hidden){continuousVoice.current=false;voiceRef.current?.cancel();audioRef.current?.pause();playbackDone.current?.();}};document.addEventListener("visibilitychange",hide);return()=>{document.removeEventListener("visibilitychange",hide);hide();};},[]);
  function create(){if(!busyRef.current&&!dirty)window.location.assign("/rcv3/create");}
  async function send(message=text,spoken=false){
    if(paymentRequired){setPaymentOpen(true);return;}
    if(!message.trim()||busyRef.current||!state)return;
    const chosen=[...state.selectedProviders];if(!chosen.length){setError("Select at least one AI in AI List.");return;}
    voiceRef.current?.cancel();busyRef.current=true;setBusy(true);setError("");const target=roomId;
    setBatchIds(chosen);setCardStatus(Object.fromEntries(chosen.map(id=>[id,"Working…"])));
    try{
      await writes.current;if(writeFailed.current)throw new Error("Settings were not saved. Please retry your selection.");
      const outcomes=await Promise.allSettled(chosen.map(async id=>{
        try{const turn:Turn=await api("chat",{roomId:target,requestId:crypto.randomUUID(),scope:"chat",provider:id,prompt:message});
          if(roomRef.current===target){setTurns(old=>[...old,turn]);setLiveTurns(old=>[...old,turn]);setCardStatus(old=>({...old,[id]:""}));}return turn;
        }catch(e){if(roomRef.current===target)setCardStatus(old=>({...old,[id]:`Failed: ${(e as Error).message}`}));throw e;}
      }));
      if(roomRef.current!==target)return;
      const t=outcomes.find((r):r is PromiseFulfilledResult<Turn>=>r.status==="fulfilled")?.value;
      if(t)setText(current=>current===message?"":current);
      if(spoken&&t){const r=await fetch("/api/rcv3/audio",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({roomId:target,requestId:crypto.randomUUID(),text:t.answer.slice(0,4000)}),signal:AbortSignal.timeout(35000)});if(!r.ok)throw new Error("Answer saved. Audio is unavailable.");const url=URL.createObjectURL(await r.blob());if(roomRef.current!==target){URL.revokeObjectURL(url);return;}const audio=new Audio(url);audioRef.current=audio;await new Promise<void>((resolve,reject)=>{const done=()=>{URL.revokeObjectURL(url);playbackDone.current=null;resolve();};playbackDone.current=done;audio.onended=done;audio.onerror=()=>{done();reject(new Error("Audio playback failed."));};void audio.play().catch(reject);});if(continuousVoice.current&&roomRef.current===target&&!document.hidden)void voiceRef.current?.start();}
    }catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}
  }
  transcriptHandler.current=(message)=>{const base=dictationBase.current;setText(base+(base&&!/\s$/.test(base)?" ":"")+message);requestAnimationFrame(()=>{const input=messageInput.current;if(input)input.scrollTop=input.scrollHeight;});};
  function update(next:CloudState){liveState.current=next;setState(next);setDirty(true);}
  function savedLayoutMatches(expected:CloudState,actual:CloudState){
    return JSON.stringify({design:expected.design,appearances:expected.appearances})===JSON.stringify({design:actual.design,appearances:actual.appearances});
  }
  function editButton(patch:Partial<Button>){const current=liveState.current;if(!current||!selected)return;update({...current,design:{...current.design,buttons:current.design.buttons.map(b=>b.id===selected?{...b,...patch}:b)}});}
  function selectButtonForEdit(id:string){
    if(!editing||!repeatStyle||!selected||selected===id){setSelected(id);return;}
    setState(old=>{
      if(!old)return old;
      const source=old.design.buttons.find(item=>item.id===selected);
      const target=old.design.buttons.find(item=>item.id===id);
      if(!source||!target)return old;
      const width=Math.max(4,Math.min(source.width,100-target.x));
      const height=Math.max(4,Math.min(source.height,100-target.y));
      const buttons=old.design.buttons.map(item=>item.id===id?{...item,width,height,opacity:source.opacity}:item);
      const appearances={...old.appearances};
      const sourceAppearance=old.appearances[source.id];
      if(sourceAppearance)appearances[id]={...sourceAppearance};
      else delete appearances[id];
      const next={...old,design:{...old.design,buttons},appearances};
      liveState.current=next;
      return next;
    });
    setDirty(true);
    setSelected(id);
  }
  async function save(){
    const draft=liveState.current??state;
    if(!draft||!saved.current||saving)return;
    const target=roomId,token=generation.current,selectedBefore=selected;
    setError("");setToolNotice("");
    try{
      const persisted=await persist(draft);
      if(token!==generation.current||target!==roomRef.current)return;
      const verified=await api(`state?room=${encodeURIComponent(target)}`);
      if(token!==generation.current||target!==roomRef.current)return;
      const serverState=verified.state as CloudState;
      if(serverState.revision<persisted.revision||!savedLayoutMatches(draft,serverState))throw new Error("Save was not confirmed by the server. Your changes are still open.");
      saved.current=serverState;liveState.current=serverState;setState(serverState);
      setDirty(false);setEditing(false);editingNow.current=false;setSelected(null);
      setToolNotice("Saved");
    }catch(e){
      if(token!==generation.current)return;
      liveState.current=draft;setState(draft);setDirty(true);setEditing(true);setSelected(selectedBefore??draft.design.buttons[0]?.id??null);
      setError((e as Error).message||"Save failed. Your changes are still open.");
    }
  }

  async function addTool(id:ToolId){
    if(!toolboxManager)throw new Error("RC approval is required to install tools.");
    if(installing.current||busyRef.current||dirty||saving)throw new Error("Wait for your current changes to finish.");
    const current=liveState.current;if(!current)throw new Error("Choose a room first.");
    installing.current=true;busyRef.current=true;setBusy(true);
    try{const next=installTool(current,id,()=>crypto.randomUUID());if(next!==current)await persist(next);}
    finally{installing.current=false;busyRef.current=false;setBusy(false);}
  }
  function showGallery(tab:string){if(tab==="Tools"&&!toolboxManager)return;setGalleryTab(tab);setWarehouse(true);}
  function beginEdit(){if(paymentRequired){setPaymentOpen(true);return;}editBaseline.current=liveState.current;editBackground.current=background;setRepeatStyle(true);setEditing(true);setSelected(liveState.current?.design.buttons[0]?.id??null);}
  const toolActions:ToolActions={
    chat:()=>openConversation("chat"),secretary:()=>openKatie(),files:()=>openFiles(),
    "ai-list":()=>showGallery("Connections"),"personal-ai":()=>showGallery("Personal"),
    microphone:async()=>{if(!voiceRef.current)throw new Error("Microphone is still loading. Try again.");openConversation("chat");voiceRef.current.toggle();},
    send:async()=>{if(!text.trim())throw new Error("Write a message first.");await send();},
    speaker:()=>{if(!answerTools.current?.toggleLatest())throw new Error("There is no AI answer to read yet.");},
    "copy-answer":async()=>{await copyText(turns.filter(turn=>turn.scope==="chat").at(-1)?.answer??"");setToolNotice("Copied");},
    helper:()=>showGallery("Help"),learning:()=>{window.location.assign("/rcv3/learn");},meetings:()=>{window.location.assign("/rcv3/meetings");},
    "create-room":()=>create(),"room-list":()=>roomNavigation.current?.open(),background:()=>imageInput.current?.click(),
    "edit-buttons":()=>beginEdit(),"upload-file":()=>{setShowFiles(true);fileInput.current?.click();},toolbox:()=>showGallery("Tools"),payment:()=>setPaymentOpen(true),
  };
  async function executeTool(id:ToolId){
    if(paymentRequired){setPaymentOpen(true);return;}
    if(busyRef.current||dirty||saving||editing)return;
    setError("");setToolNotice("");
    try{await runTool(id,toolActions);}catch(error){setError((error as Error).message);}
  }
  async function uploadImage(file?:File){if(!file||!state||busyRef.current)return;const target=roomId,token=generation.current;busyRef.current=true;setBusy(true);try{if(file.size>950000)throw new Error("Use a PNG, JPG or WebP under 950KB.");const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file);});const r=await api("asset",{roomId,image:{data}});if(target!==roomRef.current||token!==generation.current)return;if(!editingNow.current){editBaseline.current=liveState.current;editBackground.current=background;}setBackground(r.image.data);setEditing(true);setSelected(state.design.buttons[0]?.id??null);setError("");update({...state,design:{...state.design,backgroundAssetId:r.id}});}catch(e){if(token===generation.current)setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
  async function openFiles(){const token=generation.current;setShowFiles(true);requestAnimationFrame(()=>filesPanel.current?.scrollIntoView({block:"start",behavior:"instant"}));try{const result=await api(`files?room=${roomId}`);if(token===generation.current)setFiles(result.files);}catch(e){if(token===generation.current)setError((e as Error).message);}}
  async function uploadFile(file?:File){if(!file||busyRef.current)return;const target=roomId,token=generation.current;busyRef.current=true;setBusy(true);try{if(file.size>100000||!/[.](txt|md|csv)$/i.test(file.name))throw new Error("Use a TXT, MD or CSV file under 100KB.");const value={id:crypto.randomUUID(),name:file.name,text:await file.text()};await api("files",{roomId,file:value});if(target===roomRef.current&&token===generation.current)setFiles(old=>[value,...old]);}catch(e){if(token===generation.current)setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
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
  function openKatie(){if(state&&roomId)window.location.assign(`/secretary?room=${encodeURIComponent(state.secretaryRoomId || roomId)}&from=rcv3&rcv3Room=${encodeURIComponent(roomId)}`);}
  function chooseTemplate(id:string){if(!busyRef.current&&!dirty&&roomTemplates.some(t=>t.id===id))window.location.assign(`/rcv3/create?template=${encodeURIComponent(id)}`);}
  useEffect(()=>{if(!warehouse)return;const old=document.body.style.overflow;document.body.style.overflow="hidden";const previous=document.activeElement as HTMLElement|null;requestAnimationFrame(()=>galleryRef.current?.querySelector<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')?.focus());const close=(e:KeyboardEvent)=>{if(e.key==="Escape"&&!busyRef.current)setWarehouse(false);if(e.key==="Tab"){const items=Array.from(galleryRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],textarea:not(:disabled)')??[]);const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};window.addEventListener("keydown",close);return()=>{document.body.style.overflow=old;window.removeEventListener("keydown",close);previous?.focus();};},[warehouse]);
  function moveButton(e:React.PointerEvent<HTMLButtonElement>,b:Button){
    if(!editing||!drag.current||drag.current.id!==b.id)return;const d=drag.current;
    const x=Math.max(0,Math.min(100-b.width,d.left+(e.clientX-d.x)/d.width*100)),y=Math.max(0,Math.min(100-b.height,d.top+(e.clientY-d.y)/d.height*100));
    setState(old=>{if(!old)return old;const next={...old,design:{...old.design,buttons:old.design.buttons.map(v=>v.id===b.id?{...v,x,y}:v)}};liveState.current=next;return next;});setDirty(true);
  }
  const visibleProviders=new Set([...(state?.selectedProviders??[]),...batchIds]);
  const shownProviders=orderedProviders.filter(p=>visibleProviders.has(p.id)).map(p=>p.id);
  const button=state?.design.buttons.find(b=>b.id===selected);
  // Use the same server-owned room list as My Rooms so the displayed current
  // room name cannot drift from the navigation list. State name is fallback
  // only while the list is loading.
  const currentRoomName=rooms.find(room=>room.id===roomId)?.name??state?.name??"";
  return <main className={styles.root}>
    <header className={styles.header}>{toolboxManager&&<ToolButton toolId="toolbox" disabled={busy||dirty||saving||!state} onClick={()=>showGallery("Tools")}/>}<a href="/rooms/rca">← RC</a><strong className={styles.productTitle}>RC V3</strong><span className={styles.roomNamePlate} title={currentRoomName||"My Room"} aria-live="polite">{currentRoomName||"My Room"}</span><RoomNavigation language={language} currentRoomId={roomId} ref={roomNavigation} disabled={busy||dirty||saving} onOpen={id=>void openRoom(id)}/><a href="/rcv3/learn">AI Learning Room</a>{state&&(<section className={`${styles.toolbar} ${styles.aiToolbar}`} aria-label="Answer AIs"><PersonalAI/><button disabled={busy||dirty} onClick={()=>{setGalleryTab("Connections");setAISearch("");setWarehouse(true);}}>AI List</button>{orderedProviders.filter(p=>state.connectedProviders.includes(p.id)&&state.selectedProviders.includes(p.id)).map(p=><button key={p.id} className={styles.fixedAI} title={`${p.label}: ${state.selectedProviders.includes(p.id)?"On":"Off"}`} aria-label={`Answer with ${p.label}`} aria-pressed={state.selectedProviders.includes(p.id)} disabled={busy||editing} onClick={()=>{if(paymentRequired)setPaymentOpen(true);else void selectAI(p.id,false);}}>{brand(p.id)}<span className={styles.aiTick} aria-hidden="true">✓</span></button>)}</section>)}<ToolButton toolId="helper" disabled={busy||dirty||saving} onClick={()=>showGallery("Help")} aria-label="AI Helper"><img className={styles.helperPortrait} src="/ai-helper-woman.svg" alt="" width={44} height={55}/></ToolButton><button disabled={busy||dirty} onClick={()=>{setGalleryTab("Rooms");setWarehouse(!warehouse);}}>Create Room</button>{state&&<button disabled={busy||dirty} onClick={beginEdit}>Edit Buttons</button>}</header>
    {toolboxManager&&<button onClick={()=>setEmailReviewOpen(true)}>Email Review</button>}
    {toolboxManager&&emailReviewOpen&&<EmailReview onClose={()=>setEmailReviewOpen(false)}/>}
    {state&&<button onClick={()=>setRequestsOpen(true)}>{toolboxManager?'RC Requests':'Request a Tool'}</button>}
    {requestsOpen&&roomId&&<ToolRequests roomId={roomId} manager={toolboxManager} onClose={()=>setRequestsOpen(false)}/>}
    {paymentOpen&&roomId&&<PaymentGate roomId={roomId} onClose={()=>setPaymentOpen(false)} onCheck={()=>openRoom(roomId)}/>}
    {paymentRequired&&state&&<p role="status"><HelpText helpKey="toolPaymentRequired"/> <button onClick={()=>setPaymentOpen(true)}>Pay</button></p>}
    {toolNotice&&<p role="status">{toolNotice}</p>}
    {saving&&<span className={styles.saveStatus} role="status">Saving…</span>}
    {error&&<div className={styles.error} role="alert">{error}</div>}
    {movingAI&&movePoint&&<div className={styles.aiGhost} style={{left:movePoint.x+12,top:movePoint.y+12}}>{brand(movingAI)}</div>}
    {warehouse&&<section ref={galleryRef} className={styles.gallery} role="dialog" aria-modal="true" aria-label={galleryTitle}>
      <div className={styles.galleryHeader}><div><small>ROYAL COMMAND</small><h1>{galleryTitle}</h1></div>{["Rooms","Connections"].includes(galleryTab)&&<input autoFocus aria-label={galleryTab==="Rooms"?"Search rooms":"Search AIs"} placeholder={galleryTab==="Rooms"?"Search rooms…":"Search AIs…"} value={galleryTab==="Rooms"?roomSearch:aiSearch} onChange={e=>galleryTab==="Rooms"?setRoomSearch(e.target.value):setAISearch(e.target.value)}/>}<button disabled={busy||saving} onClick={()=>setWarehouse(false)}>Close</button></div>
      <nav className={styles.galleryTabs} aria-label="Warehouse sections">{(toolboxManager?["Tools","Rooms","Connections","MyRooms"]:["Rooms","Connections","MyRooms"]).map(t=><button key={t} aria-pressed={galleryTab===t} onClick={()=>setGalleryTab(t)}>{({Tools:"Toolbox",Rooms:"Create Room",Connections:"AI List",MyRooms:"My Rooms"} as Record<string,string>)[t]}</button>)}</nav>
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      {galleryTab==="Tools"&&toolboxManager?<Toolbox installed={state?.design.buttons.map(button=>button.capability)??[]} busy={busy||saving||dirty||!state} onInstall={addTool}/>
      :galleryTab==="Help"?<div><h2>AI Helper</h2><p><HelpText helpKey="toolboxOverview"/></p><p><HelpText helpKey="createOverview"/></p><p><HelpText helpKey="learnOverview"/></p></div>
      :galleryTab==="MyRooms"?<div>{rooms.map(room=><button key={room.id} disabled={busy||saving||dirty} onClick={()=>{setWarehouse(false);void openRoom(room.id);}}>{room.name}</button>)}</div>
      :galleryTab==="Personal"?<PersonalAI/>
      :galleryTab==="Rooms"?<RoomCatalog search={roomSearch} busy={busy||dirty} creating={null} onChoose={id=>void chooseTemplate(id)}/>
      :state?<><h2>Select AIs</h2><div className={styles.providerGrid}>{orderedProviders.filter(p=>p.label.toLowerCase().includes(aiSearch.toLowerCase().trim())).map(p=><div key={p.id} data-ai-order={p.id} data-connected={state.connectedProviders.includes(p.id)&&state.selectedProviders.includes(p.id)} className={styles.providerChoice} style={{opacity:movingAI===p.id?.6:1}}><button type="button" className={styles.aiMove} aria-label={`Move ${p.label}`} disabled={busy||dirty} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);movingAIRef.current=p.id;setMovingAI(p.id);setMovePoint({x:e.clientX,y:e.clientY});}} onPointerMove={e=>{if(movingAIRef.current)setMovePoint({x:e.clientX,y:e.clientY});}} onPointerUp={e=>{if(!movingAIRef.current)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>("[data-ai-order]")?.dataset.aiOrder;movingAIRef.current=null;setMovingAI(null);setMovePoint(null);if(target)void reorderAI(p.id,target as AIProviderId);}} onPointerCancel={()=>{movingAIRef.current=null;setMovingAI(null);setMovePoint(null);}} onLostPointerCapture={()=>{movingAIRef.current=null;setMovingAI(null);setMovePoint(null);}} onKeyDown={e=>{if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;e.preventDefault();const grid=e.currentTarget.closest("[data-ai-order]")!.parentElement!;const columns=getComputedStyle(grid).gridTemplateColumns.split(" ").length;const delta=e.key==="ArrowLeft"?-1:e.key==="ArrowRight"?1:e.key==="ArrowUp"?-columns:columns;const visible=orderedProviders.filter(p=>p.label.toLowerCase().includes(aiSearch.toLowerCase().trim()));const target=visible[visible.findIndex(x=>x.id===p.id)+delta];if(target)void reorderAI(p.id,target.id);}}><Move size={20}/></button><label className={styles.aiSelect}><input type="checkbox" aria-label={`Select ${p.label}`} checked={state.selectedProviders.includes(p.id)} disabled={busy||dirty||!p.configured} onChange={()=>void selectAI(p.id,!state.connectedProviders.includes(p.id))}/>{brand(p.id)}<small>{state.connectedProviders.includes(p.id)&&state.selectedProviders.includes(p.id)?"Connected":p.configured?"Connect":"Unavailable"}</small></label></div>)}</div><h2>Katie</h2><label>Existing secretary room <select aria-label="Katie room" value={state.secretaryRoomId??""} disabled={busy||dirty} onChange={e=>void linkKatie(e.target.value)}><option value="">This room · New Katie</option>{secretaryRooms.map(r=><option key={r.id} value={r.id}>{r.name} · {r.id.slice(0,8)}</option>)}</select></label></>:<p>Choose a room first.</p>}
    </section>}
    {!state?<section className={styles.empty}><h1>Choose a room from Create Room</h1></section>:<>


      {flowerMotion&&<div className={styles.toolbar}><button type="button" aria-pressed={motionPaused} disabled={editing} onClick={()=>setMotionPaused(v=>!v)}>{motionPaused?"Resume Motion":"Pause Motion"}</button></div>}
      <section ref={canvasRef} tabIndex={0} onPaste={e=>{const file=Array.from(e.clipboardData.items).find(item=>item.kind==="file"&&item.type.startsWith("image/"))?.getAsFile();if(file){e.preventDefault();void uploadImage(file);}}} onDragOver={e=>{if(e.dataTransfer.types.includes("Files"))e.preventDefault();}} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();void uploadImage(e.dataTransfer.files[0]);}}} className={`${styles.canvas} ${!background?styles.compactCanvas:""} ${editing?styles.placing:""} ${flowerMotion?styles.flowerMotion:""}`} aria-label="Room layout" style={{...(!background?{height:Math.max(180,Math.ceil(state.design.buttons.length/3)*80)}:{}),...(background.startsWith("/room-designs/")?{aspectRatio:"16 / 9",minHeight:0,backgroundSize:"contain",backgroundRepeat:"no-repeat"}:{}),animationPlayState:motionPaused||editing||warehouse?"paused":"running",backgroundImage:background?`url("${background}")`:undefined}}>
        {state.design.buttons.filter(b=>toolboxManager||b.capability!=="toolbox").map(b=>{const appearance=state.appearances[b.id];return <ToolButton toolId={b.capability} key={b.id} className={styles.tile} title={paymentRequired?"Payment required":undefined} disabled={busy||saving} aria-label={({"내 AI":"My AI","파일":"Files","Chat":"My AI"} as Record<string,string>)[b.label]??b.label} style={{left:`${b.x}%`,top:`${b.y}%`,width:`${b.width}%`,height:`${b.height}%`,opacity:b.opacity,color:appearance?.color,backgroundColor:appearance?.background,borderColor:appearance?.borderColor,borderWidth:appearance?.borderWidth??0,borderRadius:appearance?.radius,fontSize:appearance?.fontSize}} onPointerDown={e=>{if(!editing)return;const rect=canvasRef.current!.getBoundingClientRect();drag.current={id:b.id,x:e.clientX,y:e.clientY,left:b.x,top:b.y,width:rect.width,height:rect.height};e.currentTarget.setPointerCapture(e.pointerId);selectButtonForEdit(b.id);}} onPointerMove={e=>moveButton(e,b)} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onClick={()=>{if(editing)selectButtonForEdit(b.id);else void executeTool(b.capability);}}>{paymentRequired?"🔒 ":""}{({"내 AI":"My AI","파일":"Files","Chat":"My AI"} as Record<string,string>)[b.label]??b.label}</ToolButton>;})}
      </section>
      {editing&&<fieldset aria-label="Button editor" disabled={busy} className={styles.editor} style={editorPosition?{left:editorPosition.left,top:editorPosition.top,right:"auto",bottom:"auto"}:undefined}>
      {button&&<div className={styles.fields}><button type="button" className={styles.editorHandle} aria-label="Move Button Settings" onPointerDown={e=>{if(e.button!==0)return;const r=e.currentTarget.closest("fieldset")!.getBoundingClientRect();editorDrag.current={pointerId:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,width:r.width,height:r.height};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}} onPointerMove={e=>{const d=editorDrag.current;if(!d||d.pointerId!==e.pointerId)return;setEditorPosition({left:Math.max(8,Math.min(window.innerWidth-d.width-8,d.left+e.clientX-d.x)),top:Math.max(8,Math.min(window.innerHeight-d.height-8,d.top+e.clientY-d.y))});}} onPointerUp={()=>{editorDrag.current=null;}} onPointerCancel={()=>{editorDrag.current=null;}} onLostPointerCapture={()=>{editorDrag.current=null;}} onKeyDown={e=>{const delta=({ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]} as Record<string,number[]>)[e.key];if(!delta)return;e.preventDefault();const r=e.currentTarget.closest("fieldset")!.getBoundingClientRect();setEditorPosition({left:Math.max(8,Math.min(window.innerWidth-r.width-8,r.left+delta[0])),top:Math.max(8,Math.min(window.innerHeight-r.height-8,r.top+delta[1]))});}}>⠿ Button Settings</button><label>Label<input maxLength={80} value={button.label} onChange={e=>editButton({label:e.target.value})}/></label>{([['x','Left',0,100-button.width],['y','Top',0,100-button.height],['width','Width',4,100-button.x],['height','Height',4,100-button.y],['opacity','Opacity',0,1]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="range" min={min} max={max} step={key==="opacity"?.05:1} value={button[key]} onChange={e=>editButton({[key]:Number(e.target.value)})}/></label>)}{([['color','Text colour'],['background','Background'],['borderColor','Border']] as const).map(([key,label])=><label key={key}>{label}<input type="color" value={state.appearances[button.id]?.[key]??"#ffffff"} onChange={e=>update({...state,appearances:{...state.appearances,[button.id]:{...(state.appearances[button.id]??{color:"#ffffff",background:"#172a41",borderColor:"#64748b",borderWidth:0,radius:12,fontSize:16}),[key]:e.target.value}}})}/></label>)}{([['borderWidth','Border width',appearanceLimits.borderWidth.min,appearanceLimits.borderWidth.max],['radius','Corners',appearanceLimits.radius.min,appearanceLimits.radius.max],['fontSize','Text size',appearanceLimits.fontSize.min,appearanceLimits.fontSize.max]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="range" min={min} max={max} value={state.appearances[button.id]?.[key]??(key==="fontSize"?16:key==="radius"?12:0)} onChange={e=>update({...state,appearances:{...state.appearances,[button.id]:{...(state.appearances[button.id]??{color:"#ffffff",background:"#172a41",borderColor:"#64748b",borderWidth:0,radius:12,fontSize:16}),[key]:Number(e.target.value)}}})}/></label>)}</div>}<div className={`${styles.toolbar} ${styles.editorToolbar}`}><button type="button" aria-pressed={repeatStyle} onClick={()=>setRepeatStyle(value=>!value)}>{repeatStyle?"Same Style: ON":"Same Style: OFF"}</button><button disabled={saving} onClick={()=>void save()}>Save</button>{button&&<button onClick={()=>{update(removeTool(state,button.id));setSelected(null);}}>Remove</button>}<button disabled={saving} onClick={()=>{setState(editBaseline.current??saved.current);liveState.current=editBaseline.current??saved.current;setBackground(editBackground.current);setDirty(false);setEditing(false);setSelected(null);}}>Cancel</button></div></fieldset>}
      <section ref={chatPanel} className={styles.chat} aria-label="AI answers"><h2>AI Answers</h2><AnswerCards ref={answerTools} key={roomId} roomId={roomId} reorderDisabled={busy||dirty} onReorder={(id,target)=>void reorderAI(id as AIProviderId,target as AIProviderId)} providers={shownProviders.map(id=>({id,label:providers.find(p=>p.id===id)?.label??id,logo:logo(id)}))} turns={turns} liveTurns={liveTurns} language={language} statuses={cardStatus} onRead={()=>{continuousVoice.current=false;voiceRef.current?.cancel();audioRef.current?.pause();playbackDone.current?.();}}/>
      <div className={styles.composerBox}><textarea ref={messageInput} aria-label="Message" value={text} onChange={e=>{voiceRef.current?.cancel();setText(e.target.value);}} placeholder="Ask your selected AIs…" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/><div className={styles.compose}>{paymentRequired?<button aria-label="Microphone · Payment required" onClick={()=>setPaymentOpen(true)}><Mic/></button>:voiceLoaded?createElement('rc-voice-control',{key:roomId,ref:(el:VoiceElement|null)=>{voiceRef.current=el;}}):<Mic/>}<ToolButton toolId="send" aria-label="Send" className={styles.send} disabled={busy||!text.trim()||!state.selectedProviders.length} onClick={()=>void send()}><Send size={19}/></ToolButton></div></div></section>
      {showFiles&&<section ref={filesPanel} className={styles.editor}><div className={styles.toolbar}><h2>Files</h2><button onClick={()=>fileInput.current?.click()}>Add Text File</button><button onClick={()=>setShowFiles(false)}>Close Files</button></div>{files.map(f=><button key={f.id} onClick={()=>{voiceRef.current?.cancel();setText(`Please summarise this file.\nFile: ${f.name}\n${f.text.slice(0,11000)}`);setShowFiles(false);openConversation("chat");}}>{f.name}</button>)}</section>}
    </>}
    <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Room background image" onChange={e=>{void uploadImage(e.target.files?.[0]);e.target.value="";}}/><input ref={fileInput} type="file" accept=".txt,.md,.csv" hidden onChange={e=>void uploadFile(e.target.files?.[0])}/>
  </main>;
}
