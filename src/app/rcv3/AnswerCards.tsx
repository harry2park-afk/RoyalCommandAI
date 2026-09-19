"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Square, ChevronDown, ChevronUp } from "lucide-react";
import type { Turn } from "@/lib/rcv3/execution";
import styles from "./room.module.css";

type Provider = { id: string; label: string; logo?: string };
export default function AnswerCards({ roomId, providers, turns, statuses, onRead }: {
  roomId: string; providers: Provider[]; turns: Turn[];
  statuses: Record<string, string>; onRead: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [notice, setNotice] = useState<Record<string, string>>({});
  const playback = useRef<{ controller: AbortController; audio?: HTMLAudioElement; url?: string; finish?: () => void } | null>(null);

  function stop() {
    const current = playback.current;
    playback.current = null;
    current?.controller.abort();
    current?.audio?.pause();
    current?.finish?.();
    if (current?.url) URL.revokeObjectURL(current.url);
  }
  useEffect(() => {
    const hide = () => { if (document.hidden) { stop(); setReading(null); } };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); stop(); };
  }, []);

  async function read(provider: Provider, answer: string) {
    const wasReading = reading === provider.id;
    stop(); setReading(null);
    if (wasReading) return;
    onRead();
    const current = { controller: new AbortController() } as NonNullable<typeof playback.current>;
    playback.current = current; setReading(provider.id);
    setNotice(old => ({ ...old, [provider.id]: "Preparing audio…" }));
    try {
      // Preserve the whole answer while respecting the existing speech endpoint limit.
      for (let offset = 0; offset < answer.length; offset += 3500) {
        const response = await fetch("/api/rcv3/audio", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, requestId: crypto.randomUUID(), text: answer.slice(offset, offset + 3500) }),
          signal: AbortSignal.any([current.controller.signal, AbortSignal.timeout(35000)]),
        });
        if (!response.ok) throw new Error("Audio could not be loaded. Please retry.");
        const blob = await response.blob();
        if (playback.current !== current) return;
        current.url = URL.createObjectURL(blob); current.audio = new Audio(current.url);
        await new Promise<void>((resolve, reject) => {
          current.finish = resolve;
          current.audio!.onended = () => resolve();
          current.audio!.onerror = () => reject(new Error("Audio playback failed. Please retry."));
          void current.audio!.play().then(() => {
            if (playback.current === current) setNotice(old => ({ ...old, [provider.id]: "Reading…" }));
          }).catch(reject);
        });
        if (playback.current !== current) return;
        URL.revokeObjectURL(current.url); current.url = undefined;
      }
    } catch (error) {
      if (playback.current === current) setNotice(old => ({ ...old, [provider.id]: (error as Error).message }));
    } finally {
      if (playback.current === current) { stop(); setReading(null); }
    }
  }

  return <div className={styles.answerGrid} style={{ gridTemplateColumns: `repeat(${Math.max(1, providers.length)}, minmax(0, 1fr))` }}>
    {providers.map(provider => {
      const history = turns.filter(turn => turn.provider === provider.id && turn.scope === "chat");
      const answer = history.at(-1)?.answer ?? "";
      const open = expanded === provider.id;
      return <article key={provider.id} className={`${styles.compactAnswer} ${open ? styles.expandedAnswer : ""}`} aria-label={`${provider.label} answers`} onClick={() => setExpanded(provider.id)}>
        <aside className={styles.answerRail}>
          {provider.logo ? <img src={provider.logo} alt={provider.label} width={24} height={24}/> : <span>{provider.label.slice(0, 2)}</span>}
          <button type="button" aria-label={reading === provider.id ? `Stop reading ${provider.label}` : `Read ${provider.label} answer`} aria-pressed={reading === provider.id} disabled={!answer.trim()} onClick={event => { event.stopPropagation(); void read(provider, answer); }}>{reading === provider.id ? <Square size={18}/> : <Volume2 size={18}/>}</button>
        </aside>
        <div className={styles.answerBody}>
          <button type="button" className={styles.answerHeading} aria-label={`${open ? "Collapse" : "Expand"} ${provider.label} answer`} aria-expanded={open} onClick={event => { event.stopPropagation(); setExpanded(open ? null : provider.id); }}><span>{provider.label}</span>{open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>
          <div className={styles.answerText} tabIndex={0} aria-label={`${provider.label} response text`}>
            {history.map(turn => <div key={turn.requestId}><p className={styles.user}>{turn.prompt}</p><p className={styles.answer}>{turn.answer}</p></div>)}
            {statuses[provider.id] && <p role="status">{statuses[provider.id]}</p>}
            {!history.length && !statuses[provider.id] && <p className={styles.answerEmpty}>Your answer appears here.</p>}
          </div>
          {notice[provider.id] && (reading === provider.id || /failed|retry/i.test(notice[provider.id])) && <small role="status">{notice[provider.id]}</small>}
        </div>
      </article>;
    })}
  </div>;
}
