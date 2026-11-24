"use client";

import { useEffect, useRef, useState, useImperativeHandle, type Ref } from "react";
import { Move, Volume2, VolumeX, ChevronDown, ChevronUp } from "lucide-react";
import type { Turn } from "@/lib/rcv3/execution";
import styles from "./room.module.css";

import { AnswerSpeaker, readSpeakerPreference, saveSpeakerPreference } from "@/lib/client/answer-speaker";
import { speakerNotice } from "@/lib/locale/speaker";

import CopyText from "@/components/rcv3-toolbox/CopyText";
import ToolButton from "@/components/rcv3-toolbox/ToolButton";
export type AnswerCardsHandle = {toggleLatest:()=>boolean};
type Provider = { id: string; label: string; logo?: string };
export default function AnswerCards({ ref, roomId, providers, turns, liveTurns, language, statuses, onRead, onReorder, reorderDisabled }: {
  ref?:Ref<AnswerCardsHandle>; roomId: string; providers: Provider[]; turns: Turn[]; liveTurns: Turn[]; language: string;
  statuses: Record<string, string>; onRead: () => void;
  onReorder: (id: string, target: string) => void; reorderDisabled: boolean;
}) {
  const dragId = useRef<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const armed = useRef<Record<string, boolean>>({});
  const [notice, setNotice] = useState<Record<string, string>>({});
  const player = useRef<AnswerSpeaker | null>(null);
  const seen = useRef(new Set<string>());
  const readCallback = useRef(onRead);
  useEffect(() => { readCallback.current = onRead; }, [onRead]);
  const preferenceKey = (id: string) => `rc:answer-speaker:${roomId}:${id}`;

  useEffect(() => {
    const instance = new AnswerSpeaker({
      load: async (job, text, signal) => {
        const response = await fetch("/api/rcv3/audio", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({roomId, requestId: crypto.randomUUID(), text}), signal,
        });
        if (!response.ok) throw new Error("ANSWER_SPEECH");
        return response.blob();
      },
      status: (id, status) => setNotice(old => ({...old, [id]: status})),
    });
    player.current = instance;
    const hide = () => { if (document.hidden) instance.stop(); };
    document.addEventListener("visibilitychange", hide);
    const pause = () => instance.stop();
    window.addEventListener("rc:pause-answer-audio", pause);
    window.addEventListener("royalcommand:language-change", pause);
    window.addEventListener("royalcommand:language-saved", pause);
    return () => { document.removeEventListener("visibilitychange", hide); window.removeEventListener("rc:pause-answer-audio", pause); window.removeEventListener("royalcommand:language-change", pause); window.removeEventListener("royalcommand:language-saved", pause); instance.stop(); player.current = null; };
  }, [roomId]);
  const providerKey = providers.map(provider => provider.id).join(",");
  useEffect(() => {
    const next = Object.fromEntries(providerKey.split(",").filter(Boolean).map(id => [id, armed.current[id] ?? readSpeakerPreference(`rc:answer-speaker:${roomId}:${id}`)]));
    for (const id of Object.keys(armed.current)) if (!(id in next)) player.current?.stop(id);
    armed.current = next; setEnabled(next);
  }, [providerKey, roomId]);
  useEffect(() => {
    for (const turn of liveTurns) {
      if (seen.current.has(turn.requestId)) continue;
      seen.current.add(turn.requestId);
      if (armed.current[turn.provider] && !document.hidden) {
        readCallback.current();
        player.current?.enqueue({id: turn.provider, text: turn.answer});
      }
    }
  }, [liveTurns]);
  function read(id: string, answer: string) {
    if (!answer.trim()) return;
    readCallback.current();
    player.current?.stop(id);
    player.current?.enqueue({id, text: answer});
  }
  function toggle(provider: Provider, answer: string) {
    const next = !armed.current[provider.id];
    armed.current = {...armed.current, [provider.id]: next};
    setEnabled(armed.current); saveSpeakerPreference(preferenceKey(provider.id), next);
    setNotice(old => ({...old, [provider.id]: ""}));
    if (next) { player.current?.prime(); read(provider.id, answer); }
    else player.current?.stop(provider.id);
  }

  useImperativeHandle(ref,()=>({toggleLatest:()=>{
    const turn=[...turns].reverse().find(turn=>turn.scope==="chat"&&providers.some(provider=>provider.id===turn.provider));
    const provider=providers.find(provider=>provider.id===turn?.provider);
    if(!turn||!provider)return false;toggle(provider,turn.answer);return true;
  }}));
  return <div className={styles.answerGrid} style={{ gridTemplateColumns: `repeat(${Math.max(1, providers.length)}, minmax(0, 1fr))` }}>
    {providers.map(provider => {
      const history = turns.filter(turn => turn.provider === provider.id && turn.scope === "chat");
      const answer = history.at(-1)?.answer ?? "";
      const open = expanded === provider.id;
      return <article data-answer-provider={provider.id} style={{opacity:moving===provider.id?.6:1}} key={provider.id} className={`${styles.compactAnswer} ${open ? styles.expandedAnswer : ""}`} aria-label={`${provider.label} answers`} onClick={() => setExpanded(provider.id)}>
        <aside className={styles.answerRail}>
          <button type="button" className={styles.answerMove} aria-label={`Move ${provider.label} answer`} title="Drag left or right to reorder" disabled={reorderDisabled}
            onClick={event=>event.stopPropagation()}
            onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);dragId.current=provider.id;setMoving(provider.id);}}
            onPointerUp={event=>{event.stopPropagation();const id=dragId.current;dragId.current=null;setMoving(null);const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>("[data-answer-provider]")?.dataset.answerProvider;if(id&&target&&id!==target)onReorder(id,target);}}
            onPointerCancel={()=>{dragId.current=null;setMoving(null);}}
            onLostPointerCapture={()=>{dragId.current=null;setMoving(null);}}
            onKeyDown={event=>{if(!["ArrowLeft","ArrowRight"].includes(event.key))return;event.preventDefault();event.stopPropagation();const index=providers.findIndex(p=>p.id===provider.id);const target=providers[index+(event.key==="ArrowLeft"?-1:1)];if(target)onReorder(provider.id,target.id);}}><Move size={18}/></button>
          {provider.logo ? <img src={provider.logo} alt={provider.label} width={24} height={24}/> : <span>{provider.label.slice(0, 2)}</span>}
          <ToolButton toolId="speaker" title={enabled[provider.id] ? "Speaker on" : "Speaker off"} aria-label={`${provider.label} speaker ${enabled[provider.id] ? "on" : "off"}`} aria-pressed={Boolean(enabled[provider.id])} onClick={event => { event.stopPropagation(); toggle(provider, answer); }}>{enabled[provider.id] ? <Volume2 size={18}/> : <VolumeX size={18}/>}</ToolButton>
        </aside>
        <div className={styles.answerBody}>
          <button type="button" className={styles.answerHeading} aria-label={`${open ? "Collapse" : "Expand"} ${provider.label} answer`} aria-expanded={open} onClick={event => { event.stopPropagation(); setExpanded(open ? null : provider.id); }}><span>{provider.label}</span>{open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>
          <div className={styles.answerText} tabIndex={0} aria-label={`${provider.label} response text`}>
            {history.map(turn => <div key={turn.requestId}><p className={styles.user}>{turn.prompt}</p><p className={styles.answer}>{turn.answer}</p></div>)}
            {statuses[provider.id] && <p role="status">{statuses[provider.id]}</p>}
          </div>
          <CopyText text={answer}/>
          {notice[provider.id] && notice[provider.id] !== "idle" && <small role="status">{speakerNotice(notice[provider.id], language)}{notice[provider.id] === "error" && enabled[provider.id] && <button type="button" onClick={event => {event.stopPropagation(); player.current?.prime(); read(provider.id, answer);}}>Retry audio</button>}</small>}
        </div>
      </article>;
    })}
  </div>;
}
