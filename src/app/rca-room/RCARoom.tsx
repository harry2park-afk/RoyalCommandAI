/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bot, MessageSquarePlus, Search, Send, Warehouse, X } from "lucide-react";

type ProviderInfo = { id: string; name: string; available: boolean; configured: boolean };
type ProviderAnswer = { provider: string; content: string; latencyMs?: number; error?: string };
type Turn = { id: string; prompt: string; answers: ProviderAnswer[]; synthesis?: string; synthesizer?: string; createdAt: number };
type Conversation = { id: string; title: string; turns: Turn[]; createdAt: number; updatedAt: number };
type CatalogAI = { id: string; name: string; shortName: string };

const AI_CATALOG: CatalogAI[] = [
  { id: "openai", name: "ChatGPT", shortName: "ChatGPT" }, { id: "anthropic", name: "Claude", shortName: "Claude" },
  { id: "google", name: "Gemini", shortName: "Gemini" }, { id: "xai", name: "Grok", shortName: "Grok" },
  { id: "deepseek", name: "DeepSeek", shortName: "DeepSeek" }, { id: "perplexity", name: "Perplexity", shortName: "Perplexity" },
  { id: "mistral", name: "Mistral", shortName: "Mistral" }, { id: "meta", name: "Meta Llama", shortName: "Llama" },
  { id: "qwen", name: "Qwen", shortName: "Qwen" }, { id: "cohere", name: "Cohere", shortName: "Cohere" },
  { id: "moonshot", name: "Kimi / Moonshot AI", shortName: "Kimi" }, { id: "minimax", name: "MiniMax", shortName: "MiniMax" },
  { id: "zai", name: "Z.ai / GLM", shortName: "GLM" }, { id: "microsoft", name: "Microsoft Phi", shortName: "Phi" },
  { id: "amazon", name: "Amazon Nova", shortName: "Nova" }, { id: "nvidia", name: "NVIDIA Nemotron", shortName: "NVIDIA" },
  { id: "ai21", name: "AI21", shortName: "AI21" }, { id: "nous", name: "Nous Research", shortName: "Nous" },
  { id: "writer", name: "Writer", shortName: "Writer" }, { id: "stepfun", name: "StepFun", shortName: "Step" },
  { id: "inception", name: "Inception", shortName: "Mercury" }, { id: "liquid", name: "Liquid AI", shortName: "Liquid" },
  { id: "arcee", name: "Arcee AI", shortName: "Arcee" }, { id: "zeroone", name: "01.AI / Yi", shortName: "Yi" },
  { id: "tencent", name: "Tencent Hunyuan", shortName: "Hunyuan" },
];
const TOP_SLOT_COUNT = 10;
const DEFAULT_SLOTS = AI_CATALOG.slice(0, TOP_SLOT_COUNT).map((ai) => ai.id);
const CATALOG_BY_ID = Object.fromEntries(AI_CATALOG.map((ai) => [ai.id, ai])) as Record<string, CatalogAI>;
const CONVERSATIONS_KEY = "rca-room:conversations:v1";
const ACTIVE_KEY = "rca-room:active-conversation:v1";
const SELECTED_KEY = "rca-room:selected-ai:v1";
const SLOTS_KEY = "rca-room:ai-slots:v1";
const AI_LOGOS: Record<string, string> = {
  openai: "https://cdn.simpleicons.org/openai/FFFFFF", anthropic: "https://cdn.simpleicons.org/anthropic/FFFFFF",
  google: "https://cdn.simpleicons.org/googlegemini/FFFFFF", xai: "https://cdn.simpleicons.org/x/FFFFFF",
  deepseek: "https://cdn.simpleicons.org/deepseek/FFFFFF", perplexity: "https://cdn.simpleicons.org/perplexity/FFFFFF",
  mistral: "https://cdn.simpleicons.org/mistralai/FFFFFF", meta: "https://cdn.simpleicons.org/meta/FFFFFF",
  qwen: "https://cdn.simpleicons.org/alibabacloud/FFFFFF", cohere: "https://cdn.simpleicons.org/cohere/FFFFFF",
};

function newId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function newConversation(): Conversation { const now = Date.now(); return { id: newId("conversation"), title: "New Chat", turns: [], createdAt: now, updatedAt: now }; }
function compactTitle(text: string) { const clean = text.replace(/\s+/g, " ").trim(); return clean.length > 36 ? `${clean.slice(0, 36)}…` : clean || "New Chat"; }
function assistantHistory(turn: Turn) {
  if (turn.synthesis?.trim()) return turn.synthesis.trim();
  return turn.answers.filter((a) => !a.error && a.content.trim()).map((a) => `${CATALOG_BY_ID[a.provider]?.shortName || a.provider}: ${a.content.trim()}`).join("\n\n");
}

export default function RCARoom() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [replaceSlot, setReplaceSlot] = useState(TOP_SLOT_COUNT - 1);
  const [synthOpen, setSynthOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [synthBusy, setSynthBusy] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [memoryReady, setMemoryReady] = useState(false);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const synthesisRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId) || null, [activeId, conversations]);
  const latestTurn = activeConversation?.turns[activeConversation.turns.length - 1] || null;
  const latestGoodAnswers = latestTurn?.answers.filter((a) => !a.error && a.content.trim()) || [];
  const filteredWarehouse = useMemo(() => {
    const q = warehouseSearch.trim().toLowerCase();
    return AI_CATALOG.filter((ai) => !q || `${ai.name} ${ai.shortName}`.toLowerCase().includes(q));
  }, [warehouseSearch]);
  const isAvailable = (id: string) => providers.some((p) => p.id === id && p.available);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || "[]") as Conversation[];
      const valid = Array.isArray(stored) ? stored.filter((item) => item?.id && Array.isArray(item.turns)) : [];
      const initial = valid.length ? valid : [newConversation()];
      const storedActive = localStorage.getItem(ACTIVE_KEY) || "";
      setConversations(initial);
      setActiveId(initial.some((item) => item.id === storedActive) ? storedActive : initial[0].id);
      const savedSlots = JSON.parse(localStorage.getItem(SLOTS_KEY) || "[]") as string[];
      const validSlots = savedSlots.filter((id) => CATALOG_BY_ID[id]);
      if (validSlots.length === TOP_SLOT_COUNT && new Set(validSlots).size === TOP_SLOT_COUNT) setSlots(validSlots);
    } catch {
      const initial = newConversation(); setConversations([initial]); setActiveId(initial.id);
    }
    setMemoryReady(true);
  }, []);

  useEffect(() => { if (memoryReady) { localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations)); if (activeId) localStorage.setItem(ACTIVE_KEY, activeId); } }, [activeId, conversations, memoryReady]);
  useEffect(() => { if (memoryReady) localStorage.setItem(SELECTED_KEY, JSON.stringify(selected)); }, [memoryReady, selected]);
  useEffect(() => { if (memoryReady) localStorage.setItem(SLOTS_KEY, JSON.stringify(slots)); }, [memoryReady, slots]);

  useEffect(() => {
    void (async () => {
      try {
        const [providerRes, sessionRes] = await Promise.all([fetch("/api/ai/providers", { cache: "no-store" }), fetch("/api/au-v2/session", { cache: "no-store" })]);
        const providerData = await providerRes.json();
        const sessionData = await sessionRes.json().catch(() => ({}));
        const list: ProviderInfo[] = Array.isArray(providerData?.connectors) ? providerData.connectors : [];
        setProviders(list);
        const available = AI_CATALOG.map((ai) => ai.id).filter((id) => list.some((p) => p.id === id && p.available));
        let initialSelected = available.includes("openai") ? ["openai"] : available.slice(0, 1);
        try { const saved = JSON.parse(localStorage.getItem(SELECTED_KEY) || "[]") as string[]; const valid = saved.filter((id) => available.includes(id)); if (valid.length) initialSelected = valid; } catch {}
        setSelected(initialSelected);
        if (!sessionData?.active) {
          const enterRes = await fetch("/api/au-v2/enter", { method: "POST" });
          const enterData = await enterRes.json().catch(() => ({}));
          if (!enterRes.ok) throw new Error(enterData?.error || "RCA Room test session could not start.");
        }
        setSessionReady(true);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "RCA Room could not start."); }
    })();
  }, []);

  useEffect(() => { const viewport = messagesViewportRef.current; if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" }); }, [activeConversation?.turns.length, busy]);

  function toggleProvider(id: string) {
    if (!isAvailable(id)) { setError(`${CATALOG_BY_ID[id]?.shortName || id} is not connected.`); return; }
    setError(""); setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }
  function replaceWarehouseAI(id: string) {
    setSlots((current) => {
      const existing = current.indexOf(id); if (existing >= 0) { setReplaceSlot(existing); return current; }
      const oldId = current[replaceSlot]; const next = [...current]; next[replaceSlot] = id;
      setSelected((ids) => ids.filter((selectedId) => selectedId !== oldId)); return next;
    });
    setWarehouseOpen(false); setWarehouseSearch("");
  }
  function startNewChat() { const next = newConversation(); setConversations((current) => [next, ...current]); setActiveId(next.id); setPrompt(""); setError(""); setSynthOpen(false); }
  function ensureActiveConversation() {
    if (activeConversation) return activeConversation;
    const next = newConversation(); setConversations((current) => [next, ...current]); setActiveId(next.id); return next;
  }
  function buildHistory(conversation: Conversation) {
    return conversation.turns.slice(-6).flatMap((turn) => {
      const assistant = assistantHistory(turn);
      return [{ role: "user", content: turn.prompt }, ...(assistant ? [{ role: "assistant", content: assistant }] : [])];
    });
  }

  async function send(event?: FormEvent) {
    event?.preventDefault(); const text = prompt.trim(); if (!text || busy || !sessionReady) return;
    const activeProviders = selected.filter(isAvailable).slice(0, 4);
    if (!activeProviders.length) { setError("Open at least one connected AI before sending."); return; }
    const conversation = ensureActiveConversation(); const turnId = newId("turn"); const now = Date.now(); const history = buildHistory(conversation);
    const newTurn: Turn = { id: turnId, prompt: text, answers: [], createdAt: now };
    setPrompt(""); setError(""); setSynthOpen(false); setBusy(true);
    setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, title: item.turns.length ? item.title : compactTitle(text), turns: [...item.turns, newTurn], updatedAt: now } : item));
    try {
      const response = await fetch("/api/au-v2/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text, providers: activeProviders, history }) });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { setSessionReady(false); throw new Error("RCA Room session ended. Refresh the page to restart it."); }
      if (!response.ok) throw new Error(data?.error || "AI request failed.");
      const answers: ProviderAnswer[] = Array.isArray(data?.responses) ? data.responses : [];
      setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, turns: item.turns.map((turn) => turn.id === turnId ? { ...turn, answers } : turn), updatedAt: Date.now() } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "AI request failed."); } finally { setBusy(false); }
  }

  function handleSynthesisButton() {
    if (synthBusy || busy) return;
    if (!sessionReady) { setError("RCA Room session is not ready yet."); return; }
    if (!latestTurn || latestGoodAnswers.length < 2) { setError("통합 답변은 최근 질문에 AI 답변이 2개 이상 있어야 합니다."); return; }
    setError(""); setSynthOpen((current) => !current);
  }
  async function synthesize(providerId: string) {
    if (!activeConversation || !latestTurn || latestGoodAnswers.length < 2 || synthBusy) return;
    const conversationId = activeConversation.id; const turnId = latestTurn.id; setSynthOpen(false); setSynthBusy(true); setError("");
    try {
      const response = await fetch("/api/au-v2/synthesize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ originalPrompt: latestTurn.prompt, synthesizer: providerId, responses: latestGoodAnswers }) });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data?.error || "통합 답변 생성에 실패했습니다.");
      const finalAnswer = String(data.finalAnswer || "").trim(); if (!finalAnswer) throw new Error("통합 답변이 비어 있습니다.");
      setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, turns: item.turns.map((turn) => turn.id === turnId ? { ...turn, synthesis: finalAnswer, synthesizer: providerId } : turn), updatedAt: Date.now() } : item));
      window.setTimeout(() => synthesisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "통합 답변 생성에 실패했습니다."); } finally { setSynthBusy(false); }
  }

  return (
    <main className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-[#07101d] pt-[92px] text-[#f4f0e7]">
      <div className="fixed inset-x-0 top-0 z-[170] h-[92px] border-b border-[#d7b64d]/30 bg-[#07101d]/98 shadow-lg backdrop-blur">
        <div className="flex h-[42px] items-center gap-2 border-b border-white/10 px-3">
          <Link href="/" className="shrink-0 text-sm text-[#d7b64d]">← Australia</Link><h1 className="ml-8 shrink-0 text-xl font-semibold">RCA Room</h1>
          <div className="min-w-0 flex-1 text-center text-sm font-semibold">Royal Command Australia</div>
          <div className={`shrink-0 rounded-full border px-2 py-1 text-[10px] ${sessionReady ? "border-emerald-400/40 text-emerald-300" : "border-amber-400/40 text-amber-300"}`}>{sessionReady ? "Memory + AI Ready" : "Starting…"}</div>
        </div>
        <div className="flex h-[50px] w-full items-center gap-1 overflow-hidden px-2 py-1.5">
          {slots.map((id, index) => { const ai = CATALOG_BY_ID[id]; const available = isAvailable(id); const active = selected.includes(id) && available; return (
            <button key={`${id}-${index}`} type="button" onClick={() => toggleProvider(id)} disabled={!available} className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border-[3px] border-[#FFD700] px-1 font-[Times_New_Roman] text-[12px] text-[#FFD700] ${active ? "bg-[#7A0C2E] text-[#FFF3D6]" : "bg-[#1E3A8A]"} ${!available ? "opacity-35" : ""}`}>
              <span className="relative grid h-5 w-5 shrink-0 place-items-center rounded bg-black/20">{AI_LOGOS[id] ? <img src={AI_LOGOS[id]} alt="" className="h-4 w-4 object-contain" /> : null}<span className="absolute text-[8px] font-bold">{ai.shortName.slice(0, 1)}</span></span><span className="min-w-0 truncate [transform:scaleX(.8)]">{ai.shortName}</span>
            </button> ); })}
          <button type="button" onClick={() => { setSynthOpen(false); setWarehouseOpen(true); }} className="flex h-8 min-w-[116px] shrink-0 items-center justify-center gap-1 rounded-md border-[2px] border-[#FFD700]/80 bg-[#0b1524] px-3 text-[10px] font-semibold text-[#f4d66c]"><Warehouse size={14} />AI Warehouse</button>
          <div className="relative shrink-0">
            <button type="button" onClick={handleSynthesisButton} className={`h-8 min-w-[106px] rounded-md border-[2px] px-3 text-[10px] font-semibold ${latestGoodAnswers.length >= 2 && !busy ? "border-[#FFD700] bg-[#7A0C2E] text-[#FFF3D6]" : "border-white/15 bg-[#293342] text-white/40"}`}>{synthBusy ? "통합 중…" : "통합 답변 ▾"}</button>
            {synthOpen && <div className="absolute right-0 top-10 z-[220] max-h-72 w-52 overflow-y-auto rounded-xl border border-[#d7b64d]/50 bg-[#081321] p-2 shadow-2xl">{providers.filter((p) => p.available).map((p) => <button key={p.id} type="button" onClick={() => void synthesize(p.id)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">{p.name}</button>)}</div>}
          </div>
        </div>
      </div>

      <aside className="hidden h-full w-[245px] shrink-0 flex-col border-r border-[#d7b64d]/25 bg-[#081321] md:flex">
        <div className="border-b border-white/10 p-3"><button type="button" onClick={startNewChat} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#d7b64d]/50 bg-[#102033] text-sm font-semibold text-[#f4d66c]"><MessageSquarePlus size={16} />New Chat</button></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2"><div className="mb-2 px-2 text-[11px] uppercase tracking-wide text-white/40">Conversations</div><div className="space-y-1">{conversations.map((c) => <button key={c.id} type="button" onClick={() => { setActiveId(c.id); setError(""); setSynthOpen(false); }} className={`w-full rounded-lg border px-3 py-2 text-left ${c.id === activeId ? "border-[#d7b64d]/60 bg-[#14224D]" : "border-transparent hover:bg-white/5"}`}><span className="block truncate text-xs font-semibold">{c.title}</span><span className="mt-1 block text-[10px] text-white/35">{c.turns.length} turns</span></button>)}</div></div>
      </aside>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden"><section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0B1524]">
        <div ref={messagesViewportRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {!activeConversation?.turns.length && !busy && <div className="mx-auto mt-10 max-w-xl text-center"><Bot className="mx-auto text-[#d7b64d]" size={30} /><h2 className="mt-2 text-xl font-semibold">RCA Room</h2><p className="mt-2 text-sm text-white/50">RC Room의 익숙한 화면 + Australia 전용 AI·통합·메모리</p></div>}
          {activeConversation?.turns.map((turn, turnIndex) => <div key={turn.id} className="space-y-2">
            <div className="flex min-h-[33px] w-full items-center rounded-[7px] border-[3px] border-[#FFD700] bg-[#1E3A8A] px-[9px] text-white"><span className="mr-2 text-[10px] text-[#f4d66c]">Q{turnIndex + 1}</span><span className="text-[12px] leading-5">{turn.prompt}</span></div>
            {turn.answers.map((answer) => <article key={`${turn.id}-${answer.provider}`} className="rounded-[7px] border-2 border-[#2A3B6E] bg-[#14224D] px-4 py-3"><div className="mb-2 text-sm font-semibold text-[#f4d66c]">{CATALOG_BY_ID[answer.provider]?.shortName || answer.provider}</div><div className="whitespace-pre-wrap text-sm leading-6">{answer.error ? `⚠️ ${answer.error}` : answer.content}</div></article>)}
            {turn.synthesis && <article ref={turn.id === latestTurn?.id ? synthesisRef : undefined} className="rounded-[7px] border-[3px] border-[#FFD700] bg-[#132019] px-4 py-4"><div className="mb-2 text-sm font-semibold text-[#FFD700]">통합 답변 <span className="text-[10px] font-normal text-white/45">by {CATALOG_BY_ID[turn.synthesizer || ""]?.shortName || turn.synthesizer}</span></div><div className="whitespace-pre-wrap text-sm leading-6">{turn.synthesis}</div></article>}
          </div>)}
          {busy && <div className="rounded-lg border border-[#d7b64d]/20 bg-[#07101d] px-3 py-2 text-sm text-[#d7b64d]">Working: {selected.filter(isAvailable).map((id) => CATALOG_BY_ID[id]?.shortName || id).join(" + ")}…</div>}
        </div>
        <form onSubmit={send} className="shrink-0 border-t border-white/10 bg-[#0b1524]">{error && <div className="border-b border-red-400/20 bg-red-950/30 px-3 py-2 text-sm text-red-200">{error}</div>}<div className="border border-[#d7b64d]/30 bg-[#07101d] p-2"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={2000} rows={2} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Type your order…" className="block h-[64px] w-full resize-none overflow-y-auto bg-transparent px-2 py-2 text-base outline-none placeholder:text-[#7C8BC4]" /><div className="mt-1 flex h-[54px] items-center gap-2 border-t border-[#d7b64d]/35 px-2"><div className="text-xs text-white/40">Memory: {activeConversation?.turns.length || 0} turns saved</div><div className="flex-1" /><button type="submit" disabled={!prompt.trim() || busy || !sessionReady} className="flex h-10 items-center gap-2 rounded-xl bg-[#d7b64d] px-6 font-semibold text-[#111827] disabled:opacity-40"><Send size={17} />Send</button></div></div></form>
      </section></div>

      {warehouseOpen && <div className="fixed inset-0 z-[210] flex items-start justify-center bg-black/70 px-4 pt-[105px]" onClick={() => setWarehouseOpen(false)} role="presentation"><div className="flex max-h-[74vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#d7b64d]/50 bg-[#081321]" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-3 border-b border-white/10 px-4 py-3"><Warehouse size={20} className="text-[#d7b64d]" /><div className="font-semibold">AI Warehouse</div><button type="button" onClick={() => setWarehouseOpen(false)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-white/10"><X size={16} /></button></div><div className="border-b border-white/10 px-4 py-3"><div className="mb-2 flex gap-1 overflow-x-auto">{slots.map((id, index) => <button key={`${id}-${index}`} type="button" onClick={() => setReplaceSlot(index)} className={`shrink-0 rounded-md border px-2 py-1 text-[10px] ${replaceSlot === index ? "border-[#d7b64d] bg-[#d7b64d] text-[#111827]" : "border-white/10 bg-[#0b1524]"}`}>{index + 1}. {CATALOG_BY_ID[id]?.shortName}</button>)}</div><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8795]" /><input value={warehouseSearch} onChange={(e) => setWarehouseSearch(e.target.value)} placeholder="AI 검색..." className="h-10 w-full rounded-lg border border-white/10 bg-[#07101d] pl-9 pr-3 text-sm outline-none" /></div></div><div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">{filteredWarehouse.map((ai) => { const available = isAvailable(ai.id); const inSlots = slots.includes(ai.id); return <button key={ai.id} type="button" onClick={() => replaceWarehouseAI(ai.id)} className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left ${inSlots ? "border-[#d7b64d]/50 bg-[#d7b64d]/10" : "border-white/10 bg-[#0b1524]"}`}><span className="font-semibold">{ai.shortName}</span><span className="ml-auto text-[10px] text-white/40">{available ? "Connected" : "Not connected"}</span></button>; })}</div></div></div>}
    </main>
  );
}
