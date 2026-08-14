"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Bot, Mic, Paperclip, Send, Volume2, VolumeX } from "lucide-react";

type Message = {
  id: string;
  content: string;
  authorType?: string;
  author_type?: string;
};

type ProviderInfo = {
  id: string;
  name: string;
  available: boolean;
  configured: boolean;
};

type ChatResult = {
  finalAnswer: string;
  responses?: Array<{ provider: string; content: string; latencyMs: number; error?: string }>;
  userMessage?: Message | null;
  aiMessage?: Message | null;
  comparison?: { winners?: string[]; notes?: string[]; providerScores?: Record<string, number> };
};

const CORE_AI = [
  "openai",
  "anthropic",
  "google",
  "xai",
  "deepseek",
  "perplexity",
  "mistral",
  "meta",
  "qwen",
  "cohere",
  "copilot",
  "amazon",
  "nvidia",
  "yi",
  "minimax",
  "moonshot",
];

const LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  xai: "Grok",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
  mistral: "Mistral",
  meta: "Llama",
  qwen: "Qwen",
  cohere: "Cohere",
  copilot: "Copilot",
  amazon: "Nova",
  nvidia: "NVIDIA",
  yi: "Yi",
  minimax: "MiniMax",
  moonshot: "Kimi",
};

const AI_LOGOS: Record<string, string> = {
  openai: "https://cdn.simpleicons.org/openai/FFFFFF",
  anthropic: "https://cdn.simpleicons.org/anthropic/FFFFFF",
  google: "https://cdn.simpleicons.org/googlegemini/FFFFFF",
  xai: "https://cdn.simpleicons.org/x/FFFFFF",
  deepseek: "https://cdn.simpleicons.org/deepseek/FFFFFF",
  perplexity: "https://cdn.simpleicons.org/perplexity/FFFFFF",
  mistral: "https://cdn.simpleicons.org/mistralai/FFFFFF",
  meta: "https://cdn.simpleicons.org/meta/FFFFFF",
  qwen: "https://cdn.simpleicons.org/alibabacloud/FFFFFF",
  cohere: "https://cdn.simpleicons.org/cohere/FFFFFF",
  copilot: "https://cdn.simpleicons.org/githubcopilot/FFFFFF",
  amazon: "https://cdn.simpleicons.org/amazonwebservices/FFFFFF",
  nvidia: "https://cdn.simpleicons.org/nvidia/FFFFFF",
  yi: "https://cdn.simpleicons.org/01/FFFFFF",
  minimax: "https://cdn.simpleicons.org/minimax/FFFFFF",
  moonshot: "https://cdn.simpleicons.org/moonshot/FFFFFF",
};

export default function RoomV3() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("ko");
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastResult, setLastResult] = useState<ChatResult | null>(null);
  const [expandedUserMessage, setExpandedUserMessage] = useState<Message | null>(null);
  const selectionReady = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);

  const history = useMemo(
    () => messages
      .filter((m) => (m.authorType || m.author_type) !== "system")
      .slice(-12)
      .map((m) => ({
        role: (m.authorType || m.author_type) === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
    [messages],
  );

  async function loadRoom() {
    const res = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) setMessages(data.messages || []);
  }

  async function loadProviders() {
    const res = await fetch("/api/ai/providers", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return;
    const next: ProviderInfo[] = data.connectors || [];
    setProviders(next);
    if (!selectionReady.current) {
      const available = CORE_AI.filter((id) => next.some((p) => p.id === id && p.available));
      const storageKey = `royalcommand:room:${roomId}:selected-ai`;
      let initial = available;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "[]") as string[];
        const valid = saved.filter((id) => available.includes(id));
        if (saved.length && valid.length) initial = valid;
      } catch {}
      setSelected(initial);
      selectionReady.current = true;
    }
  }

  useEffect(() => {
    void Promise.all([loadRoom(), loadProviders()]).catch(() => setError("Room could not be loaded."));
  }, [roomId]);

  useEffect(() => {
    if (!selectionReady.current) return;
    localStorage.setItem(`royalcommand:room:${roomId}:selected-ai`, JSON.stringify(selected));
  }, [roomId, selected]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function isAvailable(id: string) {
    return providers.some((p) => p.id === id && p.available);
  }

  function toggleProvider(id: string) {
    if (!isAvailable(id)) {
      setError(`${LABELS[id] || id} is not connected.`);
      return;
    }
    setError("");
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleMic() {
    setError("");
    const w = window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setError("Voice input is not supported in this browser."); return; }
    const recognition = new SR();
    recognition.lang = language === "ko" ? "ko-KR" : "en-AU";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setError("Microphone could not start."); };
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setPrompt((p) => (p ? `${p} ${transcript}` : transcript));
    };
    recognition.start();
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const current = prompt.trim();
    if (!current || loading) return;

    const active = selected.filter(isAvailable);
    if (!active.length) {
      setError("Open at least one connected AI before sending.");
      return;
    }

    const tempUserId = `temp-user-${Date.now()}`;
    setPrompt("");
    setError("");
    setLoading(true);
    setMessages((prev) => [...prev, { id: tempUserId, content: current, authorType: "user" }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, prompt: current, language, providers: active, history }),
      });
      const data: ChatResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");

      const userMessage = data.userMessage || { id: tempUserId, content: current, authorType: "user" };
      const aiMessage = data.aiMessage || {
        id: `temp-ai-${Date.now()}`,
        content: data.finalAnswer || "No AI answer returned.",
        authorType: "ai",
      };

      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserId), userMessage, aiMessage]);
      setLastResult(data);

      if (speakerEnabled && data.finalAnswer && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.finalAnswer.slice(0, 1500));
        utterance.lang = language === "ko" ? "ko-KR" : "en-AU";
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  async function upload(file: File) {
    const form = new FormData();
    form.set("roomId", roomId);
    form.set("file", file);
    const res = await fetch("/api/documents/upload", { method: "POST", body: form });
    if (!res.ok) setError("Upload failed.");
  }

  return (
    <main className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-[#07101d] pt-[92px] text-[#f4f0e7]">
      <style>{`
        @media (min-width: 1024px) {
          .royal-room-layout > aside {
            top: 92px !important;
            height: calc(100vh - 92px) !important;
            min-height: calc(100vh - 92px) !important;
          }
        }
      `}</style>

      <header className="fixed inset-x-0 top-0 z-[170] flex h-[42px] items-center gap-2 border-b border-white/10 bg-[#07101d]/98 px-3 shadow-sm backdrop-blur">
        <Link href="/dashboard" className="shrink-0 text-sm text-[#d7b64d]">← Dashboard</Link>
        <h1 className="text-xl font-semibold leading-none">Command Room</h1>
        <div className="ml-auto flex items-center gap-2">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-lg border border-white/10 bg-[#0b1524] px-2 py-1.5 text-xs">
            <option value="ko">🇰🇷 한국어</option>
            <option value="en">🇦🇺 English</option>
          </select>
          <button type="button" onClick={() => setSpeakerEnabled((v) => !v)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-[#0b1524]">
            {speakerEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </header>

      <div className="fixed inset-x-0 top-[42px] z-[165] h-[50px] border-b border-[#d7b64d]/30 bg-[#07101d]/98 px-2 py-1.5 shadow-lg backdrop-blur">
        <div className="flex h-full w-full items-center gap-1 overflow-hidden">
          {CORE_AI.map((id) => {
            const available = isAvailable(id);
            const active = selected.includes(id) && available;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleProvider(id)}
                disabled={!available}
                title={LABELS[id]}
                className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-semibold leading-none ${active ? "border-[#d7b64d] bg-[#d7b64d] text-[#111827]" : "border-white/15 bg-[#0b1524] text-[#a8afba]"} ${!available ? "cursor-not-allowed opacity-35" : ""}`}
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded bg-black/20 ${active ? "bg-black/10" : ""}`}>
                  <img
                    src={AI_LOGOS[id]}
                    alt=""
                    className="h-4 w-4 object-contain"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  <span className="absolute text-[8px] font-bold">{LABELS[id]?.slice(0, 1)}</span>
                </span>
                <span className="min-w-0 truncate">{LABELS[id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 w-full max-w-none flex-col p-0">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-y border-white/10 bg-[#0b1524]">
            <div ref={messagesViewportRef} className="min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-2 py-2">
              {!messages.length && !loading && (
                <div className="mx-auto mt-8 max-w-xl text-center">
                  <Bot className="mx-auto text-[#d7b64d]" size={30} />
                  <h2 className="mt-2 text-xl font-semibold">Give one order. Your OPEN AIs work together.</h2>
                </div>
              )}

              {messages.map((m) => {
                const type = m.authorType || m.author_type || "user";
                const user = type === "user";
                if (user) {
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setExpandedUserMessage(m)}
                      className="flex h-11 w-full max-w-none items-center gap-3 overflow-hidden rounded-2xl bg-[#d7b64d] px-4 text-left text-[#111827]"
                      title="클릭하면 전체 내용을 봅니다"
                    >
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-black/60">You</span>
                      <span className="min-w-0 flex-1 truncate text-base">{m.content.replace(/\s+/g, " ")}</span>
                    </button>
                  );
                }

                return (
                  <article key={m.id} className="w-full max-w-none rounded-2xl border border-white/10 bg-[#0f1b2c] px-4 py-3 whitespace-pre-wrap">
                    {m.content}
                  </article>
                );
              })}

              {loading && <div className="text-sm text-[#d7b64d]">Working: {selected.filter(isAvailable).map((id) => LABELS[id]).join(" + ")}…</div>}
            </div>

            <form onSubmit={send} className="w-full min-w-0 shrink-0 border-t border-white/10 bg-[#0b1524] p-0">
              {error && <div className="mb-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}
              <div className="w-full min-w-0 rounded-t-2xl border border-[#d7b64d]/30 bg-[#07101d] p-2">
                <textarea ref={textRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  placeholder="Type or speak your order…"
                  className="block w-full min-w-0 resize-none bg-transparent px-2 py-2 text-base outline-none placeholder:text-[#667085]" />
                <div className="flex min-w-0 items-center gap-2 px-0 pb-0 lg:pl-[220px] lg:pr-[220px]">
                  <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.currentTarget.value = ""; }} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#07101d]" title="파일 첨부"><Paperclip size={18} /></button>
                  <button type="button" onClick={toggleMic} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-[#07101d] ${listening ? "border-[#d7b64d] text-[#f4d66c]" : "border-white/10"}`} title="마이크"><Mic size={18} /></button>
                  <button type="submit" disabled={!prompt.trim() || loading} className="ml-auto flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#d7b64d] px-6 font-semibold text-[#111827] disabled:opacity-40"><Send size={17} /> Send</button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>

      {expandedUserMessage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setExpandedUserMessage(null)}
          role="presentation"
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#d7b64d]/50 bg-[#d7b64d] p-5 text-[#111827] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-black/60">You</div>
              <button type="button" onClick={() => setExpandedUserMessage(null)} className="rounded-lg border border-black/20 px-3 py-1 text-sm font-semibold">닫기</button>
            </div>
            <div className="whitespace-pre-wrap break-words text-base leading-7">{expandedUserMessage.content}</div>
          </div>
        </div>
      )}
    </main>
  );
}
