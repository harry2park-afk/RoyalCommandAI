"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { resolveGlobalLocale } from "@/lib/locale/globalLocaleCore";
import { SecretaryVoiceSession } from "@/lib/ai-secretary/voice-session";

export default function SecretaryVoice({ onMessage, busy, onActiveChange }: {
  onMessage: (text: string) => Promise<string>;
  busy: boolean;
  onActiveChange: (active: boolean) => void;
}) {
  const [active, setActive] = useState(false);
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
    session.current = new SecretaryVoiceSession({
      language, onMessage,
      onTranscript: () => {},
      onStatus: text => { if (alive.current) setStatus(text); },
      onStop: text => {
        session.current = null;
        if (alive.current) { setActive(false); setStatus(text); setError(text === "음성 대화를 종료했습니다." || text.startsWith("화면을 벗어나") ? "" : text); onActiveChange(false); }
      },
    });
    void session.current.start();
  }

  return <>
    <button type="button" aria-label={active ? "음성 대화 종료" : "음성 대화 시작"}
      title={active ? status : "음성 대화 시작"} aria-pressed={active}
      disabled={!active && (busy || !language)} onClick={() => active ? session.current?.stop() : start()}
      className={`grid h-12 w-12 place-items-center rounded-full transition-colors disabled:opacity-40 ${active ? "bg-[#7A0C2E] text-[#ffe18a] ring-2 ring-[#d7b64d]" : "text-[#f0d36a] hover:bg-white/10"}`}>
      {active ? <MicOff size={24}/> : <Mic size={24}/>}
    </button>
    <span role="status" className="sr-only">{status}</span>
    {error ? <p role="alert" className="absolute bottom-full left-0 mb-2 w-72 rounded-lg bg-[#07111f] p-2 text-sm text-red-200">{error}</p> : null}
  </>;
}
