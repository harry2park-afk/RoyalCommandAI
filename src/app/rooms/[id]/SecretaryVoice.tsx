"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { resolveGlobalLocale } from "@/lib/locale/globalLocaleCore";
import { RealtimeSecretaryVoiceSession as SecretaryVoiceSession } from "@/lib/ai-secretary/realtime-voice-session";

export default function SecretaryVoice({ onMessage, busy, onActiveChange, onTranscript, initialText }: {
  onMessage: (text: string) => Promise<string>;
  busy: boolean;
  initialText: string;
  onTranscript: (text: string) => void;
  onActiveChange: (active: boolean) => void;
}) {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("");
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

  useEffect(() => {
    let mounted = true;
    let saved = "";
    try { saved = localStorage.getItem("royalcommand:ui-locale") || ""; } catch {}
    const fallback = resolveGlobalLocale({ explicitUiLocale: saved || navigator.language }).locale;
    void fetch("/api/user/preferences", { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(5000) })
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        const prefs = payload?.preferences;
        const locale = prefs && (prefs.uiLocale || prefs.language)
          ? resolveGlobalLocale({ explicitUiLocale: prefs.uiLocale, legacyLanguage: prefs.language, countryCode: prefs.countryCode }).locale
          : fallback;
        if (mounted) setLanguage(locale);
      })
      .catch(() => { if (mounted) setLanguage(fallback); });
    return () => { mounted = false; };
  }, []);

  function start() {
    if (session.current || busy || !language) return;
    setActive(true);
    onActiveChange(true);
    setError("");
    let prefix = initialText.trim();
    const combined = (text: string) => [prefix, text].filter(Boolean).join(" ");
    session.current = new SecretaryVoiceSession({
      language, onMessage: text => {
        const message = combined(text);
        prefix = "";
        return onMessage(message);
      },
      onPhase: value => { if (alive.current) setPhase(value); },
      onLevel: value => { if (alive.current) setLevel(value); },
      onTranscript: text => { if (alive.current) onTranscript(combined(text)); },
      onStatus: text => { if (alive.current) setStatus(text); },
      onStop: text => {
        session.current = null;
        if (alive.current) { setActive(false); setPhase("idle"); setLevel(0); setStatus(text); setError(text === "음성 대화를 종료했습니다." || text.startsWith("화면을 벗어나") ? "" : text); onActiveChange(false); }
      },
    });
    void session.current.start();
  }

  return <>
    <button type="button" aria-label={active ? "음성 대화 종료" : "음성 대화 시작"}
      title={active ? status : "음성 대화 시작"} aria-pressed={active}
      disabled={!active && (busy || !language)} onClick={() => active ? session.current?.stop() : start()}
      data-voice-phase={phase}
      style={active && phase === "listening" ? { boxShadow: `0 0 0 ${2 + level * 9}px rgba(52, 211, 153, ${0.15 + level * 0.35})` } : undefined}
      className={`grid h-12 w-12 place-items-center rounded-full transition-colors disabled:opacity-40 ${active ? (phase === "listening" ? "bg-emerald-950 text-emerald-300 ring-2 ring-emerald-400" : "bg-[#7A0C2E] text-[#ffe18a] animate-pulse") : "text-[#f0d36a] hover:bg-white/10"}`}>
      <Mic size={24}/>
    </button>
    <span role="status" className="sr-only">{status}</span>
    {error ? <p role="alert" className="absolute bottom-full left-0 mb-2 w-72 rounded-lg bg-[#07111f] p-2 text-sm text-red-200">{error}</p> : null}
  </>;
}
