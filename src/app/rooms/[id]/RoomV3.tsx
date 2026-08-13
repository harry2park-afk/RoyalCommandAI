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

const CORE_AI = ["openai", "anthropic", "google", "xai"];
const LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  xai: "Grok",
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
    <main className="flex h-[100dvh] min-h-0 overflow-hidden bg-[#07101d] text-[#f4f0e7]">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="mx-auto flex h-full min-h-0 max-w-[1500px] flex-col px-4 py-4 md:px-6">
          <header className="relative z-20 flex shrink-0 flex-wrap items-center gap-3 border-b border-white/10 bg-[#07101d] pb-4">
            <Link href="/dashboard" className="text-sm text-[#b8b6b0]">← Dashboard</Link>
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-[0.32em] text-[#d7b64d]">Royal Command</div>
              <h1 className="text-2xl font-semibold">Command Room</h1>
            </div>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm">
              <option value="ko">🇰🇷 한국어</option>
              <option value="en">🇦🇺 English</option>
            </select>
            <button type="button" onClick={() => setSpeakerEnabled((v) => !v)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#0b1524]">
              {speakerEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </header>

          <div className="relative z-20 shrink-0 bg-[#07101d] py-4">
            <div className="mb-2 text-xs uppercase tracking-[0.22em] text-[#9ca5b2]">AI OPEN / OFF — only OPEN AIs work</div>
            <div className="flex flex-wrap gap-2">
              {CORE_AI.map((id) => {
                const available = isAvailable(id);
                const active = selected.includes(id) && available;
                return (
                  <button key={id} type="button" onClick={() => toggleProvider(id)} disabled={!available}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${active ? "border-[#d7b64d] bg-[#d7b64d] text-[#111827]" : "border-white/15 bg-[#0b1524] text-[#a8afba]"} ${!available ? "cursor-not-allowed opacity-35" : ""}`}>
                    {LABELS[id]} · {available ? (active ? "OPEN" : "OFF") : "NOT CONNECTED"}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-sm text-[#9ca5b2]">When 2 or more AIs are OPEN, Royal Command runs them as one council and returns one joint answer.</div>
          </div>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1524]">
            <div ref={messagesViewportRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 md:px-6">
              {!messages.length && !loading && (
                <div className="mx-auto mt-16 max-w-xl text-center">
                  <Bot className="mx-auto text-[#d7b64d]" size={38} />
                  <h2 className="mt-4 text-2xl font-semibold">Give one order. Your OPEN AIs work together.</h2>
                </div>
              )}

              {messages.map((m) => {
                const type = m.authorType || m.author_type || "user";
                const user = type === "user";
                return (
                  <article key={m.id} className={`max-w-[88%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${user ? "ml-auto bg-[#d7b64d] text-[#111827]" : "border border-white/10 bg-[#0f1b2c]"}`}>
                    <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.18em] ${user ? "text-black/60" : "text-[#d7b64d]"}`}>{user ? "You" : "Royal Command AI Council"}</div>
                    {m.content}
                  </article>
                );
              })}

              {loading && <div className="text-sm text-[#d7b64d]">Working: {selected.filter(isAvailable).map((id) => LABELS[id]).join(" + ")}…</div>}
            </div>

            <form onSubmit={send} className="shrink-0 border-t border-white/10 bg-[#0b1524] p-3 md:p-4">
              {error && <div className="mb-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}
              {lastResult?.responses?.length ? (
                <div className="mb-2 text-xs text-[#9ca5b2]">Last run: {lastResult.responses.map((r) => `${LABELS[r.provider] || r.provider}${r.error ? " ✕" : " ✓"}`).join(" · ")}</div>
              ) : null}
              <div className="rounded-2xl border border-[#d7b64d]/30 bg-[#07101d] p-2">
                <textarea ref={textRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  placeholder="Type or speak your order…"
                  className="w-full resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-[#667085]" />
                <div className="flex items-center gap-2 px-1 pb-1">
                  <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.currentTarget.value = ""; }} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><Paperclip size={18} /></button>
                  <button type="button" onClick={toggleMic} className={`grid h-10 w-10 place-items-center rounded-xl border ${listening ? "border-[#d7b64d] text-[#f4d66c]" : "border-white/10"}`}><Mic size={18} /></button>
                  <button type="submit" disabled={!prompt.trim() || loading} className="ml-auto flex h-10 items-center gap-2 rounded-xl bg-[#d7b64d] px-6 font-semibold text-[#111827] disabled:opacity-40"><Send size={17} /> Send</button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
