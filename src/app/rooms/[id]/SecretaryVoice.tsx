"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

// No microphone or autoplay on mount. Each session is explicitly started by its owner.
export default function SecretaryVoice({ onMessage, busy, onActiveChange }: {
  onMessage: (text: string) => Promise<string>;
  busy: boolean;
  onActiveChange: (active: boolean) => void;
}) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("");
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("ko-KR");
  const session = useRef(0);
  const recognition = useRef<Recognition | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  function release() {
    session.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const current = recognition.current;
    recognition.current = null;
    if (current) {
      current.onstart = current.onresult = current.onerror = current.onend = null;
      current.abort();
    }
    if (utterance.current) {
      utterance.current.onend = utterance.current.onerror = null;
      utterance.current = null;
      window.speechSynthesis.cancel();
    }
  }

  function stop(message = "음성 대화를 종료했습니다.") {
    release();
    onActiveChange(false);
    if (alive.current) { setActive(false); setStatus(message); }
  }

  useEffect(() => {
    alive.current = true;
    const hide = () => { if (document.hidden) stop("화면을 벗어나 음성 대화를 종료했습니다."); };
    document.addEventListener("visibilitychange", hide);
    return () => {
      alive.current = false;
      release();
      onActiveChange(false);
      document.removeEventListener("visibilitychange", hide);
    };
    // Session resources belong to this mounted Room conversation only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start() {
    const w = window as SpeechWindow;
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor || !("speechSynthesis" in window)) {
      setStatus("이 브라우저는 음성 대화를 지원하지 않습니다. Chrome에서 열어 주세요.");
      return;
    }
    release();
    const id = session.current;
    const valid = () => alive.current && id === session.current;
    setActive(true);
    onActiveChange(true);
    setTranscript("");
    let emptyTurns = 0;

    function listen() {
      if (!valid()) return;
      setStatus("마이크 연결 중…");
      const mic = new Constructor!();
      recognition.current = mic;
      mic.lang = language;
      mic.continuous = false;
      mic.interimResults = true;
      let finalText = "";
      mic.onstart = () => { if (valid()) setStatus("듣고 있습니다. 말씀하세요."); };
      mic.onresult = (event) => {
        if (!valid()) return;
        const results = Array.from(event.results);
        setTranscript(results.map((item) => item[0].transcript).join(" "));
        finalText = results.filter((item) => item.isFinal).map((item) => item[0].transcript).join(" ").trim();
      };
      mic.onerror = (event) => {
        if (!valid() || event.error === "no-speech") return;
        stop(event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "마이크 사용을 허용한 뒤 음성 대화를 다시 시작해 주세요."
          : "음성 연결에 실패했습니다. 연결과 마이크를 확인한 뒤 다시 시작해 주세요.");
      };
      mic.onend = () => {
        if (!valid() || recognition.current !== mic) return;
        recognition.current = null;
        if (!finalText) {
          if (++emptyTurns >= 3) { stop("말소리가 없어 음성 대화를 종료했습니다."); return; }
          timer.current = setTimeout(listen, 500);
          return;
        }
        emptyTurns = 0;
        if (/^(대화\s*종료|음성\s*(대화\s*)?(종료|중지)|stop( voice)?( conversation)?|end conversation)[.!?。\s]*$/i.test(finalText)) {
          stop(); return;
        }
        setStatus("Katie가 답변을 준비하고 있습니다…");
        void onMessage(finalText).then((answer) => {
          if (!valid()) return;
          if (!answer.trim()) { stop("답변을 받지 못했습니다. 다시 시도해 주세요."); return; }
          // Recognition has ended before playback, preventing Katie from transcribing herself.
          const speech = new SpeechSynthesisUtterance(answer);
          utterance.current = speech;
          speech.lang = /[가-힣]/.test(answer) ? "ko-KR" : language;
          speech.onend = () => {
            if (!valid()) return;
            utterance.current = null;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(listen, 350);
          };
          speech.onerror = () => { if (valid()) stop("음성 재생에 실패했습니다. 화면의 답변을 확인해 주세요."); };
          setStatus("Katie가 답변하고 있습니다…");
          timer.current = setTimeout(() => { if (valid()) stop("음성 응답 시간이 초과되었습니다. 화면의 답변을 확인해 주세요."); }, 120000);
          window.speechSynthesis.speak(speech);
        }).catch(() => { if (valid()) stop("요청에 실패했습니다. 다시 시도해 주세요."); });
      };
      try { mic.start(); } catch { stop("마이크를 시작하지 못했습니다. 다시 시도해 주세요."); }
    }
    listen();
  }

  return <div className="mt-3 space-y-2 rounded-xl border border-[#d7b64d]/40 bg-white/5 p-3">
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" aria-pressed={active} disabled={!active && busy} onClick={() => active ? stop() : start()}
        className="flex min-h-12 items-center gap-2 rounded-xl bg-[#7A0C2E] px-4 text-base font-semibold text-[#ffe18a] disabled:opacity-40">
        {active ? <MicOff size={22}/> : <Mic size={22}/>} {active ? "음성 대화 종료" : "음성 대화 시작"}
      </button>
      <select aria-label="음성 입력 언어" value={language} disabled={active} onChange={(event) => setLanguage(event.target.value)} className="min-h-12 rounded-lg border border-white/20 bg-[#07111f] px-3 text-base">
        <option value="ko-KR">한국어</option><option value="en-AU">English (AU)</option>
      </select>
    </div>
    <p role="status" className="text-sm text-[#f0d36a]">{status || "시작 후 말하면 자동 전송하고 음성으로 답합니다. ‘대화 종료’로 멈추세요."}</p>
    {transcript ? <p className="text-sm text-white/80">{transcript}</p> : null}
    {!active ? <p className="text-xs text-white/50">기기 음성으로 답합니다. 음성 인식은 브라우저 제공 서비스를 사용할 수 있습니다.</p> : null}
  </div>;
}
