"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Bot, Mic, Send, X } from "lucide-react";

type Lang = "en" | "ko" | "zh" | "ja" | "es" | "fr" | "de" | "vi" | "th" | "id";
type Message = { role: "user" | "assistant"; content: string };

const COPY: Record<Lang, { button: string; title: string; greeting: string; placeholder: string; listening: string; error: string }> = {
  en: { button: "AI Help", title: "Royal Command AI Helper", greeting: "Hello. Ask me anything. I can help with Royal Command or any general question.", placeholder: "Ask anything…", listening: "Listening…", error: "AI Helper could not answer. Please try again." },
  ko: { button: "AI Help", title: "Royal Command AI Helper", greeting: "안녕하세요. 무엇이든 물어보세요. Royal Command 사용법부터 일반 질문까지 도와드릴게요.", placeholder: "무엇이든 물어보세요…", listening: "듣고 있습니다…", error: "AI 도우미가 답변하지 못했습니다. 다시 시도해 주세요." },
  zh: { button: "AI Help", title: "Royal Command AI Helper", greeting: "您好。您可以问我任何问题。无论是 Royal Command 还是一般问题，我都可以帮助您。", placeholder: "请问任何问题…", listening: "正在聆听…", error: "AI 助手暂时无法回答，请再试一次。" },
  ja: { button: "AI Help", title: "Royal Command AI Helper", greeting: "こんにちは。何でも聞いてください。Royal Command の使い方から一般的な質問までお手伝いします。", placeholder: "何でも聞いてください…", listening: "聞いています…", error: "AI ヘルパーが回答できませんでした。もう一度お試しください。" },
  es: { button: "AI Help", title: "Royal Command AI Helper", greeting: "Hola. Pregúntame lo que quieras. Puedo ayudarte con Royal Command o con preguntas generales.", placeholder: "Pregunta lo que quieras…", listening: "Escuchando…", error: "El asistente de IA no pudo responder. Inténtalo de nuevo." },
  fr: { button: "AI Help", title: "Royal Command AI Helper", greeting: "Bonjour. Posez-moi n’importe quelle question. Je peux vous aider avec Royal Command ou des questions générales.", placeholder: "Posez votre question…", listening: "Écoute…", error: "L’assistant IA n’a pas pu répondre. Réessayez." },
  de: { button: "AI Help", title: "Royal Command AI Helper", greeting: "Hallo. Fragen Sie mich alles. Ich helfe bei Royal Command und bei allgemeinen Fragen.", placeholder: "Fragen Sie alles…", listening: "Ich höre zu…", error: "Der KI-Helfer konnte nicht antworten. Bitte versuchen Sie es erneut." },
  vi: { button: "AI Help", title: "Royal Command AI Helper", greeting: "Xin chào. Hãy hỏi tôi bất cứ điều gì. Tôi có thể hỗ trợ Royal Command và các câu hỏi chung.", placeholder: "Hỏi bất cứ điều gì…", listening: "Đang nghe…", error: "Trợ lý AI chưa thể trả lời. Vui lòng thử lại." },
  th: { button: "AI Help", title: "Royal Command AI Helper", greeting: "สวัสดี ถามฉันได้ทุกเรื่อง ฉันช่วยได้ทั้งการใช้ Royal Command และคำถามทั่วไป", placeholder: "ถามอะไรก็ได้…", listening: "กำลังฟัง…", error: "ผู้ช่วย AI ไม่สามารถตอบได้ กรุณาลองอีกครั้ง" },
  id: { button: "AI Help", title: "Royal Command AI Helper", greeting: "Halo. Tanyakan apa saja. Saya dapat membantu tentang Royal Command maupun pertanyaan umum.", placeholder: "Tanyakan apa saja…", listening: "Mendengarkan…", error: "AI Helper belum dapat menjawab. Silakan coba lagi." },
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

export default function AIHelperChat() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const copy = COPY[lang];
  const visibleMessages = useMemo(() => messages.length ? messages : [{ role: "assistant" as const, content: copy.greeting }], [messages, copy.greeting]);

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [visibleMessages, loading]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.setTimeout(() => document.addEventListener("mousedown", close), 0);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const message = input.trim();
    if (!message || loading) return;
    const history = messages.slice(-12);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/ai/helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, message, selectedLanguage: lang, history }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.answer) throw new Error(data?.error || "AI Helper failed");
      setMessages((prev) => [...prev, { role: "assistant", content: String(data.answer) }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: copy.error }]);
    } finally {
      setLoading(false);
    }
  }

  function startVoice() {
    const w = window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    // Selected language is only a recognition hint. The AI response language follows the actual transcript language.
    recognition.lang = LOCALE[lang];
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) setInput(transcript);
    };
    recognition.start();
  }

  return (
    <div ref={panelRef} className="fixed bottom-4 right-[190px] z-[380] max-lg:right-4">
      {open ? (
        <div className="flex h-[470px] w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-[#d7b64d]/55 bg-[#07111f]/98 shadow-2xl backdrop-blur">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#d7b64d]/25 bg-[#102030] px-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#f3d36a]"><Bot size={18} />{copy.title}</div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" title="Close"><X size={17} /></button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-[13px] leading-5">
            {visibleMessages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-8 rounded-xl bg-[#17375e] px-3 py-2 text-white" : "mr-5 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-white/90"}>
                {message.content}
              </div>
            ))}
            {loading ? <div className="mr-5 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-white/60">…</div> : null}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className="shrink-0 border-t border-white/10 p-2.5">
            <div className="flex items-end gap-2 rounded-xl border border-[#d7b64d]/35 bg-black/25 p-2">
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} rows={2} placeholder={listening ? copy.listening : copy.placeholder} className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent text-[13px] text-white outline-none placeholder:text-white/35" />
              <button type="button" onClick={startVoice} className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${listening ? "border-emerald-400 text-emerald-300" : "border-white/15 text-white/65"}`} title="Voice"><Mic size={17} /></button>
              <button type="submit" disabled={!input.trim() || loading} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d7b64d]/60 bg-[#7A0C2E] text-[#f6d56d] disabled:opacity-35" title="Send"><Send size={16} /></button>
            </div>
          </form>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex h-[30px] items-center gap-2 rounded-full border border-[#d7b64d] bg-[#7A0C2E] px-4 text-[13px] font-semibold text-[#ffe18a] shadow-[0_6px_22px_rgba(0,0,0,.45)] hover:bg-[#94113a]" title={copy.title}><Bot size={15} />{copy.button}</button>
      )}
    </div>
  );
}
