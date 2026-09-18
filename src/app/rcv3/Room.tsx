"use client";
import { useCallback, useEffect, useRef, useState, createElement } from "react";
import { Mic, Send, Settings2, Plus, Copy, Image as ImageIcon, Folder, X } from "lucide-react";
import type { CloudState, Button } from "@/lib/rcv3/cloud-state";
import type { Turn } from "@/lib/rcv3/execution";
import type { AIProviderId } from "@/lib/ai/types";
import styles from "./room.module.css";

type VoiceElement = HTMLElement & { autoSubmit:boolean; cancel:()=>void; transcribe: (blob: Blob, options: { signal: AbortSignal }) => Promise<string>; start: () => Promise<void>; stop: () => void };
async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(`/api/rcv3/${path}`, body === undefined ? { cache: "no-store" } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  const value = await response.json();
  if (!response.ok) throw new Error(`${value.error ?? "요청 실패"} (${value.code ?? response.status})`);
  return value;
}
export default function Room({ providers }: { providers: { id: AIProviderId; label: string }[] }) {
  const [rooms,setRooms] = useState<{id:string;name:string}[]>([]), [roomId,setRoomId] = useState("");
  const [state,setState] = useState<CloudState|null>(null), [background,setBackground] = useState("");
  const [provider,setProvider] = useState<AIProviderId>(providers[0]?.id ?? "openai");
  const [scope,setScope] = useState<"chat"|"secretary">("chat"), [turns,setTurns] = useState<Turn[]>([]);
  const [text,setText] = useState(""), [busy,setBusy] = useState(false), [error,setError] = useState("");
  const [editing,setEditing] = useState(false), [selected,setSelected] = useState<string|null>(null);
  const [files,setFiles] = useState<{id:string;name:string;text:string}[]>([]), [showFiles,setShowFiles] = useState(false);
  const [checkResult,setCheckResult]=useState("");
  const [voiceLoaded,setVoiceLoaded] = useState(false), [dirty,setDirty] = useState(false);
  const continuousVoice=useRef(false), playbackDone=useRef<(()=>void)|null>(null);
  const voiceRef = useRef<VoiceElement|null>(null), busyRef = useRef(false), roomRef=useRef("");
  const createId = useRef<string|null>(null), generation=useRef(0), audioRef=useRef<HTMLAudioElement|null>(null);
  const mounted = Boolean(state);
  const saved = useRef<CloudState|null>(null), transcriptHandler=useRef<(text:string)=>void>(()=>{});
  const imageInput=useRef<HTMLInputElement>(null), fileInput=useRef<HTMLInputElement>(null);

  const openRoom = useCallback(async (id:string) => {
    const token=++generation.current; roomRef.current=id; setRoomId(id); setState(null); setError(""); setDirty(false); setEditing(false); setSelected(null); setTurns([]); setText(""); setFiles([]); setShowFiles(false); setBackground(""); setCheckResult("");
    audioRef.current?.pause();continuousVoice.current=false;
    try { const result=await api(`state?room=${id}`); if(token!==generation.current)return;
      setState(result.state); saved.current=result.state; setBackground(result.background?.data??"");
      window.history.replaceState(null,"",`/rcv3?room=${id}`);
    } catch(e){if(token===generation.current)setError((e as Error).message);}
  },[]);
  useEffect(()=>{let active=true; api("rooms").then(result=>{if(!active)return;setRooms(result.rooms); const id=new URLSearchParams(window.location.search).get("room")||result.rooms[0]?.id;if(id)void openRoom(id);}).catch(e=>setError(e.message));return()=>{active=false;};},[openRoom]);
  useEffect(()=>{if(!roomId)return;let active=true;setTurns([]);api(`chat?room=${roomId}&scope=${scope}`).then(r=>{if(active)setTurns(r.turns);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[roomId,scope]);
  useEffect(()=>{import("../../../rcv3/voice-control.mjs").then(()=>setVoiceLoaded(true)).catch(()=>setError("마이크 구성요소를 불러오지 못했습니다."));return()=>{audioRef.current?.pause();};},[]);
  useEffect(()=>{const el=voiceRef.current;if(!el||!roomId||!voiceLoaded)return;
    el.autoSubmit=true;el.transcribe=async(blob,{signal})=>{const form=new FormData();form.set("roomId",roomId);form.set("requestId",crypto.randomUUID());form.set("audio",blob,blob.type.includes("mp4")?"voice.mp4":"voice.webm");const r=await fetch("/api/rcv3/audio",{method:"POST",body:form,signal});const d=await r.json();if(!r.ok)throw new Error(d.error);return d.text;};
    const listener=(event:Event)=>transcriptHandler.current((event as CustomEvent).detail.text);const toggle=(event:Event)=>{continuousVoice.current=(event as CustomEvent).detail.enabled;if(!continuousVoice.current){audioRef.current?.pause();playbackDone.current?.();}};el.addEventListener("voice-toggle",toggle);el.addEventListener("transcript",listener);return()=>{el.removeEventListener("transcript",listener);el.removeEventListener("voice-toggle",toggle);};
  },[roomId,voiceLoaded,mounted]);
  useEffect(()=>{const hide=()=>{if(document.hidden){continuousVoice.current=false;voiceRef.current?.cancel();audioRef.current?.pause();playbackDone.current?.();}};document.addEventListener("visibilitychange",hide);return()=>{document.removeEventListener("visibilitychange",hide);hide();};},[]);
  async function checkConnection(){if(busyRef.current)return;busyRef.current=true;setBusy(true);setError("");try{const r=await api("check",{roomId,requestId:crypto.randomUUID()});setCheckResult(`AI ${(r.aiMs/1000).toFixed(2)}초 · 음성 응답·한국어 받아쓰기 확인`);}catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
  async function create(copy=false){if(busyRef.current)return;busyRef.current=true;setBusy(true);setError("");
    try{createId.current??=crypto.randomUUID();const name=copy?`${state?.name??"RCV3"} 복사`:"RCV3 · Room6";const r=await api("rooms",{requestId:createId.current,name,...(copy?{sourceRoom:roomId}:{})});createId.current=null;const list=await api("rooms");setRooms(list.rooms);await openRoom(r.roomId);}
    catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
  async function send(message=text,spoken=false){if(!message.trim()||busyRef.current||!state)return;busyRef.current=true;setBusy(true);setError("");const target=roomId;
    try{const t:Turn=await api("chat",{roomId:target,requestId:crypto.randomUUID(),scope,provider,prompt:message});if(roomRef.current!==target)return;setTurns(old=>[...old,t]);setText(current=>current===message?"":current);
      if(spoken){const r=await fetch("/api/rcv3/audio",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({roomId:target,requestId:crypto.randomUUID(),text:t.answer.slice(0,4000)}),signal:AbortSignal.timeout(35000)});if(!r.ok)throw new Error("글 답변은 저장됐지만 음성 재생을 준비하지 못했습니다.");const url=URL.createObjectURL(await r.blob());if(roomRef.current!==target){URL.revokeObjectURL(url);return;}const audio=new Audio(url);audioRef.current=audio;await new Promise<void>((resolve,reject)=>{const done=()=>{URL.revokeObjectURL(url);playbackDone.current=null;resolve();};playbackDone.current=done;audio.onended=done;audio.onerror=()=>{done();reject(new Error("음성을 재생하지 못했습니다."));};void audio.play().catch(reject);});if(continuousVoice.current&&roomRef.current===target&&!document.hidden)void voiceRef.current?.start();}
    }catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
  transcriptHandler.current=(message)=>{setText(message);void send(message,true);};
  function update(next:CloudState){setState(next);setDirty(true);}
  function editButton(patch:Partial<Button>){if(!state||!selected)return;update({...state,design:{...state.design,buttons:state.design.buttons.map(b=>b.id===selected?{...b,...patch}:b)}});}
  async function save(){if(!state||!saved.current||busyRef.current)return;busyRef.current=true;const target=roomId,token=generation.current;setBusy(true);setError("");try{const r=await api("state",{roomId,revision:saved.current.revision,state:{...state,revision:saved.current.revision+1}},"PUT");if(target!==roomRef.current||token!==generation.current)return;setState(r.state);saved.current=r.state;setDirty(false);setEditing(false);setSelected(null);}catch(e){setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
  function add(capability:Button["capability"]){if(!state)return;const id=crypto.randomUUID();update({...state,bindings:{...state.bindings,[id]:capability},design:{...state.design,buttons:[...state.design.buttons,{id,capability,label:capability==="secretary"?"Katie":capability==="files"?"파일":"AI 대화",x:5,y:5,width:20,height:12,opacity:1}]}});setSelected(id);}
  async function uploadImage(file?:File){if(!file||!state||busyRef.current)return;const target=roomId,token=generation.current;busyRef.current=true;setBusy(true);try{if(file.size>950000)throw new Error("배경 그림은 950KB 이하의 PNG·JPG·WebP를 선택하세요.");const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file);});const r=await api("asset",{roomId,image:{data}});if(target!==roomRef.current||token!==generation.current)return;setBackground(r.image.data);update({...state,design:{...state.design,backgroundAssetId:r.id}});}catch(e){if(token===generation.current)setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
  async function openFiles(){const token=generation.current;setShowFiles(true);try{const result=await api(`files?room=${roomId}`);if(token===generation.current)setFiles(result.files);}catch(e){if(token===generation.current)setError((e as Error).message);}}
  async function uploadFile(file?:File){if(!file||busyRef.current)return;const target=roomId,token=generation.current;busyRef.current=true;setBusy(true);try{if(file.size>100000||!/[.](txt|md|csv)$/i.test(file.name))throw new Error("100KB 이하 TXT·MD·CSV 파일을 선택하세요.");const value={id:crypto.randomUUID(),name:file.name,text:await file.text()};await api("files",{roomId,file:value});if(target===roomRef.current&&token===generation.current)setFiles(old=>[value,...old]);}catch(e){if(token===generation.current)setError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}}
  const button=state?.design.buttons.find(b=>b.id===selected);
  return <main className={styles.root}>
    <header className={styles.header}><a href="/rooms/rca">← RC</a><strong>RCV3 <span>Room6</span></strong><select aria-label="내 RCV3 방" value={roomId} disabled={busy||dirty} onChange={e=>void openRoom(e.target.value)}><option value="">내 방</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><button onClick={()=>void create()} disabled={busy||dirty}><Plus size={17}/>새 방</button>{state&&<button onClick={()=>void create(true)} disabled={busy||dirty}><Copy size={17}/>복사</button>}</header>
    {error&&<div className={styles.error} role="alert">{error}</div>}
    {!state?<section className={styles.empty}><h1>나만의 AI 업무 공간</h1><p>그림과 버튼은 자유롭게, 연결은 하나로.</p><button onClick={()=>void create()} disabled={busy||dirty}>{busy?"방을 준비하고 있습니다…":"RCV3 Room6 만들기"}</button></section>:<>
      <div className={styles.toolbar}><h1>{state.name}</h1><button disabled={busy} onClick={()=>void checkConnection()}>연결 확인</button><select aria-label="AI 선택" value={provider} disabled={busy} onChange={e=>setProvider(e.target.value as AIProviderId)}>{providers.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select><button disabled={busy} onClick={()=>setScope("chat")}>대화</button><button disabled={busy} onClick={()=>setScope("secretary")}>Katie</button><button onClick={()=>void openFiles()}><Folder size={17}/>파일</button><button disabled={busy} onClick={()=>setEditing(!editing)}><Settings2 size={17}/>꾸미기</button></div>
      {checkResult&&<p role="status">{checkResult}</p>}<section className={styles.canvas} aria-label="내 방 디자인" style={{backgroundImage:background?`url("${background}")`:undefined}}>
        {state.design.buttons.map(b=>{const appearance=state.appearances[b.id];return <button key={b.id} className={styles.tile} disabled={busy} style={{left:`${b.x}%`,top:`${b.y}%`,width:`${b.width}%`,height:`${b.height}%`,opacity:b.opacity,color:appearance?.color,backgroundColor:appearance?.background,borderColor:appearance?.borderColor,borderWidth:appearance?.borderWidth??0,borderRadius:appearance?.radius,fontSize:appearance?.fontSize,outline:selected===b.id?"2px solid #79edc7":undefined}} onClick={()=>{if(editing)setSelected(b.id);else if(b.capability==="files")void openFiles();else setScope(b.capability);}}>{b.label}</button>;})}
      </section>
      {editing&&<fieldset disabled={busy} className={styles.editor}><div className={styles.toolbar}><strong>툴 창고 · 버튼 꾸미기</strong><button onClick={()=>add("chat")}>대화 +</button><button onClick={()=>add("secretary")}>비서 +</button><button onClick={()=>add("files")}>파일 +</button><button onClick={()=>imageInput.current?.click()}><ImageIcon size={17}/>그림 붙이기</button><button onClick={()=>{setBackground("");update({...state,design:{...state.design,backgroundAssetId:null}});}}>그림 없음</button><button disabled={busy||!dirty} onClick={()=>void save()}>저장</button><button onClick={()=>{setState(saved.current);setDirty(false);setEditing(false);setSelected(null);void openRoom(roomId);}}>취소</button></div>
        <label>방 이름<input value={state.name} onChange={e=>update({...state,name:e.target.value})}/></label>
        {button?<div className={styles.fields}><label>버튼 글씨<input value={button.label} onChange={e=>editButton({label:e.target.value})}/></label>{([['x','가로 위치',0,100-button.width],['y','세로 위치',0,100-button.height],['width','너비',4,100-button.x],['height','높이',4,100-button.y],['opacity','투명도',0,1]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="range" min={min} max={max} step={key==="opacity"?.05:1} value={button[key]} onChange={e=>editButton({[key]:Number(e.target.value)})}/>{button[key]}</label>)}{([['color','글씨 색'],['background','배경 색'],['borderColor','테두리 색']] as const).map(([key,label])=><label key={key}>{label}<input type="color" value={state.appearances[button.id]?.[key]??(key==="color"?"#ffffff":"#172a41")} onChange={e=>update({...state,appearances:{...state.appearances,[button.id]:{...(state.appearances[button.id]??{color:"#ffffff",background:"#172a41",borderColor:"#64748b",borderWidth:0,radius:12,fontSize:16}),[key]:e.target.value}}})}/></label>)}<button onClick={()=>{update({...state,design:{...state.design,buttons:state.design.buttons.filter(b=>b.id!==button.id)}});setSelected(null);}}>버튼 제거</button></div>:<p>그림 위의 버튼을 선택하세요.</p>}
      </fieldset>}
      <section className={styles.chat} aria-label={scope==="secretary"?"Katie 비서 대화":"AI 대화"}><h2>{scope==="secretary"?"Katie · 개인 비서":"AI 대화"}</h2><div className={styles.messages} aria-live="polite">{turns.map(t=><div key={t.requestId}><p className={styles.user}>{t.prompt}</p><p className={styles.answer}>{t.answer}</p><small>{(t.durationMs/1000).toFixed(2)}초</small></div>)}{busy&&<p role="status">처리 중…</p>}</div><textarea aria-label="RCV3 메시지" value={text} onChange={e=>setText(e.target.value)} placeholder="무엇을 도와드릴까요?" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/><div className={styles.compose}>{voiceLoaded?createElement('rc-voice-control',{key:roomId,ref:(el:VoiceElement|null)=>{voiceRef.current=el;}}):<Mic/>}<button aria-label="메시지 보내기" className={styles.send} disabled={busy||!text.trim()} onClick={()=>void send()}><Send size={19}/></button></div></section>
      {showFiles&&<section className={styles.editor}><div className={styles.toolbar}><h2>내 파일</h2><button onClick={()=>fileInput.current?.click()}>텍스트 파일 추가</button><button aria-label="파일 닫기" onClick={()=>setShowFiles(false)}><X size={18}/></button></div>{files.map(f=><button key={f.id} onClick={()=>{setText(`다음 파일을 요약해주세요.\n파일: ${f.name}\n${f.text.slice(0,11000)}`);setShowFiles(false);}}>{f.name}</button>)}</section>}
      <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>void uploadImage(e.target.files?.[0])}/><input ref={fileInput} type="file" accept=".txt,.md,.csv" hidden onChange={e=>void uploadFile(e.target.files?.[0])}/>
    </>}
  </main>;
}
