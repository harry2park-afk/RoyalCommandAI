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
  metadata?: Record<string, unknown>;
  createdAt?: string;
  created_at?: string;
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
  blocked?: boolean;
  latencyMs: number;
};

const LANGS = ["en", "ko", "ja", "zh", "es", "fr", "de"];
const DEFAULT_AI = ["openai", "anthropic", "google", "xai"];
const VISIBLE_AI_LIMIT = 12;

function initials(name: string) {
  return name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AI";
}

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [roomName, setRoomName] = useState("Room");
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Array<{ id: string; filename: string; sizeBytes?: number; size_bytes?: number }>>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selected, setSelected] = useState<string[]>(DEFAULT_AI);
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [mode, setMode] = useState<"chat" | "voice">("chat");
  const [lastComparison, setLastComparison] = useState<ChatResult | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const history = useMemo(
    () =>
      messages
        .filter((m) => (m.authorType || m.author_type) !== "system")
        .map((m) => ({
          role:
            (m.authorType || m.author_type) === "user"
              ? ("user" as const)
              : ("assistant" as const),
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
      setRoomName(roomData.room?.name || "Room");
      setMessages(roomData.messages || []);
      setDocuments(roomData.documents || []);
    }
    const nextProviders: ProviderInfo[] = provData.connectors || [];
    setProviders(nextProviders);

    if (typeof window !== "undefined") {
      const storageKey = `royalcommand:room:${roomId}:selected-ai`;
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        try {
          const ids = JSON.parse(saved) as string[];
          const valid = ids.filter((id) => nextProviders.some((p) => p.id === id));
          if (valid.length) setSelected(valid);
        } catch {
          // Keep defaults if old local data is invalid.
        }
      }
    }
  }

  useEffect(() => {
    load();
  }, [roomId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      `royalcommand:room:${roomId}:selected-ai`,
      JSON.stringify(selected),
    );
  }, [roomId, selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  function speak(text: string) {
    if (!speakerEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text.slice(0, 1200));
    utter.lang = language === "ko" ? "ko-KR" : language;
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
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setError("Microphone speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SR();
    recognition.lang = language === "ko" ? "ko-KR" : language;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      setError(`Microphone error: ${event.error || "permission or device problem"}`);
    };
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
    if (selected.length === 0) {
      setError("Choose at least one AI from the AI Warehouse.");
      return;
    }
    setLoading(true);
    setError("");
    const currentPrompt = prompt.trim();
    setPrompt("");
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-user-${Date.now()}`,
        content: currentPrompt,
        authorType: "user",
      },
    ]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          prompt: currentPrompt,
          language,
          providers: selected,
          history,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");
      setLastComparison(data);
      await load();
      speak(data.finalAnswer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  async function onUpload(file: File) {
    const form = new FormData();
    form.set("roomId", roomId);
    form.set("file", file);
    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Upload failed");
      return;
    }
    await load();
  }

  function toggleProvider(id: string) {
    const provider = providers.find((p) => p.id === id);
    if (provider && !provider.available) {
      setError(`${provider.name} is in the Royal Command catalog but is not connected yet.`);
      return;
    }
    setError("");
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function wrapSelection(before: string, after = before) {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = prompt.slice(start, end) || "text";
    const next = `${prompt.slice(0, start)}${before}${selectedText}${after}${prompt.slice(end)}`;
    setPrompt(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    });
  }

  function prefixLines(prefix: string) {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const block = prompt.slice(start, end) || prompt;
    const replaced = block
      .split("\n")
      .map((line, i) => (prefix === "1. " ? `${i + 1}. ${line}` : `${prefix}${line}`))
      .join("\n");
    if (start === end) setPrompt(replaced);
    else setPrompt(`${prompt.slice(0, start)}${replaced}${prompt.slice(end)}`);
  }

  async function copyPrompt() {
    if (!prompt) return;
    await navigator.clipboard?.writeText(prompt);
  }

  async function pastePrompt() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setPrompt((prev) => `${prev}${prev ? " " : ""}${text}`);
    } catch {
      setError("Browser paste permission is blocked. Use Ctrl+V instead.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 md:px-6">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-[var(--muted)]">
            ← Dashboard
          </Link>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>
            {roomName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setMode("chat")}
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs ${mode === "chat" ? "bg-[var(--gold)] text-black" : "text-[var(--muted)]"}`}
            >
              <MessageSquareText size={15} /> Chat
            </button>
            <button
              type="button"
              onClick={() => setMode("voice")}
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs ${mode === "voice" ? "bg-[var(--gold)] text-black" : "text-[var(--muted)]"}`}
            >
              <Headphones size={15} /> Voice
            </button>
          </div>
          <button
            type="button"
            onClick={toggleSpeaker}
            className={`rc-btn rc-btn-ghost !px-3 ${speakerEnabled ? "border-[var(--gold)] text-[var(--gold-soft)]" : ""}`}
            title={speakerEnabled ? "AI voice on" : "AI voice off"}
          >
            {speakerEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <select
            className="rc-input w-auto"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rc-card flex min-h-[72vh] flex-col overflow-hidden">
          {mode === "voice" ? (
            <div className="border-b border-[var(--line)] p-4 md:p-6">
              <div className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-white/10 bg-black/25 p-6 text-center">
                <div className="relative mb-4 grid h-32 w-32 place-items-center rounded-full border border-[var(--gold)]/40 bg-[var(--navy)] shadow-2xl">
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-black/30">
                    <Bot size={46} className="text-[var(--gold-soft)]" />
                  </div>
                  {listening ? <span className="absolute inset-0 animate-ping rounded-full border border-[var(--gold)]/50" /> : null}
                </div>
                <h2 className="text-xl font-semibold">Royal Command AI Advisor</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Voice consultation mode. Your future visual advisor can be connected here without changing the Room workflow.
                </p>
                <button
                  type="button"
                  onClick={toggleListen}
                  className={`mt-4 flex items-center gap-2 rounded-full px-5 py-3 text-sm ${listening ? "bg-red-500/20 text-red-200" : "bg-[var(--gold)] text-black"}`}
                >
                  <Mic size={18} /> {listening ? "Listening…" : "Speak to Royal Command"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {messages.map((m) => {
              const type = m.authorType || m.author_type || "user";
              return (
                <div
                  key={m.id}
                  className={`max-w-[90%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
                    type === "user"
                      ? "ml-auto bg-[var(--navy)]"
                      : type === "system"
                        ? "bg-black/30 text-[var(--muted)]"
                        : "border border-[var(--line)] bg-black/40"
                  }`}
                >
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--gold-soft)]">
                    {type}
                  </div>
                  {m.content}
                </div>
              );
            })}
            {loading ? (
              <div className="text-sm text-[var(--muted)]">
                Consulting {selected.length} selected AI{selected.length === 1 ? "" : "s"}…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className="border-t border-[var(--line)] p-2 md:p-2.5">
            <div className="mb-1 flex min-h-7 flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-white/10 bg-black/25 px-1.5 py-1">
              {selectedProviders.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProvider(p.id)}
                  className="flex h-6 shrink-0 items-center gap-1 rounded-md border border-[var(--gold)]/70 bg-[var(--gold)]/10 px-1.5 text-[10px] text-[var(--gold-soft)]"
                  title={`${p.name} selected — click to remove`}
                >
                  <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-white/10 text-[7px] font-semibold">
                    {initials(p.name)}
                  </span>
                  <span>{p.name}</span>
                  <Check size={9} />
                </button>
              ))}
              {hiddenSelectedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setWarehouseOpen(true)}
                  className="h-6 shrink-0 rounded-md border border-white/10 px-1.5 text-[10px] text-[var(--muted)]"
                >
                  +{hiddenSelectedCount}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setWarehouseOpen(true)}
                className="ml-auto flex h-6 shrink-0 items-center gap-1 rounded-md border border-white/10 px-1.5 text-[10px] text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--gold-soft)]"
              >
                <Warehouse size={11} /> AI ({providers.length})
              </button>
            </div>

            <textarea
              ref={textRef}
              className="rc-input min-h-44 resize-y text-base"
              placeholder="Type or speak what you want Royal Command to do…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              spellCheck
              autoCorrect="on"
              autoCapitalize="sentences"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />

            <div className="mt-1.5 flex min-h-9 flex-nowrap items-center gap-0.5 overflow-x-auto rounded-xl border border-white/10 bg-black/20 px-1 py-1">
              <button type="button" className="shrink-0 rounded-md p-1.5 text-[var(--muted)] hover:bg-white/5" onClick={() => wrapSelection("**")} title="Bold">
                <Bold size={14} />
              </button>
              <button type="button" className="shrink-0 rounded-md p-1.5 text-[var(--muted)] hover:bg-white/5" onClick={() => prefixLines("• ")} title="Bullet list">
                <List size={14} />
              </button>
              <button type="button" className="shrink-0 rounded-md p-1.5 text-[var(--muted)] hover:bg-white/5" onClick={() => prefixLines("1. ")} title="Numbered list">
                <ListOrdered size={14} />
              </button>
              <button type="button" className="shrink-0 rounded-md p-1.5 text-[var(--muted)] hover:bg-white/5" onClick={() => wrapSelection("[", "](https://)")} title="Insert link">
                <Link2 size={14} />
              </button>
              <span className="mx-0.5 h-4 w-px shrink-0 bg-white/10" />
              <button type="button" className="shrink-0 rounded-md p-1.5 text-[var(--muted)] hover:bg-white/5" onClick={copyPrompt} title="Copy">
                <Copy size={14} />
              </button>
              <button type="button" className="shrink-0 rounded-md p-1.5 text-[var(--muted)] hover:bg-white/5" onClick={pastePrompt} title="Paste">
                <ClipboardPaste size={14} />
              </button>
              <button type="button" className="shrink-0 rounded-md p-1.5 text-[var(--muted)] hover:bg-white/5" onClick={() => fileRef.current?.click()} title="Attach file">
                <Paperclip size={14} />
              </button>
              <button
                type="button"
                className={`shrink-0 rounded-md p-1.5 hover:bg-white/5 ${listening ? "text-red-300" : "text-[var(--muted)]"}`}
                onClick={toggleListen}
                title="Voice input"
              >
                <Mic size={14} />
              </button>

              <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-bold text-black disabled:opacity-50"
                  disabled={loading || selected.length === 0}
                >
                  <Send size={14} /> Send to {selected.length} AI{selected.length === 1 ? "" : "s"}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full border border-[var(--line)] px-2.5 py-1.5 text-xs"
                  onClick={() => setWarehouseOpen(true)}
                >
                  <Warehouse size={14} /> Choose AI
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full border border-[var(--line)] px-2.5 py-1.5 text-xs"
                  onClick={toggleSpeaker}
                >
                  {speakerEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {speakerEnabled ? "Voice on" : "Voice off"}
                </button>
              </div>

              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
              />
            </div>
            {error ? <p className="mt-1.5 text-sm text-[var(--danger)]">{error}</p> : null}
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rc-card p-4">
            <h2 className="text-xl" style={{ fontFamily: "var(--font-display), serif" }}>
              Comparison
            </h2>
            {lastComparison ? (
              <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                <p>Latency: {lastComparison.latencyMs}ms</p>
                <p>Winners: {lastComparison.comparison.winners.join(", ") || "—"}</p>
                <ul className="space-y-1">
                  {lastComparison.comparison.notes.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
                <div className="mt-3 space-y-2">
                  {lastComparison.responses.map((r) => (
                    <details key={r.provider} className="rounded-xl border border-white/10 p-2">
                      <summary className="cursor-pointer text-[var(--gold-soft)]">
                        {r.provider} {r.error ? `(error)` : `(${r.latencyMs}ms)`}
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-[var(--muted)]">
                        {r.error || r.content}
                      </pre>
                    </details>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Choose your AI team and send one prompt to compare responses.
              </p>
            )}
          </div>

          <div className="rc-card p-4">
            <h2 className="text-xl" style={{ fontFamily: "var(--font-display), serif" }}>
              Documents
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {documents.map((d) => (
                <li key={d.id} className="rounded-xl border border-white/10 px-3 py-2">
                  {d.filename}
                  <div className="text-xs text-[var(--muted)]">
                    {d.sizeBytes ?? d.size_bytes ?? 0} bytes · original preserved
                  </div>
                </li>
              ))}
              {documents.length === 0 ? (
                <li className="text-[var(--muted)]">No documents yet.</li>
              ) : null}
            </ul>
          </div>
        </aside>
      </div>

      {warehouseOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={() => setWarehouseOpen(false)}>
          <div className="rc-card max-h-[88vh] w-full max-w-5xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <h2 className="flex items-center gap-2 text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
                  <Warehouse size={22} /> AI Warehouse
                </h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Add, remove or replace AI services anytime. Your Room remembers your selection.
                </p>
              </div>
              <button type="button" className="rounded-xl p-2 text-[var(--muted)] hover:bg-white/5" onClick={() => setWarehouseOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <input
                className="rc-input"
                value={warehouseSearch}
                onChange={(e) => setWarehouseSearch(e.target.value)}
                placeholder="Search AI Warehouse…"
              />
              <div className="mt-4 grid max-h-[60vh] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {filteredProviders.map((p, index) => {
                  const active = selected.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!p.available}
                      onClick={() => toggleProvider(p.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                        active
                          ? "border-[var(--gold)] bg-[var(--gold)]/10"
                          : p.available
                            ? "border-white/10 bg-black/20 hover:border-white/25"
                            : "cursor-not-allowed border-white/5 bg-black/10 opacity-50"
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-xs font-semibold text-[var(--gold-soft)]">
                        {initials(p.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{index + 1}. {p.name}</span>
                        <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                          {p.configured ? "Connected" : p.available ? "Available in demo/catalog" : "Catalog · connection required"}
                        </span>
                      </span>
                      {active ? <Check size={17} className="text-[var(--gold-soft)]" /> : <Plus size={17} className="text-[var(--muted)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
