"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Bot, Mic, Paperclip, Search, Send, Volume2, VolumeX, Warehouse, X } from "lucide-react";

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

type CatalogAI = {
  id: string;
  name: string;
  shortName: string;
};

const AI_CATALOG: CatalogAI[] = [
  { id: "openai", name: "ChatGPT", shortName: "ChatGPT" },
  { id: "anthropic", name: "Claude", shortName: "Claude" },
  { id: "google", name: "Gemini", shortName: "Gemini" },
  { id: "xai", name: "Grok", shortName: "Grok" },
  { id: "deepseek", name: "DeepSeek", shortName: "DeepSeek" },
  { id: "perplexity", name: "Perplexity", shortName: "Perplexity" },
  { id: "mistral", name: "Mistral", shortName: "Mistral" },
  { id: "meta", name: "Meta Llama", shortName: "Llama" },
  { id: "qwen", name: "Qwen", shortName: "Qwen" },
  { id: "cohere", name: "Cohere", shortName: "Cohere" },
  { id: "moonshot", name: "Kimi / Moonshot AI", shortName: "Kimi" },
  { id: "minimax", name: "MiniMax", shortName: "MiniMax" },
  { id: "zai", name: "Z.ai / GLM", shortName: "GLM" },
  { id: "microsoft", name: "Microsoft Phi", shortName: "Phi" },
  { id: "amazon", name: "Amazon Nova", shortName: "Nova" },
  { id: "nvidia", name: "NVIDIA Nemotron", shortName: "NVIDIA" },
  { id: "ai21", name: "AI21", shortName: "AI21" },
  { id: "nous", name: "Nous Research", shortName: "Nous" },
  { id: "writer", name: "Writer", shortName: "Writer" },
  { id: "stepfun", name: "StepFun", shortName: "Step" },
  { id: "inception", name: "Inception", shortName: "Mercury" },
  { id: "liquid", name: "Liquid AI", shortName: "Liquid" },
  { id: "arcee", name: "Arcee AI", shortName: "Arcee" },
  { id: "zeroone", name: "01.AI / Yi", shortName: "Yi" },
  { id: "tencent", name: "Tencent Hunyuan", shortName: "Hunyuan" },
];

const TOP_SLOT_COUNT = 10;
const DEFAULT_SLOTS = AI_CATALOG.slice(0, TOP_SLOT_COUNT).map((ai) => ai.id);
const CATALOG_BY_ID = Object.fromEntries(AI_CATALOG.map((ai) => [ai.id, ai])) as Record<string, CatalogAI>;

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
  moonshot: "https://cdn.simpleicons.org/moonshot/FFFFFF",
  minimax: "https://cdn.simpleicons.org/minimax/FFFFFF",
  microsoft: "https://cdn.simpleicons.org/microsoft/FFFFFF",
  amazon: "https://cdn.simpleicons.org/amazonwebservices/FFFFFF",
  nvidia: "https://cdn.simpleicons.org/nvidia/FFFFFF",
};

function messageText(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

export default function RoomV3() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [replaceSlot, setReplaceSlot] = useState(TOP_SLOT_COUNT - 1);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("ko");
  const [displayName, setDisplayName] = useState("User");
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastResult, setLastResult] = useState<ChatResult | null>(null);
  const [expandedUserMessage, setExpandedUserMessage] = useState<Message | null>(null);
  const selectionReady = useRef(false);
  const slotsReady = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);

  const history = useMemo(
    () => messages
      .filter((m) => (m.authorType || m.author_type) !== "system")
      .slice(-12)
      .map((m) => ({
        role: (m.authorType || m.author_type) === "user" ? ("user" as const) : ("assistant" as const),
        content: messageText(m.content),
      })),
    [messages],
  );

  const filteredWarehouse = useMemo(() => {
    const q = warehouseSearch.trim().toLowerCase();
    return AI_CATALOG.filter((ai) => !q || `${ai.name} ${ai.shortName}`.toLowerCase().includes(q));
  }, [warehouseSearch]);

  async function loadRoom() {
    const res = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      const incoming = Array.isArray(data.messages) ? data.messages : [];
      setMessages(incoming.slice(-250).map((m: Message) => ({ ...m, content: messageText(m?.content) })));
      if (data.user?.fullName) setDisplayName(data.user.fullName);
      if (data.user?.defaultLanguage === "ko" || data.user?.defaultLanguage === "en") {
        setLanguage(data.user.defaultLanguage);
      }
    }
  }

  async function loadProviders() {
    const res = await fetch("/api/ai/providers", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return;
    const next: ProviderInfo[] = data.connectors || [];
    setProviders(next);

    if (!slotsReady.current) {
      try {
        const saved = JSON.parse(localStorage.getItem(`royalcommand:room:${roomId}:ai-slots-v2`) || "[]") as string[];
        const valid = saved.filter((id) => CATALOG_BY_ID[id]);
        if (valid.length === TOP_SLOT_COUNT && new Set(valid).size === TOP_SLOT_COUNT) setSlots(valid);
      } catch {}
      slotsReady.current = true;
    }

    if (!selectionReady.current) {
      const available = AI_CATALOG.map((ai) => ai.id).filter((id) => next.some((p) => p.id === id && p.available));
      const storageKey = `royalcommand:room:${roomId}:selected-ai`;
      let initial = DEFAULT_SLOTS.filter((id) => available.includes(id));
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
    if (!slotsReady.current) return;
    localStorage.setItem(`royalcommand:room:${roomId}:ai-slots-v2`, JSON.stringify(slots));
  }, [roomId, slots]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function isAvailable(id: string) {
    return providers.some((p) => p.id === id && p.available);
  }

  function toggleProvider(id: string) {
    const ai = CATALOG_BY_ID[id];
    if (!isAvailable(id)) {
      setError(`${ai?.shortName || id} is not connected.`);
      return;
    }
    setError("");
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function replaceWarehouseAI(id: string) {
    setSlots((prev) => {
      const existing = prev.indexOf(id);
      if (existing >= 0) {
        setReplaceSlot(existing);
        return prev;
      }
      const oldId = prev[replaceSlot];
      const next = [...prev];
      next[replaceSlot] = id;
      setSelected((current) => current.filter((selectedId) => selectedId !== oldId));
      return next;
    });
    setWarehouseOpen(false);
    setWarehouseSearch("");
  }

  function toggleMic() {
    setError("");
    const w = window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setError("Voice input is not supported in this browser."); return; }
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

      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserId), { ...userMessage, content: messageText(userMessage.content) }, { ...aiMessage, content: messageText(aiMessage.content) }]);
      setLastResult(data);

      if (speakerEnabled && data.finalAnswer && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.finalAnswer.slice(0, 1500));
        utterance.lang = language === "ko" ? "ko-KR" : language === "en" ? "en-AU" : language;
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

      <div className="fixed inset-x-0 top-0 z-[170] h-[92px] border-b border-[#d7b64d]/30 bg-[#07101d]/98 shadow-lg backdrop-blur">
        <div className="flex h-[42px] items-center gap-2 border-b border-white/10 px-3">
          <Link href="/dashboard" className="shrink-0 text-sm text-[#d7b64d]">← Dashboard</Link>
          <h1 className="ml-8 shrink-0 text-xl font-semibold leading-none">Command Room</h1>
          <div className="min-w-0 flex-1 text-center text-sm font-semibold text-[#f4f0e7]">{displayName}</div>
          <div className="flex shrink-0 items-center gap-1">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-white/10 bg-[#0b1524] px-2 py-1 text-xs text-[#d6d9df]"
              aria-label="Language"
            >
              <option value="ko">🇰🇷 한국어</option>
              <option value="en">🇦🇺 English</option>
            </select>
            <button type="button" onClick={() => setSpeakerEnabled((v) => !v)} className="grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-[#0b1524]">
              {speakerEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </div>
        </div>

        <div className="flex h-[50px] w-full items-center gap-1 overflow-hidden px-2 py-1.5">
          {slots.map((id, index) => {
            const ai = CATALOG_BY_ID[id];
            const available = isAvailable(id);
            const active = selected.includes(id) && available;
            return (
              <button
                key={`${id}-${index}`}
                type="button"
                onClick={() => toggleProvider(id)}
                disabled={!available}
                title={`${ai.name}${available ? "" : " — not connected"}`}
                className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border-[3px] border-[#FFD700] px-1 font-[Times_New_Roman] text-[12px] font-normal leading-none text-[#FFD700] ${active ? "bg-[#7A0C2E] text-[#FFF3D6]" : "bg-[#1E3A8A]"} ${!available ? "cursor-not-allowed opacity-35" : ""}`}
              >
                <span className="relative grid h-5 w-5 shrink-0 place-items-center rounded bg-black/20">
                  {AI_LOGOS[id] ? (
                    <img src={AI_LOGOS[id]} alt="" className="h-4 w-4 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ) : null}
                  <span className="absolute text-[8px] font-bold">{ai.shortName.slice(0, 1)}</span>
                </span>
                <span className="min-w-0 truncate [transform:scaleX(.8)]">{ai.shortName}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setWarehouseOpen(true)}
            className="flex h-8 min-w-[116px] shrink-0 items-center justify-center gap-1 rounded-md border-[2px] border-[#FFD700]/80 bg-[#0b1524] px-3 text-[10px] font-semibold text-[#f4d66c]"
            title="AI Warehouse — search and replace top AI slots"
          >
            <Warehouse size={14} />
            <span>AI Warehouse</span>
          </button>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 w-full max-w-none flex-col p-0">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-y border-white/10 bg-[#0B1524]">
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
                const content = messageText(m.content);
                if (user) {
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setExpandedUserMessage({ ...m, content })}
                      className="flex h-[33px] w-full max-w-none items-center overflow-hidden rounded-[7px] border-[3px] border-[#FFD700] bg-[#1E3A8A] px-[9px] text-left text-white"
                      title="클릭하면 전체 내용을 봅니다"
                    >
                      <span className="min-w-0 flex-1 truncate text-[12px] leading-[1.2]">{content.replace(/\s+/g, " ")}</span>
                    </button>
                  );
                }

                return (
                  <article key={m.id} className="w-full max-w-none rounded-[7px] border-2 border-[#2A3B6E] bg-[#14224D] px-4 py-3 whitespace-pre-wrap text-[#E8E6DD]">
                    {content}
                  </article>
                );
              })}

              {loading && <div className="text-sm text-[#d7b64d]">Working: {selected.filter(isAvailable).map((id) => CATALOG_BY_ID[id]?.shortName || id).join(" + ")}…</div>}
            </div>

            <form onSubmit={send} className="w-full min-w-0 shrink-0 border-t border-white/10 bg-[#0b1524] p-0">
              {error && <div className="mb-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}
              <div className="w-full min-w-0 rounded-t-2xl border border-[#d7b64d]/30 bg-[#07101d] p-2">
                <textarea ref={textRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  placeholder="Type or speak your order…"
                  className="block w-full min-w-0 resize-none bg-transparent px-2 py-2 text-base text-[#E8E6DD] outline-none placeholder:text-[#7C8BC4]" />
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

      {warehouseOpen && (
        <div className="fixed inset-0 z-[210] flex items-start justify-center bg-black/70 px-4 pb-4 pt-[105px]" onClick={() => setWarehouseOpen(false)} role="presentation">
          <div className="flex max-h-[74vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#d7b64d]/50 bg-[#081321] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <Warehouse size={20} className="text-[#d7b64d]" />
              <div>
                <div className="font-semibold">AI Warehouse</div>
                <div className="text-[11px] text-[#9aa4b3]">교체할 상단 슬롯을 고른 뒤 AI를 선택하세요.</div>
              </div>
              <button type="button" onClick={() => setWarehouseOpen(false)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-white/10"><X size={16} /></button>
            </div>

            <div className="border-b border-white/10 px-4 py-3">
              <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
                {slots.map((id, index) => (
                  <button
                    key={`replace-${id}-${index}`}
                    type="button"
                    onClick={() => setReplaceSlot(index)}
                    className={`shrink-0 rounded-md border px-2 py-1 text-[10px] ${replaceSlot === index ? "border-[#d7b64d] bg-[#d7b64d] text-[#111827]" : "border-white/10 bg-[#0b1524] text-[#c9d0da]"}`}
                  >
                    {index + 1}. {CATALOG_BY_ID[id]?.shortName}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8795]" />
                <input
                  value={warehouseSearch}
                  onChange={(e) => setWarehouseSearch(e.target.value)}
                  placeholder="AI 검색..."
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#07101d] pl-9 pr-3 text-sm outline-none"
                />
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredWarehouse.map((ai) => {
                const available = isAvailable(ai.id);
                const inSlots = slots.includes(ai.id);
                return (
                  <button
                    key={ai.id}
                    type="button"
                    onClick={() => replaceWarehouseAI(ai.id)}
                    className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left ${inSlots ? "border-[#d7b64d]/50 bg-[#d7b64d]/10" : "border-white/10 bg-[#0b1524]"}`}
                  >
                    <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/25">
                      {AI_LOGOS[ai.id] ? <img src={AI_LOGOS[ai.id]} alt="" className="h-6 w-6 object-contain" /> : null}
                      <span className="absolute text-[10px] font-bold">{ai.shortName.slice(0, 2)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{ai.shortName}</span>
                      <span className="block truncate text-[10px] text-[#8f99a8]">{available ? "Connected" : "Not connected"}{inSlots ? " · 상단 사용중" : ""}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {expandedUserMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={() => setExpandedUserMessage(null)} role="presentation">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-xl border-[3px] border-[#FFD700] bg-[#1E3A8A] p-5 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-end gap-4">
              <button type="button" onClick={() => setExpandedUserMessage(null)} className="rounded-lg border border-white/25 px-3 py-1 text-sm font-semibold">닫기</button>
            </div>
            <div className="whitespace-pre-wrap break-words text-base leading-7">{messageText(expandedUserMessage.content)}</div>
          </div>
        </div>
      )}
    </main>
  );
}
