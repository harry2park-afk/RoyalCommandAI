"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { SecretaryVoiceSession } from "@/lib/ai-secretary/voice-session";

export default function SecretaryVoice({ onMessage, busy, onActiveChange }: {
  onMessage: (text: string) => Promise<string>;
  busy: boolean;
  onActiveChange: (active: boolean) => void;
}) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("");
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState<"ko-KR" | "en-AU">("ko-KR");
  const session = useRef<SecretaryVoiceSession | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const hide = () => { if (document.hidden) session.current?.stop("화면을 벗어나 음성 대화를 종료했습니다."); };
    document.addEventListener("visibilitychange", hide);
    return () => {
      alive.current = false;
      session.current?.stop();
      onActiveChange(false);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [onActiveChange]);

  function start() {
    if (session.current || busy) return;
    setActive(true);
    onActiveChange(true);
    setTranscript("");
    session.current = new SecretaryVoiceSession({
      language, onMessage,
      onTranscript: text => { if (alive.current) setTranscript(text); },
      onStatus: text => { if (alive.current) setStatus(text); },
      onStop: text => {
        session.current = null;
        if (alive.current) { setActive(false); setStatus(text); onActiveChange(false); }
      },
    });
    void session.current.start();
  }

  return <div className="mt-3 space-y-2 rounded-xl border border-[#d7b64d]/40 bg-white/5 p-3">
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" aria-pressed={active} disabled={!active && busy} onClick={() => active ? session.current?.stop() : start()}
        className="flex min-h-12 items-center gap-2 rounded-xl bg-[#7A0C2E] px-4 text-base font-semibold text-[#ffe18a] disabled:opacity-40">
        {active ? <MicOff size={22}/> : <Mic size={22}/>} {active ? "음성 대화 종료" : "음성 대화 시작"}
      </button>
      <select aria-label="음성 입력 언어" value={language} disabled={active} onChange={(event) => setLanguage(event.target.value as "ko-KR" | "en-AU")} className="min-h-12 rounded-lg border border-white/20 bg-[#07111f] px-3 text-base">
        <option value="ko-KR">한국어</option><option value="en-AU">English (AU)</option>
      </select>
    </div>
    <p role="status" className="text-sm text-[#f0d36a]">{status || "시작 후 말하면 자동 전송하고 음성으로 답합니다. ‘대화 종료’로 멈추세요."}</p>
    {transcript ? <p className="text-sm text-white/80">{transcript}</p> : null}
    {!active ? <p className="text-xs text-white/50">말씀을 잠시 녹음해 서버에서 받아씁니다. 한국어 선택 시 한국어로 인식하며, 기기 음성으로 답합니다.</p> : null}
  </div>;
}
