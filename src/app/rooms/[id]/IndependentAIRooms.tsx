"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Check, ChevronDown, Languages, Menu, MessageSquare, Send, X } from "lucide-react";

type ProviderId = "openai" | "anthropic" | "google" | "xai" | "codex";
type ChatItem = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
type ProviderInfo = { id: string; name: string; available: boolean; configured: boolean };
type ProviderResult = {
  requestId: string;
  provider: ProviderId;
  providerName: string;
  content: string;
  model?: string;
  latencyMs?: number;
  error?: string | null;
  receipt?: { requestId: string; provider: string; terminal: boolean; completedAt: string };
};

type RoomState = {
  history: ChatItem[];
  loading: boolean;
  error: string;
  lastLatency?: number;
};

const PROVIDERS: Array<{ id: ProviderId; name: string; role: string }> = [
  { id: "openai", name: "ChatGPT", role: "Independent AI Room" },
  { id: "anthropic", name: "Claude", role: "Independent AI Room" },
  { id: "google", name: "Gemini", role: "Independent AI Room" },
  { id: "xai", name: "Grok", role: "Independent AI Room" },
  { id: "codex", name: "Codex", role: "Independent AI Room" },
];

const EMPTY: RoomState = { history: [], loading: false, error: "" };

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function historyKey(roomId: string, provider: ProviderId) {
  return `royalcommand:independent-ai:v1:${roomId}:${provider}:history`;
}

function selectedKey(roomId: string) {
  return `royalcommand:independent-ai:v1:${roomId}:selected`;
}

function latestPreview(history: ChatItem[]) {
  const last = [...history].reverse().find((item) => item.content.trim());
  return last?.content.replace(/\s+/g, " ").slice(0, 92) || "No conversation yet";
}

export default function IndependentAIRooms() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<ProviderId[]>(["openai"]);
  const [rooms, setRooms] = useState<Record<ProviderId, RoomState>>({
    openai: { ...EMPTY }, anthropic: { ...EMPTY }, google: { ...EMPTY }, xai: { ...EMPTY }, codex: { ...EMPTY },
  });
  const [openRoom, setOpenRoom] = useState<ProviderId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState("ko");
  const [roomPrompt, setRoomPrompt] = useState("");
  const [allPrompt, setAllPrompt] = useState("");
  const [frozenResults, setFrozenResults] = useState<Record<string, ProviderResult>>({});
  const [frozenQuestion, setFrozenQuestion] = useState("");
  const [integrated, setIntegrated] = useState("");
  const [integrating, setIntegrating] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const aborters = useRef(new Map<string, AbortController>());
  const executionGeneration = useRef(0);

  useEffect(() => {
    void fetch("/api/ai/providers", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const ids = new Set<string>((data?.connectors || []).filter((p: ProviderInfo) => p.available).map((p: ProviderInfo) => p.id));
        setConnected(ids);
        setSelected((current) => current.filter((id) => ids.has(id)).length ? current.filter((id) => ids.has(id)) : PROVIDERS.filter((p) => ids.has(p.id)).slice(0, 1).map((p) => p.id));
      })
      .catch(() => setGlobalError("AI provider status could not be loaded."));

    const next = { openai: { ...EMPTY }, anthropic: { ...EMPTY }, google: { ...EMPTY }, xai: { ...EMPTY }, codex: { ...EMPTY } } as Record<ProviderId, RoomState>;
    for (const provider of PROVIDERS) {
      try {
        const saved = JSON.parse(localStorage.getItem(historyKey(roomId, provider.id)) || "[]") as ChatItem[];
        next[provider.id] = { ...EMPTY, history: Array.isArray(saved) ? saved.slice(-120) : [] };
      } catch {}
    }
    setRooms(next);
    try {
      const savedSelected = JSON.parse(localStorage.getItem(selectedKey(roomId)) || "[]") as ProviderId[];
      if (savedSelected.length) setSelected(savedSelected.filter((id) => PROVIDERS.some((p) => p.id === id)));
    } catch {}
  }, [roomId]);

  useEffect(() => {
    localStorage.setItem(selectedKey(roomId), JSON.stringify(selected));
  }, [roomId, selected]);

  useEffect(() => {
    for (const provider of PROVIDERS) {
      localStorage.setItem(historyKey(roomId, provider.id), JSON.stringify(rooms[provider.id].history.slice(-120)));
    }
  }, [roomId, rooms]);

  useEffect(() => () => {
    aborters.current.forEach((controller) => controller.abort());
    aborters.current.clear();
  }, []);

  const selectedConnected = useMemo(() => selected.filter((id) => connected.has(id)), [selected, connected]);
  const frozenList = useMemo(() => selectedConnected.map((id) => frozenResults[id]).filter(Boolean), [selectedConnected, frozenResults]);
  const canIntegrate = Boolean(frozenQuestion && frozenList.length && frozenList.length === selectedConnected.length && selectedConnected.every((id) => frozenResults[id]?.receipt?.terminal));

  function setProviderState(provider: ProviderId, patch: Partial<RoomState>) {
    setRooms((prev) => ({ ...prev, [provider]: { ...prev[provider], ...patch } }));
  }

  function append(provider: ProviderId, item: ChatItem) {
    setRooms((prev) => ({ ...prev, [provider]: { ...prev[provider], history: [...prev[provider].history, item].slice(-120) } }));
  }

  function toggleSelected(provider: ProviderId) {
    if (!connected.has(provider)) return;
    setSelected((prev) => prev.includes(provider) ? prev.filter((id) => id !== provider) : [...prev, provider]);
  }

  async function askProvider(provider: ProviderId, prompt: string, selectedSet: ProviderId[], generation: number) {
    if (!connected.has(provider)) return null;
    const requestId = uid(`${provider}-request`);
    const controller = new AbortController();
    aborters.current.set(provider, controller);
    setProviderState(provider, { loading: true, error: "" });
    append(provider, { id: uid("user"), role: "user", content: prompt, createdAt: new Date().toISOString() });

    try {
      const history = rooms[provider].history.slice(-24).map((item) => ({ role: item.role, content: item.content }));
      const res = await fetch("/api/ai/independent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ requestId, provider, selectedProviders: selectedSet, prompt, language, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (generation !== executionGeneration.current) return null;
      if (!res.ok || data?.error) throw new Error(data?.error || "AI request failed");
      const result = data as ProviderResult;
      append(provider, { id: uid("assistant"), role: "assistant", content: result.content, createdAt: new Date().toISOString() });
      setProviderState(provider, { loading: false, error: "", lastLatency: result.latencyMs });
      return result;
    } catch (error) {
      if (controller.signal.aborted || generation !== executionGeneration.current) return null;
      const message = error instanceof Error ? error.message : "AI request failed";
      setProviderState(provider, { loading: false, error: message });
      return { requestId, provider, providerName: PROVIDERS.find((p) => p.id === provider)?.name || provider, content: "", error: message } as ProviderResult;
    } finally {
      aborters.current.delete(provider);
      setProviderState(provider, { loading: false });
    }
  }

  async function submitSingle(e?: FormEvent) {
    e?.preventDefault();
    if (!openRoom || !roomPrompt.trim()) return;
    const prompt = roomPrompt.trim();
    setRoomPrompt("");
    const generation = ++executionGeneration.current;
    await askProvider(openRoom, prompt, [openRoom], generation);
  }

  async function submitSelected(e?: FormEvent) {
    e?.preventDefault();
    const prompt = allPrompt.trim();
    const target = selectedConnected;
    if (!prompt || !target.length) return;
    aborters.current.forEach((controller) => controller.abort());
    aborters.current.clear();
    const generation = ++executionGeneration.current;
    setFrozenQuestion(prompt);
    setFrozenResults({});
    setIntegrated("");
    setGlobalError("");
    const snapshot = [...target];
    setAllPrompt("");

    await Promise.all(snapshot.map(async (provider) => {
      const result = await askProvider(provider, prompt, snapshot, generation);
      if (!result || generation !== executionGeneration.current) return;
      setFrozenResults((prev) => ({ ...prev, [provider]: Object.freeze({ ...result }) }));
    }));
  }

  function cancelAll() {
    executionGeneration.current += 1;
    aborters.current.forEach((controller) => controller.abort());
    aborters.current.clear();
    setRooms((prev) => Object.fromEntries(Object.entries(prev).map(([key, value]) => [key, { ...value, loading: false }])) as Record<ProviderId, RoomState>);
  }

  async function integrate() {
    if (!canIntegrate || integrating) return;
    setIntegrating(true);
    setGlobalError("");
    try {
      const res = await fetch("/api/ai/integrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: uid("integration"), prompt: frozenQuestion, language, frozenResults: frozenList }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) throw new Error(data?.error || "Integration failed");
      setIntegrated(String(data.content || ""));
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Integration failed");
    } finally {
      setIntegrating(false);
    }
  }

  const openMeta = PROVIDERS.find((provider) => provider.id === openRoom);

  return (
    <main className="min-h-[100dvh] bg-[#07101d] text-[#f4f0e7]">
      <header className="sticky top-0 z-50 border-b border-[#d7b64d]/25 bg-[#07101d]/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <button onClick={() => { setMenuOpen((v) => !v); setChatsOpen(false); setLanguageOpen(false); }} className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0b1524] px-3 py-2 text-sm"><Menu size={16}/>Menu</button>
          <button onClick={() => { setChatsOpen((v) => !v); setMenuOpen(false); setLanguageOpen(false); }} className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0b1524] px-3 py-2 text-sm"><MessageSquare size={16}/>Chats</button>
          <div className="relative">
            <button onClick={() => { setLanguageOpen((v) => !v); setMenuOpen(false); setChatsOpen(false); }} className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0b1524] px-3 py-2 text-sm"><Languages size={16}/>{language === "ko" ? "한국어" : "English"}<ChevronDown size={14}/></button>
            {languageOpen && <div className="absolute left-0 top-11 min-w-36 rounded-lg border border-white/15 bg-[#0b1524] p-1 shadow-2xl"><button className="block w-full rounded px-3 py-2 text-left hover:bg-white/10" onClick={() => { setLanguage("ko"); setLanguageOpen(false); }}>한국어</button><button className="block w-full rounded px-3 py-2 text-left hover:bg-white/10" onClick={() => { setLanguage("en"); setLanguageOpen(false); }}>English</button></div>}
          </div>
          <div className="ml-auto text-right"><div className="font-serif text-lg text-[#f1d77a]">Royal Command AI</div><div className="text-[10px] uppercase tracking-[.22em] text-[#8d98a8]">Independent Rooms V1</div></div>
        </div>
        {menuOpen && <div className="absolute left-3 top-14 z-50 w-56 rounded-xl border border-white/15 bg-[#0b1524] p-2 shadow-2xl"><div className="px-3 py-2 text-xs uppercase tracking-wider text-[#8d98a8]">Workspace</div><button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10" onClick={() => setMenuOpen(false)}>Independent AI Rooms</button><button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10" onClick={() => { setOpenRoom(null); setMenuOpen(false); }}>All AI Cards</button></div>}
        {chatsOpen && <div className="absolute left-24 top-14 z-50 w-72 max-h-[70vh] overflow-y-auto rounded-xl border border-white/15 bg-[#0b1524] p-2 shadow-2xl">{PROVIDERS.map((provider) => <button key={provider.id} onClick={() => { setOpenRoom(provider.id); setChatsOpen(false); }} className="mb-1 block w-full rounded-lg border border-white/10 p-3 text-left hover:bg-white/10"><div className="font-semibold">{provider.name}</div><div className="mt-1 truncate text-xs text-[#9ca6b4]">{latestPreview(rooms[provider.id].history)}</div></button>)}</div>}
      </header>

      <div className="mx-auto w-full max-w-[1800px] p-3 sm:p-4">
        {globalError && <div className="mb-3 rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">{globalError}</div>}

        {!openRoom ? (
          <>
            <section className="mb-4 rounded-xl border border-white/10 bg-[#0b1524] p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2"><div className="mr-auto"><h2 className="text-lg font-semibold">Ask selected AIs independently</h2><p className="text-xs text-[#94a0af]">Each selected provider receives the same question. No provider can see another provider&apos;s result before freeze.</p></div><button onClick={cancelAll} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/10">Cancel active</button></div>
              <form onSubmit={submitSelected} className="flex gap-2"><textarea value={allPrompt} onChange={(e) => setAllPrompt(e.target.value)} className="min-h-20 flex-1 resize-y rounded-xl border border-white/10 bg-[#07101d] p-3 outline-none focus:border-[#d7b64d]/60" placeholder="Ask the selected AI rooms..."/><button disabled={!selectedConnected.length} className="self-end rounded-xl border border-[#d7b64d]/50 bg-[#1e3a8a] px-4 py-3 font-semibold text-[#f8df7a] disabled:opacity-40"><Send size={17}/></button></form>
            </section>

            <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {PROVIDERS.map((provider) => {
                const room = rooms[provider.id];
                const available = connected.has(provider.id);
                const active = selected.includes(provider.id) && available;
                return <article key={provider.id} className={`rounded-2xl border p-4 shadow-lg ${active ? "border-[#d7b64d]/70 bg-[#10223f]" : "border-white/10 bg-[#0b1524]"}`}>
                  <div className="flex items-start gap-3"><button type="button" onClick={() => toggleSelected(provider.id)} disabled={!available} className={`mt-0.5 grid h-6 w-6 place-items-center rounded border ${active ? "border-[#d7b64d] bg-[#d7b64d] text-[#07101d]" : "border-white/25"} disabled:opacity-30`}>{active ? <Check size={15}/> : null}</button><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-lg font-semibold">{provider.name}</h3><span className={`h-2 w-2 rounded-full ${available ? "bg-emerald-400" : "bg-slate-600"}`}/></div><p className="text-xs text-[#93a0af]">{provider.role}</p></div></div>
                  <p className="mt-4 min-h-10 text-sm text-[#c8d0dc]">{latestPreview(room.history)}</p>
                  <div className="mt-4 flex items-center gap-2 text-[11px] text-[#8e99a8]"><span>{room.loading ? "Working…" : room.error ? "Error" : available ? "Connected" : "Not connected"}</span>{room.lastLatency ? <span>· {Math.round(room.lastLatency)} ms</span> : null}</div>
                  <button onClick={() => setOpenRoom(provider.id)} className="mt-3 w-full rounded-lg border border-white/15 bg-[#07101d] px-3 py-2 text-sm font-semibold hover:border-[#d7b64d]/50">Open</button>
                </article>;
              })}

              <article className="rounded-2xl border border-[#7a5b18]/60 bg-[#17130a] p-4 shadow-lg"><div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold text-[#f0d36a]">Final Integrator</h3><p className="text-xs text-[#a59a76]">Read-only · Frozen results only</p></div><span className={`h-2 w-2 rounded-full ${canIntegrate ? "bg-emerald-400" : "bg-slate-600"}`}/></div><p className="mt-4 min-h-10 text-sm text-[#d6cfb5]">{integrated ? integrated.slice(0, 120) : canIntegrate ? `${frozenList.length} frozen results ready.` : "Ask selected AIs first. Integration cannot start before freeze."}</p><button disabled={!canIntegrate || integrating} onClick={integrate} className="mt-3 w-full rounded-lg border border-[#d7b64d]/40 bg-[#2a2109] px-3 py-2 text-sm font-semibold text-[#f0d36a] disabled:opacity-35">{integrating ? "Integrating…" : "Create integrated answer"}</button>{integrated && <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6">{integrated}</div>}</article>
            </section>
          </>
        ) : (
          <section className="mx-auto flex min-h-[calc(100dvh-86px)] max-w-5xl flex-col rounded-2xl border border-white/10 bg-[#0b1524] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 p-3"><button onClick={() => setOpenRoom(null)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 hover:bg-white/10"><X size={17}/></button><div><h2 className="text-xl font-semibold">{openMeta?.name}</h2><p className="text-xs text-[#8f9baa]">Strict isolated provider room · other AI rooms are not visible here</p></div><span className={`ml-auto h-2.5 w-2.5 rounded-full ${openRoom && connected.has(openRoom) ? "bg-emerald-400" : "bg-slate-600"}`}/></div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">{rooms[openRoom].history.length ? rooms[openRoom].history.map((item) => <div key={item.id} className={`max-w-[88%] whitespace-pre-wrap rounded-xl border px-3 py-2 text-sm leading-6 ${item.role === "user" ? "ml-auto border-[#d7b64d]/35 bg-[#1e3a8a]" : "mr-auto border-white/10 bg-[#07101d]"}`}>{item.content}</div>) : <div className="py-20 text-center text-[#8d99a8]">Start a private conversation with {openMeta?.name}. Only this provider&apos;s history is sent.</div>}{rooms[openRoom].loading && <div className="text-sm text-[#f0d36a]">{openMeta?.name} is working…</div>}{rooms[openRoom].error && <div className="rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{rooms[openRoom].error}</div>}</div>
            <form onSubmit={submitSingle} className="border-t border-white/10 p-3"><div className="flex gap-2"><textarea value={roomPrompt} onChange={(e) => setRoomPrompt(e.target.value)} className="min-h-20 flex-1 resize-y rounded-xl border border-white/10 bg-[#07101d] p-3 outline-none focus:border-[#d7b64d]/60" placeholder={`Message ${openMeta?.name} only...`}/><button disabled={!openRoom || !connected.has(openRoom) || rooms[openRoom].loading} className="self-end rounded-xl border border-[#d7b64d]/50 bg-[#1e3a8a] px-4 py-3 text-[#f8df7a] disabled:opacity-35"><Send size={17}/></button></div></form>
          </section>
        )}
      </div>
    </main>
  );
}
