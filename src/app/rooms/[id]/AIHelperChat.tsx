"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Bot, Mic, Send, X } from "lucide-react";

type Lang = "en" | "ko" | "zh" | "ja" | "es" | "fr" | "de" | "vi" | "th" | "id";
type Message = { role: "user" | "assistant"; content: string };
type HelperPosition = { left: number; top: number };

const COPY: Record<Lang, { button: string; title: string; greeting: string; placeholder: string; listening: string; error: string }> = {
  en: { button: "AI Help", title: "AI Help", greeting: "Hello. Ask me anything. I can help with Royal Command or any general question.", placeholder: "Ask anything…", listening: "Listening…", error: "AI Helper could not answer. Please try again." },
  ko: { button: "AI Help", title: "AI Help", greeting: "안녕하세요. 무엇이든 물어보세요. Royal Command 사용부터 일반 질문까지 도와드릴게요.", placeholder: "무엇이든 물어보세요…", listening: "듣고 있습니다…", error: "AI 도우미가 답변하지 못했습니다. 다시 시도해 주세요." },
  zh: { button: "AI Help", title: "AI Help", greeting: "您好。您可以问我任何问题。无论是 Royal Command 还是一般问题，我都可以帮助您。", placeholder: "请问任何问题…", listening: "正在聆听…", error: "AI 助手暂时无法回答，请再试一次。" },
  ja: { button: "AI Help", title: "AI Help", greeting: "こんにちは。何でも聞いてください。Royal Command の使い方から一般的な質問までお手伝いします。", placeholder: "何でも聞いてください…", listening: "聞いています…", error: "AI ヘルパーが回答できませんでした。もう一度お試しください。" },
  es: { button: "AI Help", title: "AI Help", greeting: "Hola. Pregúntame lo que quieras. Puedo ayudarte con Royal Command o con preguntas generales.", placeholder: "Pregunta lo que quieras…", listening: "Escuchando…", error: "El asistente de IA no pudo responder. Inténtalo de nuevo." },
  fr: { button: "AI Help", title: "AI Help", greeting: "Bonjour. Posez-moi n’importe quelle question. Je peux vous aider avec Royal Command ou des questions générales.", placeholder: "Posez votre question…", listening: "Écoute…", error: "L’assistant IA n’a pas pu répondre. Réessayez." },
  de: { button: "AI Help", title: "AI Help", greeting: "Hallo. Fragen Sie mich alles. Ich helfe bei Royal Command und bei allgemeinen Fragen.", placeholder: "Fragen Sie alles…", listening: "Ich höre zu…", error: "Der KI-Helfer konnte nicht antworten. Bitte versuchen Sie es erneut." },
  vi: { button: "AI Help", title: "AI Help", greeting: "Xin chào. Hãy hỏi tôi bất cứ điều gì. Tôi có thể hỗ trợ Royal Command và các câu hỏi chung.", placeholder: "Hỏi bất cứ điều gì…", listening: "Đang nghe…", error: "Trợ lý AI chưa thể trả lời. Vui lòng thử lại." },
  th: { button: "AI Help", title: "AI Help", greeting: "สวัสดี ถามฉันได้ทุกเรื่อง ฉันช่วยได้ทั้งการใช้ Royal Command และคำถามทั่วไป", placeholder: "ถามอะไรก็ได้…", listening: "กำลังฟัง…", error: "ผู้ช่วย AI ไม่สามารถตอบได้ กรุณาลองอีกครั้ง" },
  id: { button: "AI Help", title: "AI Help", greeting: "Halo. Tanyakan apa saja. Saya dapat membantu tentang Royal Command maupun pertanyaan umum.", placeholder: "Tanyakan apa saja…", listening: "Mendengarkan…", error: "AI Helper belum dapat menjawab. Silakan coba lagi." },
};

const LOCALE: Record<Lang, string> = {
  en: "en-AU", ko: "ko-KR", zh: "zh-CN", ja: "ja-JP", es: "es-ES", fr: "fr-FR", de: "de-DE", vi: "vi-VN", th: "th-TH", id: "id-ID",
};

function detectSelectedLanguage(): Lang {
  const selects = Array.from(document.querySelectorAll("select"));
  for (const select of selects) {
    const raw = `${select.value} ${select.options[select.selectedIndex]?.text || ""}`.toLowerCase();
    if (/\b(ko|kr|korean|한국|한국어)\b/.test(raw)) return "ko";
    if (/\b(zh|cn|chinese|中文|中国)\b/.test(raw)) return "zh";
    if (/\b(ja|jp|japanese|日本)\b/.test(raw)) return "ja";
    if (/\b(es|spanish|español)\b/.test(raw)) return "es";
    if (/\b(fr|french|français)\b/.test(raw)) return "fr";
    if (/\b(de|german|deutsch)\b/.test(raw)) return "de";
    if (/\b(vi|vietnamese|tiếng việt)\b/.test(raw)) return "vi";
    if (/\b(th|thai|ไทย)\b/.test(raw)) return "th";
    if (/\b(id|indonesian|bahasa indonesia)\b/.test(raw)) return "id";
    if (/\b(en|english|영어)\b/.test(raw)) return "en";
  }
  return "en";
}

function findMainSendButton() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('main button[type="submit"]'))
    .find((button) => button.textContent?.trim() === "Send") || null;
}

function speechLocale(text: string, fallback: Lang) {
  if (/[가-힣]/.test(text)) return "ko-KR";
  if (/[ぁ-んァ-ン]/.test(text)) return "ja-JP";
  if (/[一-龯]/.test(text)) return "zh-CN";
  return LOCALE[fallback];
}

function micText(lang: Lang, key: "checking" | "ready" | "listening" | "hearing" | "blocked" | "missing" | "busy" | "network" | "failed") {
  if (lang === "ko") {
    return {
      checking: "마이크 장치를 확인하고 있습니다…",
      ready: "마이크 준비됨",
      listening: "듣고 있습니다…",
      hearing: "말씀을 듣고 있습니다…",
      blocked: "마이크 권한이 차단되어 있습니다. 주소창 왼쪽 사이트 설정에서 마이크를 허용해 주세요.",
      missing: "Windows/Chrome에서 사용할 수 있는 입력 마이크를 찾지 못했습니다. USB 마이크나 마이크가 있는 헤드셋/이어폰을 연결해 주세요.",
      busy: "마이크는 있지만 Chrome이 사용할 수 없습니다. Windows 소리 > 입력에서 장치를 확인하고 다른 앱의 독점 사용을 종료해 주세요.",
      network: "Chrome 음성인식 서비스에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.",
      failed: "마이크 음성인식을 시작하지 못했습니다.",
    }[key];
  }
  return {
    checking: "Checking microphone…",
    ready: "Microphone ready",
    listening: "Listening…",
    hearing: "I can hear you…",
    blocked: "Microphone permission is blocked. Allow Microphone in the site controls beside the address bar.",
    missing: "No usable microphone input was found in Windows/Chrome. Connect a USB microphone or a headset/earphone with a microphone.",
    busy: "A microphone exists but Chrome cannot use it. Check Windows Sound > Input and close apps using it exclusively.",
    network: "Chrome speech recognition could not reach its service. Check the internet connection.",
    failed: "Speech recognition could not start.",
  }[key];
}

export default function AIHelperChat() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micStatus, setMicStatus] = useState("");
  const [micIssue, setMicIssue] = useState("");
  const [helperPosition, setHelperPosition] = useState<HelperPosition | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const helperButtonRef = useRef<HTMLButtonElement>(null);
  const recognitionRef = useRef<any>(null);
  const openRef = useRef(false);
  const micEnabledRef = useRef(false);
  const speakingRef = useRef(false);
  const loadingRef = useRef(false);
  const langRef = useRef<Lang>("en");
  const messagesRef = useRef<Message[]>([]);

  const copy = COPY[lang];
  const latestAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === "assistant")?.content || copy.greeting, [messages, copy.greeting]);
  const latestUser = useMemo(() => [...messages].reverse().find((message) => message.role === "user")?.content || "", [messages]);

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    const sync = () => setLang(detectSelectedLanguage());
    sync();
    document.addEventListener("change", sync, true);
    window.addEventListener("rc:language-change", sync as EventListener);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["value"] });
    return () => {
      document.removeEventListener("change", sync, true);
      window.removeEventListener("rc:language-change", sync as EventListener);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) closeHelper();
    };
    window.setTimeout(() => document.addEventListener("mousedown", close), 0);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open) return;
    let frame = 0;
    const syncPosition = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const sendButton = findMainSendButton();
        const helpButton = helperButtonRef.current;
        if (!sendButton || !helpButton) return;
        const sendRect = sendButton.getBoundingClientRect();
        const helpRect = helpButton.getBoundingClientRect();
        setHelperPosition({
          left: Math.max(8, sendRect.left - helpRect.width - 10),
          top: sendRect.top,
        });
      });
    };
    syncPosition();
    const timer = window.setInterval(syncPosition, 500);
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [open, lang]);

  useEffect(() => () => {
    micEnabledRef.current = false;
    stopRecognition();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function stopRecognition() {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    recognition.onend = null;
    recognition.onresult = null;
    recognition.onerror = null;
    try { recognition.abort(); } catch {}
    setListening(false);
  }

  async function prepareMicrophone() {
    setMicIssue("");
    setMicStatus(micText(langRef.current, "checking"));
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = micText(langRef.current, "missing");
      setMicIssue(message);
      setMicStatus("");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      stream.getTracks().forEach((track) => track.stop());
      setMicIssue("");
      setMicStatus(micText(langRef.current, "ready"));
      return true;
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      const key = name === "NotAllowedError" || name === "SecurityError"
        ? "blocked"
        : name === "NotFoundError"
          ? "missing"
          : name === "NotReadableError" || name === "AbortError"
            ? "busy"
            : "failed";
      const message = micText(langRef.current, key);
      setMicIssue(message);
      setMicStatus("");
      return false;
    }
  }

  function scheduleListening(delay = 300) {
    window.setTimeout(() => {
      if (openRef.current && micEnabledRef.current && !speakingRef.current && !loadingRef.current) startRecognition();
    }, delay);
  }

  function startRecognition() {
    if (!openRef.current || !micEnabledRef.current || speakingRef.current || loadingRef.current || recognitionRef.current) return;
    const w = window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      setMicIssue(micText(langRef.current, "failed"));
      setMicEnabled(false);
      micEnabledRef.current = false;
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = LOCALE[langRef.current];
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let gotResult = false;
    let blockingError = false;

    recognition.onstart = () => setMicStatus(micText(langRef.current, "checking"));
    recognition.onaudiostart = () => {
      setListening(true);
      setMicIssue("");
      setMicStatus(micText(langRef.current, "listening"));
    };
    recognition.onsoundstart = () => setMicStatus(micText(langRef.current, "listening"));
    recognition.onspeechstart = () => setMicStatus(micText(langRef.current, "hearing"));

    recognition.onerror = (event: any) => {
      const error = String(event?.error || "");
      setListening(false);
      recognitionRef.current = null;
      let message = "";
      if (error === "not-allowed" || error === "service-not-allowed") {
        message = micText(langRef.current, "blocked");
        blockingError = true;
      } else if (error === "audio-capture") {
        message = micText(langRef.current, "missing");
        blockingError = true;
      } else if (error === "network") {
        message = micText(langRef.current, "network");
      } else if (error !== "no-speech" && error !== "aborted") {
        message = micText(langRef.current, "failed");
      }
      if (message) setMicIssue(message);
      if (blockingError) {
        micEnabledRef.current = false;
        setMicEnabled(false);
        setMicStatus("");
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim();
      if (!transcript) return;
      gotResult = true;
      setInput(transcript);
      setMicStatus("");
      stopRecognition();
      void sendMessage(transcript);
    };

    recognition.onend = () => {
      setListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (!gotResult && !blockingError && openRef.current && micEnabledRef.current && !speakingRef.current && !loadingRef.current) {
        scheduleListening(500);
      }
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setMicIssue(micText(langRef.current, "failed"));
    }
  }

  function speak(text: string, resumeListening = true) {
    if (!("speechSynthesis" in window) || !text.trim()) {
      if (resumeListening) scheduleListening(100);
      return;
    }
    speakingRef.current = true;
    setSpeaking(true);
    stopRecognition();
    const speech = window.speechSynthesis;
    speech.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 3000));
    utterance.lang = speechLocale(text, langRef.current);
    utterance.onend = () => {
      speakingRef.current = false;
      setSpeaking(false);
      if (resumeListening && micEnabledRef.current) scheduleListening(250);
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setSpeaking(false);
      if (resumeListening && micEnabledRef.current) scheduleListening(250);
    };
    speech.speak(utterance);
  }

  function openHelper() {
    openRef.current = true;
    setOpen(true);
    setMicIssue("");
    setMicStatus("");
    micEnabledRef.current = false;
    setMicEnabled(false);

    // Greeting starts immediately. Microphone permission/device check runs from the same user click.
    speak(COPY[langRef.current].greeting, true);
    void prepareMicrophone().then((ok) => {
      if (!openRef.current || !ok) return;
      micEnabledRef.current = true;
      setMicEnabled(true);
      if (!speakingRef.current && !loadingRef.current) scheduleListening(150);
    });
  }

  function closeHelper() {
    openRef.current = false;
    micEnabledRef.current = false;
    setOpen(false);
    setMicEnabled(false);
    setMicStatus("");
    setMicIssue("");
    stopRecognition();
    speakingRef.current = false;
    setSpeaking(false);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function toggleMicrophone() {
    if (micEnabledRef.current) {
      micEnabledRef.current = false;
      setMicEnabled(false);
      setMicStatus("");
      stopRecognition();
      return;
    }
    void prepareMicrophone().then((ok) => {
      if (!ok || !openRef.current) return;
      micEnabledRef.current = true;
      setMicEnabled(true);
      if (!speakingRef.current && !loadingRef.current) startRecognition();
    });
  }

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || loadingRef.current) return;
    stopRecognition();
    const history = messagesRef.current.slice(-12);
    const nextUser: Message = { role: "user", content: message };
    messagesRef.current = [...messagesRef.current, nextUser];
    setMessages(messagesRef.current);
    setInput("");
    setMicStatus("");
    loadingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch("/api/ai/helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, message, selectedLanguage: langRef.current, history }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.answer) throw new Error(data?.error || "AI Helper failed");
      const answer = String(data.answer);
      const nextAssistant: Message = { role: "assistant", content: answer };
      messagesRef.current = [...messagesRef.current, nextAssistant];
      setMessages(messagesRef.current);
      loadingRef.current = false;
      setLoading(false);
      speak(answer, true);
    } catch {
      const errorText = COPY[langRef.current].error;
      const nextAssistant: Message = { role: "assistant", content: errorText };
      messagesRef.current = [...messagesRef.current, nextAssistant];
      setMessages(messagesRef.current);
      loadingRef.current = false;
      setLoading(false);
      speak(errorText, true);
    }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    await sendMessage(input);
  }

  const closedStyle = !open && helperPosition
    ? { left: `${helperPosition.left}px`, top: `${helperPosition.top}px` }
    : undefined;

  return (
    <div ref={panelRef} className={open ? "fixed bottom-[28px] right-[190px] z-[380] max-lg:right-4" : "fixed z-[380]"} style={closedStyle}>
      {open ? (
        <div className="relative flex h-[560px] w-[390px] max-w-[calc(100vw-24px)] flex-col overflow-hidden bg-[#07111f]/96 shadow-[0_18px_50px_rgba(0,0,0,.52)] backdrop-blur-md">
          <div className="absolute right-2 top-2 z-10 flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.18em] text-[#f3d36a]"><span className={`h-2 w-2 rounded-full ${speaking || listening ? "animate-pulse bg-emerald-400" : "bg-[#d7b64d]"}`} />LIVE</span>
            <button type="button" onClick={closeHelper} className="grid h-8 w-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" title="Close"><X size={17} /></button>
          </div>

          <div className="shrink-0 px-4 pt-3 text-center font-[Times_New_Roman] text-lg font-semibold text-[#f3d36a]">{copy.title}</div>

          <div className="relative mx-auto mt-1 h-[245px] w-[275px] shrink-0">
            <div className="absolute inset-x-8 bottom-2 h-20 rounded-full bg-[#d7b64d]/10 blur-2xl" />
            <img src="/ai-helper-woman.svg" alt="Royal Command AI Helper" className={`relative h-full w-full object-contain object-bottom transition-all duration-500 ${speaking ? "scale-[1.02] brightness-110" : "scale-100"}`} />
          </div>

          <div className="px-5">
            <div className="flex items-center gap-2 text-[#d7b64d]">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#d7b64d]/70 ${speaking ? "shadow-[0_0_16px_rgba(215,182,77,.6)]" : ""}`}><Mic size={15} /></span>
              <div className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden">
                {Array.from({ length: 24 }).map((_, index) => (
                  <span key={index} className={`w-[2px] rounded-full bg-[#d7b64d] ${speaking || listening ? "animate-pulse" : "opacity-45"}`} style={{ height: `${8 + ((index * 7) % 20)}px`, animationDelay: `${index * 45}ms` }} />
                ))}
              </div>
            </div>

            <div className="mt-1 min-h-[72px] whitespace-pre-wrap text-[13px] leading-5 text-white/92">{loading ? "…" : latestAssistant}</div>

            <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-[#d7b64d] to-transparent" />

            <div className="mb-1 flex items-center justify-between gap-2 text-[12px] font-semibold text-[#d7b64d]">
              <span>You</span>
              {micStatus ? <span className="font-normal text-emerald-300">{micStatus}</span> : null}
            </div>
            {micIssue ? <div className="mb-2 rounded-lg border border-amber-400/55 bg-amber-950/35 px-2 py-1.5 text-[11px] leading-4 text-amber-100">{micIssue}</div> : null}
            {latestUser ? <div className="mb-2 line-clamp-2 text-[12px] leading-4 text-white/65">{latestUser}</div> : null}

            <form onSubmit={send}>
              <div className="flex items-center gap-2 rounded-xl bg-black/25 px-2 py-1.5">
                <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} rows={1} placeholder={listening ? copy.listening : copy.placeholder} className="max-h-20 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-2 text-[13px] text-white outline-none placeholder:text-white/35" />
                <button type="button" onClick={toggleMicrophone} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${micEnabled ? "bg-emerald-500/20 text-emerald-300" : "text-[#d7b64d] hover:bg-white/5"}`} title={micEnabled ? "Microphone on — click to turn off" : "Microphone off — click to turn on"}><Mic size={17} /></button>
                <button type="submit" disabled={!input.trim() || loading} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#f6d56d] hover:bg-white/5 disabled:opacity-30" title="Send"><Send size={17} /></button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <button ref={helperButtonRef} type="button" onClick={openHelper} className="flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-[#d7b64d] bg-[#7A0C2E] px-4 text-[13px] font-semibold leading-none text-[#ffe18a] shadow-[0_6px_22px_rgba(0,0,0,.45)] hover:bg-[#94113a]" title={copy.title}>
          <Bot size={15} />{copy.button}
        </button>
      )}
    </div>
  );
}
