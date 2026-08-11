"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Bot,
  Check,
  ClipboardPaste,
  Copy,
  Headphones,
  Link2,
  List,
  ListOrdered,
  MessageSquareText,
  Mic,
  Paperclip,
  Plus,
  Send,
  Volume2,
  VolumeX,
  Warehouse,
  X,
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
  responses: Array<{
    provider: string;
    content: string;
    latencyMs: number;
    error?: string;
  }>;
  comparison: {
    winners: string[];
    notes: string[];
    providerScores: Record<string, number>;
  };
  latencyMs: number;
};

const LANGS = [
  { value: "en", code: "AU", flag: "🇦🇺", label: "English" },
  { value: "ko", code: "KR", flag: "🇰🇷", label: "한국어" },
  { value: "ja", code: "JP", flag: "🇯🇵", label: "日本語" },
  { value: "zh", code: "CN", flag: "🇨🇳", label: "中文" },
  { value: "es", code: "ES", flag: "🇪🇸", label: "Español" },
  { value: "fr", code: "FR", flag: "🇫🇷", label: "Français" },
  { value: "de", code: "DE", flag: "🇩🇪", label: "Deutsch" },
];

const DEFAULT_AI = ["openai", "anthropic", "google", "xai"];
const VISIBLE_AI_LIMIT = 12;

function initials(name: string) {
  return (
    name
      .replace(/[^A-Za-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AI"
  );
}

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Array<{ id: string; filename: string; sizeBytes?: number; size_bytes?: number }>>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selected, setSelected] = useState<string[]>(DEFAULT_AI);
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("ko");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [mode, setMode] = useState<"chat" | "voice">("chat");
  const [lastComparison, setLastComparison] = useState<ChatResult | null>(null);
  const [error, setError] = useState("");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

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

  const visibleSelected = selected.slice(0, VISIBLE_AI_LIMIT);
  const hiddenSelectedCount = Math.max(0, selected.length - VISIBLE_AI_LIMIT);
  const selectedProviders = visibleSelected
    .map((id) => providers.find((p) => p.id === id))
    .filter((p): p is ProviderInfo => Boolean(p));

  const filteredProviders = providers.filter((p) =>
    p.name.toLowerCase().includes(warehouseSearch.trim().toLowerCase()),
  );

  async function load() {
    const [roomRes, provRes] = await Promise.all([
      fetch(`/api/rooms/${roomId}`),
      fetch("/api/ai/providers"),
    ]);
    const roomData = await roomRes.json();
    const provData = await provRes.json();
    if (roomRes.ok) {
      setMessages(roomData.messages || []);
      setDocuments(roomData.documents || []);
    }
    const nextProviders: ProviderInfo[] = provData.connectors || [];
    setProviders(nextProviders);
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(`royalcommand:room:${roomId}:selected-ai`);
      if (saved) {
        try {
          const ids = JSON.parse(saved) as string[];
          const valid = ids.filter((id) => nextProviders.some((p) => p.id === id));
          if (valid.length) setSelected(valid);
        } catch {}
      }
    }
  }

  useEffect(() => { load(); }, [roomId]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`royalcommand:room:${roomId}:selected-ai`, JSON.stringify(selected));
    }
  }, [roomId, selected]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  function speak(text: string) {
    if (!speakerEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text.slice(0, 1200));
    utter.lang = language === "ko" ? "ko-KR" : language === "en" ? "en-AU" : language;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
  function toggleSpeaker() {
    const next = !speakerEnabled;
    setSpeakerEnabled(next);
    if (!next && typeof window !== "undefined") window.speechSynthesis?.cancel();
  }
  function toggleListen() {
    setError("");
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setError("Microphone speech recognition is not supported in this browser."); return; }
    const recognition = new SR();
    recognition.lang = language === "ko" ? "ko-KR" : language === "en" ? "en-AU" : language;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => { setListening(false); setError(`Microphone error: ${event.error || "permission or device problem"}`); };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
      textRef.current?.focus();
    };
    recognition.start();
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || loading) return;
    if (selected.length === 0) { setError("Choose at least one AI from the AI Warehouse."); return; }
    setLoading(true); setError("");
    const currentPrompt = prompt.trim();
    setPrompt("");
    setMessages((prev) => [...prev, { id: `temp-user-${Date.now()}`, content: currentPrompt, authorType: "user" }]);
    try {
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId, prompt: currentPrompt, language, providers: selected, history }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");
      setLastComparison(data); await load(); speak(data.finalAnswer);
    } catch (err) { setError(err instanceof Error ? err.message : "Chat failed"); }
    finally { setLoading(false); }
  }

  async function onUpload(file: File) {
    const form = new FormData(); form.set("roomId", roomId); form.set("file", file);
    const res = await fetch("/api/documents/upload", { method: "POST", body: form });
    if (!res.ok) { const data = await res.json(); setError(data.error || "Upload failed"); return; }
    await load();
  }
  function toggleProvider(id: string) {
    const provider = providers.find((p) => p.id === id);
    if (provider && !provider.available) { setError(`${provider.name} is in the Royal Command catalog but is not connected yet.`); return; }
    setError(""); setSelected((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  }
  function wrapSelection(before: string, after = before) {
    const el = textRef.current; if (!el) return;
    const start = el.selectionStart; const end = el.selectionEnd; const selectedText = prompt.slice(start, end) || "text";
    setPrompt(`${prompt.slice(0, start)}${before}${selectedText}${after}${prompt.slice(end)}`);
  }
  function prefixLines(prefix: string) {
    const el = textRef.current; if (!el) return;
    const start = el.selectionStart; const end = el.selectionEnd; const block = prompt.slice(start, end) || prompt;
    const replaced = block.split("\n").map((line, i) => (prefix === "1. " ? `${i + 1}. ${line}` : `${prefix}${line}`)).join("\n");
    if (start === end) setPrompt(replaced); else setPrompt(`${prompt.slice(0, start)}${replaced}${prompt.slice(end)}`);
  }
  async function copyPrompt() { if (prompt) await navigator.clipboard?.writeText(prompt); }
  async function pastePrompt() { try { const text = await navigator.clipboard.readText(); if (text) setPrompt((prev) => `${prev}${prev ? " " : ""}${text}`); } catch { setError("Browser paste permission is blocked. Use Ctrl+V instead."); } }

  return (
    <main className="flex min-h-screen w-full max-w-none flex-col px-2 py-3 md:px-3">
      <header className="mb-3 flex h-12 w-full items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2">
        <Link href="/dashboard" className="shrink-0 text-xs text-[var(--muted)]">← Dashboard</Link>
        <h1 className="ml-2 shrink-0 whitespace-nowrap text-xl md:text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>Royal Command AI Room</h1>
        <div className="ml-auto flex min-w-0 items-center gap-1.5 overflow-x-auto">
          <div className="flex shrink-0 rounded-lg border border-white/10 p-0.5">
            <button type="button" onClick={() => setMode("chat")} className={`flex h-8 items-center gap-1 rounded-md px-2.5 text-xs ${mode === "chat" ? "bg-[var(--gold)] text-black" : "text-[var(--muted)]"}`}><MessageSquareText size={14} /> Chat</button>
            <button type="button" onClick={() => setMode("voice")} className={`flex h-8 items-center gap-1 rounded-md px-2.5 text-xs ${mode === "voice" ? "bg-[var(--gold)] text-black" : "text-[var(--muted)]"}`}><Headphones size={14} /> Voice</button>
          </div>
          <button type="button" onClick={toggleSpeaker} className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] ${speakerEnabled ? "text-[var(--gold-soft)]" : "text-[var(--muted)]"}`} title={speakerEnabled ? "AI voice on" : "AI voice off"}>{speakerEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>
          <select className="h-8 w-[108px] shrink-0 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2 text-xs text-[var(--text)] outline-none" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">{LANGS.map((l) => <option key={l.value} value={l.value}>{l.flag} {l.code}</option>)}</select>
        </div>
      </header>

      <button type="button" onClick={() => setRightPanelOpen((v) => !v)} className="fixed right-0 top-1/2 z-[999999] flex h-[68px] w-[38px] -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-[var(--gold)]/60 bg-[#050a12] text-3xl text-[var(--gold-soft)]" title={rightPanelOpen ? "Close right panel" : "Open right panel"}>{rightPanelOpen ? "›" : "‹"}</button>

      <div className={`grid min-w-0 flex-1 ${rightPanelOpen ? "gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" : "gap-0 grid-cols-[minmax(0,1fr)]"}`}>
        <section className="rc-card flex min-w-0 min-h-[72vh] w-full max-w-none flex-col overflow-hidden">
          {mode === "voice" ? <div className="border-b border-[var(--line)] p-4"><div className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-white/10 bg-black/25 p-4 text-center"><Bot size={40} className="text-[var(--gold-soft)]" /><h2 className="mt-2 text-lg font-semibold">Royal Command AI Advisor</h2><button type="button" onClick={toggleListen} className="mt-3 flex items-center gap-2 rounded-full bg-[var(--gold)] px-4 py-2 text-xs text-black"><Mic size={15} /> {listening ? "Listening…" : "Speak to Royal Command"}</button></div></div> : null}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {messages.map((m) => { const type = m.authorType || m.author_type || "user"; return <div key={m.id} className={`max-w-[90%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${type === "user" ? "ml-auto bg-[var(--navy)]" : type === "system" ? "bg-black/30 text-[var(--muted)]" : "border border-[var(--line)] bg-black/40"}`}><div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--gold-soft)]">{type}</div>{m.content}</div>; })}
            {loading ? <div className="text-sm text-[var(--muted)]">Consulting {selected.length} selected AIs…</div> : null}<div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="w-full max-w-none border-t border-[var(--line)] p-2 md:p-2.5">
            <div className="mb-1 flex min-h-7 flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-white/10 bg-black/25 px-1.5 py-1">
              {selectedProviders.map((p) => <button key={p.id} type="button" onClick={() => toggleProvider(p.id)} className="flex h-6 shrink-0 items-center gap-1 rounded-md border border-[var(--gold)]/70 bg-[var(--gold)]/10 px-1.5 text-[10px] text-[var(--gold-soft)]"><span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-white/10 text-[7px] font-semibold">{initials(p.name).slice(0, 1)}</span><span>{p.name}</span><Check size={9} /></button>)}
              {hiddenSelectedCount > 0 ? <button type="button" onClick={() => setWarehouseOpen(true)} className="h-6 shrink-0 rounded-md border border-white/10 px-1.5 text-[10px] text-[var(--muted)]">+{hiddenSelectedCount}</button> : null}
              <button type="button" onClick={() => setWarehouseOpen(true)} className="ml-auto flex h-6 shrink-0 items-center gap-1 rounded-md border border-white/10 px-1.5 text-[10px] text-[var(--muted)]"><Warehouse size={11} /> AI ({providers.length})</button>
            </div>
            <textarea ref={textRef} className="rc-input min-h-44 w-full max-w-none resize-y text-base" placeholder="Type or speak what you want Royal Command to do…" value={prompt} onChange={(e) => setPrompt(e.target.value)} spellCheck onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <div className="mt-1 flex min-h-7 flex-nowrap items-center gap-0 overflow-x-auto rounded-lg border border-white/10 bg-black/20 px-0.5 py-0.5">
              <button type="button" className="rounded p-1 text-[var(--muted)]" onClick={() => wrapSelection("**")} title="Bold"><Bold size={12} /></button><button type="button" className="rounded p-1 text-[var(--muted)]" onClick={() => prefixLines("• ")} title="Bullet list"><List size={12} /></button><button type="button" className="rounded p-1 text-[var(--muted)]" onClick={() => prefixLines("1. ")} title="Numbered list"><ListOrdered size={12} /></button><button type="button" className="rounded p-1 text-[var(--muted)]" onClick={() => wrapSelection("[", "](https://)")} title="Insert link"><Link2 size={12} /></button><button type="button" className="rounded p-1 text-[var(--muted)]" onClick={copyPrompt} title="Copy"><Copy size={12} /></button><button type="button" className="rounded p-1 text-[var(--muted)]" onClick={pastePrompt} title="Paste"><ClipboardPaste size={12} /></button><button type="button" className="rounded p-1 text-[var(--muted)]" onClick={() => fileRef.current?.click()} title="Attach file"><Paperclip size={12} /></button><button type="button" className="rounded p-1 text-[var(--muted)]" onClick={toggleListen} title="Voice input"><Mic size={12} /></button>
              <div className="ml-auto flex shrink-0 items-center gap-0.5"><button type="submit" className="flex items-center gap-0.5 rounded-full bg-[var(--gold)] px-2 py-1 text-[9px] font-bold text-black disabled:opacity-50" disabled={loading || selected.length === 0}><Send size={10} /> Send to {selected.length} AIs</button><button type="button" className="rounded-full border border-[var(--line)] px-1.5 py-1 text-[9px]" onClick={() => setWarehouseOpen(true)}>Choose AI</button><button type="button" className="rounded-full border border-[var(--line)] px-1.5 py-1 text-[9px]" onClick={toggleSpeaker}>{speakerEnabled ? "Voice on" : "Voice off"}</button></div>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            </div>
            {error ? <p className="mt-1 text-sm text-[var(--danger)]">{error}</p> : null}
          </form>
        </section>

        {rightPanelOpen ? <aside className="min-w-0 space-y-4">
          <div className="rc-card p-4"><h2 className="text-xl" style={{ fontFamily: "var(--font-display), serif" }}>Comparison</h2>{lastComparison ? <div className="mt-3 space-y-2 text-sm text-[var(--muted)]"><p>Latency: {lastComparison.latencyMs}ms</p><p>Winners: {lastComparison.comparison.winners.join(", ") || "—"}</p></div> : <p className="mt-3 text-sm text-[var(--muted)]">Choose your AI team and send one prompt to compare responses.</p>}</div>
          <div className="rc-card p-4"><h2 className="text-xl" style={{ fontFamily: "var(--font-display), serif" }}>Documents</h2><ul className="mt-3 space-y-2 text-sm">{documents.map((d) => <li key={d.id} className="rounded-xl border border-white/10 px-3 py-2">{d.filename}<div className="text-xs text-[var(--muted)]">{d.sizeBytes ?? d.size_bytes ?? 0} bytes · original preserved</div></li>)}{documents.length === 0 ? <li className="text-[var(--muted)]">No documents yet.</li> : null}</ul></div>
        </aside> : null}
      </div>

      {warehouseOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={() => setWarehouseOpen(false)}><div className="rc-card max-h-[88vh] w-full max-w-5xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-white/10 p-4"><div><h2 className="flex items-center gap-2 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}><Warehouse size={22} /> AI Warehouse</h2><p className="mt-1 text-xs text-[var(--muted)]">Add, remove or replace AI services anytime. Your Room remembers your selection.</p></div><button type="button" className="rounded-xl p-2 text-[var(--muted)] hover:bg-white/5" onClick={() => setWarehouseOpen(false)}><X size={20} /></button></div><div className="p-4"><input className="rc-input" value={warehouseSearch} onChange={(e) => setWarehouseSearch(e.target.value)} placeholder="Search AI Warehouse…" /><div className="mt-4 grid max-h-[60vh] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{filteredProviders.map((p, index) => { const active = selected.includes(p.id); return <button key={p.id} type="button" disabled={!p.available} onClick={() => toggleProvider(p.id)} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-[var(--gold)] bg-[var(--gold)]/10" : p.available ? "border-white/10 bg-black/20 hover:border-white/25" : "cursor-not-allowed border-white/5 bg-black/10 opacity-50"}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-xs font-semibold text-[var(--gold-soft)]">{initials(p.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{index + 1}. {p.name}</span><span className="mt-0.5 block text-[10px] text-[var(--muted)]">{p.configured ? "Connected" : p.available ? "Available in demo/catalog" : "Catalog · connection required"}</span></span>{active ? <Check size={17} className="text-[var(--gold-soft)]" /> : <Plus size={17} className="text-[var(--muted)]" />}</button>; })}</div></div></div></div> : null}
    </main>
  );
}
