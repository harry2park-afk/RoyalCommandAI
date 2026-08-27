"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type ProviderInfo = { id: string; name: string; available: boolean; configured: boolean };
type ProviderResponse = { provider: string; content: string; latencyMs?: number; error?: string };
type RoomSummary = { id?: unknown; name?: unknown };
type StreamEvent =
  | { type: "provider"; provider: string; name: string; content: string; error?: string }
  | { type: "final"; result: { responses?: ProviderResponse[]; finalAnswer?: string } }
  | { type: "error"; error: string };

const PRIMARY_IDS = ["openai", "anthropic", "google", "xai"];
const ROOM_NAME = "Australia V2 Test Room";

export default function AustraliaV2Client() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [synthOpen, setSynthOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<ProviderResponse[]>([]);
  const [lastPrompt, setLastPrompt] = useState("");
  const [synthesis, setSynthesis] = useState("");
  const warehouseRef = useRef<HTMLDivElement | null>(null);
  const synthRef = useRef<HTMLDivElement | null>(null);

  const available = useMemo(() => providers.filter((p) => p.available), [providers]);
  const primary = useMemo(() => PRIMARY_IDS.map((id) => providers.find((p) => p.id === id)).filter(Boolean) as ProviderInfo[], [providers]);
  const goodAnswers = useMemo(() => answers.filter((a) => !a.error && a.content?.trim()), [answers]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (warehouseOpen && target && !warehouseRef.current?.contains(target)) setWarehouseOpen(false);
      if (synthOpen && target && !synthRef.current?.contains(target)) setSynthOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [warehouseOpen, synthOpen]);

  useEffect(() => {
    void (async () => {
      try {
        const providerRes = await fetch("/api/ai/providers", { cache: "no-store" });
        const providerData = await providerRes.json();
        const list: ProviderInfo[] = Array.isArray(providerData?.connectors) ? providerData.connectors : [];
        setProviders(list);
        const initial = PRIMARY_IDS.filter((id) => list.some((p) => p.id === id && p.available));
        setSelected(initial.length ? initial : list.filter((p) => p.available).slice(0, 1).map((p) => p.id));

        const roomsRes = await fetch("/api/rooms", { cache: "no-store" });
        if (roomsRes.status === 401) {
          setNeedsLogin(true);
          return;
        }
        const roomsData = await roomsRes.json();
        if (!roomsRes.ok) throw new Error(roomsData?.error || "Room list could not be loaded.");
        const existing = Array.isArray(roomsData?.rooms)
          ? (roomsData.rooms as RoomSummary[]).find((room) => String(room?.name || "") === ROOM_NAME)
          : null;
        if (existing?.id) {
          setRoomId(String(existing.id));
          return;
        }

        const createRes = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: ROOM_NAME, description: "Isolated Australia V2 functional test room" }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData?.error || "Australia V2 room could not be created.");
        if (createData?.room?.id) setRoomId(String(createData.room.id));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Setup failed.");
      }
    })();
  }, []);

  function toggleProvider(id: string, closeWarehouse = false) {
    const provider = providers.find((p) => p.id === id);
    if (!provider?.available) return;
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setError("");
    if (closeWarehouse) setWarehouseOpen(false);
  }

  function handleSynthesisButton() {
    setWarehouseOpen(false);
    if (busy) {
      setError("현재 AI 작업이 끝난 뒤 통합할 수 있습니다.");
      return;
    }
    if (needsLogin) {
      setError("실제 통합 답변을 사용하려면 먼저 로그인해 주세요.");
      return;
    }
    if (goodAnswers.length < 2) {
      setError("통합 답변은 AI 답변이 2개 이상 나온 뒤 사용할 수 있습니다.");
      return;
    }
    setError("");
    setSynthOpen((value) => !value);
  }

  async function send() {
    const text = prompt.trim();
    if (!text || busy) return;
    setWarehouseOpen(false);
    setSynthOpen(false);
    if (!roomId) {
      setError(needsLogin ? "먼저 로그인해 주세요." : "Australia V2 Room을 준비하는 중입니다.");
      return;
    }
    const active = selected.filter((id) => available.some((p) => p.id === id));
    if (!active.length) {
      setError("AI를 한 개 이상 선택해 주세요.");
      return;
    }

    setBusy(true);
    setError("");
    setAnswers([]);
    setSynthesis("");
    setLastPrompt(text);
    try {
      const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, prompt: text, language: "ko", providers: active }),
      });
      if (response.status === 401) {
        setNeedsLogin(true);
        throw new Error("먼저 로그인해 주세요.");
      }
      if (!response.ok || !response.body) {
        const failed = await response.json().catch(() => ({}));
        throw new Error(failed?.error || "AI 실행에 실패했습니다.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const latest = new Map<string, ProviderResponse>();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "provider") {
            latest.set(event.provider, { provider: event.provider, content: event.content || "", error: event.error });
            setAnswers(Array.from(latest.values()));
          } else if (event.type === "error") {
            setError(event.error);
          } else if (event.type === "final" && Array.isArray(event.result?.responses)) {
            setAnswers(event.result.responses);
          }
        }
      }
      if (buffer.trim()) {
        const event = JSON.parse(buffer) as StreamEvent;
        if (event.type === "final" && Array.isArray(event.result?.responses)) setAnswers(event.result.responses);
      }
      setPrompt("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI 실행에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function synthesize(providerId: string) {
    if (!roomId || goodAnswers.length < 2 || !lastPrompt) return;
    setSynthOpen(false);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          originalPrompt: lastPrompt,
          language: "ko",
          synthesizer: providerId,
          responses: goodAnswers,
        }),
      });
      if (response.status === 401) {
        setNeedsLogin(true);
        throw new Error("먼저 로그인해 주세요.");
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "통합 답변 생성에 실패했습니다.");
      setSynthesis(String(data.finalAnswer || ""));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "통합 답변 생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07101d] text-[#f4f0e7]">
      <header className="border-b border-[#d7b64d]/35 bg-[#20392f] px-5 py-4">
        <div className="text-2xl font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>
          Royal Command AI — Australia V2 Test Room
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-3 border-b border-[#d7b64d]/25 bg-[#20392f] px-5 py-3">
        <div ref={warehouseRef} className="relative">
          <button onClick={() => { setSynthOpen(false); setWarehouseOpen((v) => !v); }} className="rounded-md border border-[#FFD700] bg-[#0b1524] px-4 py-2 text-sm text-[#FFD700]">AI Warehouse</button>
          {warehouseOpen && (
            <div className="absolute left-0 top-12 z-30 max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-[#d7b64d]/50 bg-[#081321] p-2 shadow-2xl">
              {providers.map((p) => {
                const active = selected.includes(p.id) && p.available;
                return (
                  <button key={p.id} onClick={() => toggleProvider(p.id, true)} disabled={!p.available} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${active ? "bg-[#126b3a] text-white" : "text-white/45 hover:bg-white/10 hover:text-white/80"} disabled:cursor-not-allowed disabled:opacity-25`}>
                    <span>{p.name}</span><span>{active ? "✓" : p.available ? "+" : "미연결"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div ref={synthRef} className="relative">
          <button onClick={handleSynthesisButton} className={`rounded-md border px-4 py-2 text-sm font-semibold ${goodAnswers.length >= 2 && !needsLogin && !busy ? "border-[#FFD700] bg-[#7A0C2E] text-[#FFF3D6]" : "border-white/15 bg-[#2d3642] text-white/45"}`}>통합 답변 ▾</button>
          {synthOpen && (
            <div className="absolute left-0 top-12 z-30 w-52 rounded-xl border border-[#d7b64d]/50 bg-[#081321] p-2 shadow-2xl">
              {available.map((p) => <button key={p.id} onClick={() => void synthesize(p.id)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">{p.name}</button>)}
            </div>
          )}
        </div>

        {primary.map((p) => {
          const active = selected.includes(p.id) && p.available;
          return (
            <button key={p.id} onClick={() => toggleProvider(p.id)} disabled={!p.available} className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${active ? "border-[#35d07f] bg-[#126b3a] text-white shadow-[0_0_10px_rgba(53,208,127,.18)]" : "border-white/15 bg-[#2d3642]/60 text-white/35"} disabled:cursor-not-allowed disabled:opacity-20`}>
              {p.name} {active ? "✓" : ""}
            </button>
          );
        })}
      </section>

      <section className="mx-auto max-w-6xl px-5 py-6">
        {needsLogin && (
          <div className="mb-4 rounded-xl border border-[#d7b64d]/40 bg-[#111827] p-4 text-sm">
            실제 AI를 사용하려면 이 호주 도메인에서 한 번 로그인해야 합니다. <Link href="/login?next=/au-v2" className="ml-2 font-semibold text-[#FFD700] underline">로그인</Link>
          </div>
        )}
        {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

        <div className="rounded-2xl border border-[#d7b64d]/30 bg-[#0b1524] p-4">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="질문을 입력하세요…" className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-[#07101d] p-4 text-base outline-none" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-white/55">선택 AI: {selected.map((id) => providers.find((p) => p.id === id)?.name || id).join(" + ") || "없음"}</div>
            <button onClick={() => void send()} disabled={!prompt.trim() || busy || needsLogin} className="rounded-xl bg-[#d7b64d] px-6 py-3 font-semibold text-[#111827] disabled:opacity-40">{busy ? "실행 중…" : "Send"}</button>
          </div>
        </div>

        {answers.length > 0 && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {answers.map((a) => {
              const name = providers.find((p) => p.id === a.provider)?.name || a.provider;
              return <article key={a.provider} className="rounded-2xl border border-[#2A3B6E] bg-[#14224D] p-4"><h2 className="mb-2 font-semibold text-[#f4d66c]">{name}</h2><div className="whitespace-pre-wrap text-sm leading-6">{a.error ? `⚠️ ${a.error}` : a.content}</div></article>;
            })}
          </div>
        )}

        {synthesis && (
          <article className="mt-5 rounded-2xl border-2 border-[#FFD700] bg-[#132019] p-5">
            <h2 className="mb-3 text-lg font-semibold text-[#FFD700]">통합 답변</h2>
            <div className="whitespace-pre-wrap text-sm leading-6">{synthesis}</div>
          </article>
        )}
      </section>
    </main>
  );
}
