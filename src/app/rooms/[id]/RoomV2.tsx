"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  FileText,
  Mic,
  Paperclip,
  Send,
  Settings2,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

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
  responses: Array<{ provider: string; content: string; latencyMs: number; error?: string }>;
  comparison?: {
    winners?: string[];
    notes?: string[];
    providerScores?: Record<string, number>;
  };
  latencyMs?: number;
};

const CORE_AI = ["openai", "anthropic", "google", "xai"];
const LANGS = [
  ["ko", "🇰🇷 한국어"],
  ["en", "🇦🇺 English"],
  ["ja", "🇯🇵 日本語"],
  ["zh", "🇨🇳 中文"],
];

const prettyProvider = (id: string, providers: ProviderInfo[]) =>
  providers.find((p) => p.id === id)?.name ||
  ({ openai: "ChatGPT", anthropic: "Claude", google: "Gemini", xai: "Grok" } as Record<string, string>)[id] ||
  id;

export default function RoomV2() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selected, setSelected] = useState<string[]>(CORE_AI);
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("ko");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState<ChatResult | null>(null);
  const [showProviders, setShowProviders] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const history = useMemo(
    () =>
      messages
        .filter((m) => (m.authorType || m.author_type) !== "system")
        .map((m) => ({
          role: (m.authorType || m.author_type) === "user" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        })),
    [messages],
  );

  async function load() {
    try {
      const [roomRes, providerRes] = await Promise.all([
        fetch(`/api/rooms/${roomId}`, { cache: "no-store" }),
        fetch("/api/ai/providers", { cache: "no-store" }),
      ]);
      const room = await roomRes.json();
      const providerData = await providerRes.json();
      if (roomRes.ok) setMessages(room.messages || []);
      if (providerRes.ok) {
        const next = providerData.connectors || [];
        setProviders(next);
        const availableCore = CORE_AI.filter((id) => next.some((p: ProviderInfo) => p.id === id && p.available));
        if (availableCore.length) setSelected(availableCore);
      }
    } catch {
      setError("Room data could not be loaded.");
    }
  }

  useEffect(() => { void load(); }, [roomId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  function toggleProvider(id: string) {
    const p = providers.find((x) => x.id === id);
    if (p && !p.available) {
      setError(`${p.name} is not connected yet.`);
      return;
    }
    setError("");
    setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  function toggleMic() {
    setError("");
    const w = window as typeof window & {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SR();
    recognition.lang = language === "ko" ? "ko-KR" : language === "en" ? "en-AU" : language;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setError("Microphone could not start."); };
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setPrompt((p) => (p ? `${p} ${transcript}` : transcript));
      textRef.current?.focus();
    };
    recognition.start();
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || loading) return;
    if (!selected.length) {
      setError("Select at least one AI.");
      return;
    }
    const current = prompt.trim();
    setPrompt("");
    setError("");
    setLoading(true);
    setMessages((prev) => [...prev, { id: `temp-${Date.now()}`, content: current, authorType: "user" }]);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, prompt: current, language, providers: selected, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      setLastResult(data);
      await load();
      if (speakerEnabled && data.finalAnswer && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(data.finalAnswer.slice(0, 1500));
        u.lang = language === "ko" ? "ko-KR" : language === "en" ? "en-AU" : language;
        window.speechSynthesis.speak(u);
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
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Upload failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#07101d] text-[#f4f0e7]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col px-4 py-4 md:px-6">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
          <Link href="/dashboard" className="text-sm text-[#b8b6b0] hover:text-white">← Dashboard</Link>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.32em] text-[#d7b64d]">Royal Command</div>
            <h1 className="truncate text-2xl font-semibold md:text-3xl">Command Room</h1>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm outline-none"
          >
            {LANGS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setSpeakerEnabled((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#0b1524]"
            title="Voice output"
          >
            {speakerEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </header>

        <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1524] shadow-2xl shadow-black/20">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 md:px-5">
              <div className="mr-2 flex items-center gap-2 text-sm font-medium">
                <Sparkles size={17} className="text-[#d7b64d]" />
                AI Council
              </div>
              {CORE_AI.map((id) => {
                const p = providers.find((x) => x.id === id);
                const active = selected.includes(id);
                const available = p ? p.available : true;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleProvider(id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${active ? "border-[#d7b64d] bg-[#d7b64d]/15 text-[#f4d66c]" : "border-white/10 text-[#a8afba]"} ${!available ? "opacity-40" : ""}`}
                  >
                    {active ? "✓ " : ""}{prettyProvider(id, providers)}
                  </button>
                );
              })}
              <button type="button" onClick={() => setShowProviders((v) => !v)} className="ml-auto flex items-center gap-1 text-xs text-[#a8afba]">
                More AI <ChevronDown size={14} />
              </button>
            </div>

            {showProviders && (
              <div className="flex flex-wrap gap-2 border-b border-white/10 bg-black/10 px-4 py-3">
                {providers.filter((p) => !CORE_AI.includes(p.id)).map((p) => (
                  <button key={p.id} type="button" onClick={() => toggleProvider(p.id)} className={`rounded-full border px-3 py-1.5 text-xs ${selected.includes(p.id) ? "border-[#d7b64d] text-[#f4d66c]" : "border-white/10 text-[#a8afba]"} ${!p.available ? "opacity-40" : ""}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-6">
              {!messages.length && !loading && (
                <div className="mx-auto mt-16 max-w-xl text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[#d7b64d]/30 bg-[#d7b64d]/10">
                    <Bot className="text-[#d7b64d]" size={30} />
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold">What would you like Royal Command to do?</h2>
                  <p className="mt-2 text-sm leading-6 text-[#9ca5b2]">Ask once. ChatGPT, Claude, Gemini and Grok can analyse together. Royal Command keeps the final answer clear and useful.</p>
                </div>
              )}

              {messages.map((m) => {
                const type = m.authorType || m.author_type || "user";
                const user = type === "user";
                return (
                  <article key={m.id} className={`max-w-[86%] rounded-2xl px-4 py-3 text-[15px] leading-7 whitespace-pre-wrap ${user ? "ml-auto bg-[#d7b64d] text-[#111827]" : "border border-white/10 bg-[#0f1b2c]"}`}>
                    <div className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${user ? "text-black/60" : "text-[#d7b64d]"}`}>{user ? "You" : "Royal Command"}</div>
                    {m.content}
                  </article>
                );
              })}
              {loading && <div className="text-sm text-[#a8afba]">Consulting {selected.length} AI engines…</div>}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="border-t border-white/10 p-3 md:p-4">
              {error && <div className="mb-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}
              <div className="rounded-2xl border border-[#d7b64d]/30 bg-[#07101d] p-2 shadow-inner">
                <textarea
                  ref={textRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={3}
                  placeholder="Type or speak what you want Royal Command to do…"
                  className="w-full resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-[#667085]"
                />
                <div className="flex items-center gap-2 px-1 pb-1">
                  <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.currentTarget.value = ""; }} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-[#a8afba]" title="Attach file"><Paperclip size={18} /></button>
                  <button type="button" onClick={toggleMic} className={`grid h-10 w-10 place-items-center rounded-xl border ${listening ? "border-[#d7b64d] bg-[#d7b64d]/10 text-[#f4d66c]" : "border-white/10 text-[#a8afba]"}`} title="Voice input"><Mic size={18} /></button>
                  <div className="ml-auto text-xs text-[#788292]">Enter to send · Shift+Enter for new line</div>
                  <button type="submit" disabled={!prompt.trim() || loading} className="flex h-10 items-center gap-2 rounded-xl bg-[#d7b64d] px-5 text-sm font-semibold text-[#111827] disabled:opacity-40"><Send size={17} /> Send</button>
                </div>
              </div>
            </form>
          </div>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/10 bg-[#0b1524] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={17} className="text-[#d7b64d]" /> Current council</div>
              <div className="mt-4 space-y-2">
                {CORE_AI.map((id) => (
                  <div key={id} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-sm">
                    <span>{prettyProvider(id, providers)}</span>
                    <span className={`text-xs ${selected.includes(id) ? "text-emerald-300" : "text-[#667085]"}`}>{selected.includes(id) ? "Active" : "Off"}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0b1524] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><FileText size={17} className="text-[#d7b64d]" /> Work area</div>
              <p className="mt-3 text-sm leading-6 text-[#9ca5b2]">Files, documents and specialist tools stay attached to this Room, not scattered across the screen.</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-4 w-full rounded-xl border border-white/10 px-3 py-2 text-sm hover:border-[#d7b64d]/50">Add document</button>
            </section>

            {lastResult && (
              <section className="rounded-3xl border border-[#d7b64d]/25 bg-[#d7b64d]/5 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold"><Settings2 size={17} className="text-[#d7b64d]" /> Last council run</div>
                <div className="mt-3 text-sm text-[#b8c0cc]">{lastResult.responses?.length || selected.length} AI responses compared.</div>
                {lastResult.comparison?.winners?.length ? <div className="mt-2 text-xs text-[#f4d66c]">Best: {lastResult.comparison.winners.join(", ")}</div> : null}
              </section>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
