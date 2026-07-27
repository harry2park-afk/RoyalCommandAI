"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

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

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [roomName, setRoomName] = useState("Room");
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Array<{ id: string; filename: string; sizeBytes?: number; size_bytes?: number }>>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selected, setSelected] = useState<string[]>(["openai", "anthropic", "google", "xai"]);
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastComparison, setLastComparison] = useState<ChatResult | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    setProviders(provData.connectors || []);
  }

  useEffect(() => {
    load();
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text.slice(0, 800));
    utter.lang = language === "ko" ? "ko-KR" : language;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function toggleListen() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SR();
    recognition.lang = language === "ko" ? "ko-KR" : language;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.start();
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || loading) return;
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
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-[var(--muted)]">
            ← Dashboard
          </Link>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>
            {roomName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
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
        <section className="rc-card flex min-h-[70vh] flex-col overflow-hidden">
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
                        : "bg-black/40 border border-[var(--line)]"
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
                Orchestrating ChatGPT · Claude · Gemini · Grok…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className="border-t border-[var(--line)] p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProvider(p.id)}
                  className={`rounded-full px-3 py-1 text-xs border ${
                    selected.includes(p.id)
                      ? "border-[var(--gold)] text-[var(--gold-soft)]"
                      : "border-white/10 text-[var(--muted)]"
                  }`}
                >
                  {p.name}
                  {!p.configured ? " · demo" : ""}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                className="rc-input min-h-20"
                placeholder="Speak or type your command…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="submit" className="rc-btn rc-btn-primary" disabled={loading}>
                Send to all AIs
              </button>
              <button
                type="button"
                className="rc-btn rc-btn-ghost"
                onClick={toggleListen}
              >
                {listening ? "Listening…" : "Voice input"}
              </button>
              <button
                type="button"
                className="rc-btn rc-btn-ghost"
                onClick={() => fileRef.current?.click()}
              >
                Upload file
              </button>
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
            {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
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
                Send a prompt to compare all connected models.
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
    </main>
  );
}
