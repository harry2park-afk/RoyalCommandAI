"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProviderInfo = { id: string; name: string; available: boolean; configured: boolean };
type ProviderResponse = { provider: string; content: string; latencyMs?: number; error?: string };

const PRIMARY_IDS = ["openai", "anthropic", "google", "xai"];

export default function AustraliaV2Client() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [synthOpen, setSynthOpen] = useState(false);
  const [testAccess, setTestAccess] = useState(false);
  const [accessBusy, setAccessBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<ProviderResponse[]>([]);
  const [lastPrompt, setLastPrompt] = useState("");
  const [synthesis, setSynthesis] = useState("");
  const warehouseRef = useRef<HTMLDivElement | null>(null);
  const synthRef = useRef<HTMLDivElement | null>(null);

  const available = useMemo(() => providers.filter((p) => p.available), [providers]);
  const primary = useMemo(
    () => PRIMARY_IDS.map((id) => providers.find((p) => p.id === id)).filter(Boolean) as ProviderInfo[],
    [providers],
  );
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
        const [providerRes, sessionRes] = await Promise.all([
          fetch("/api/ai/providers", { cache: "no-store" }),
          fetch("/api/au-v2/session", { cache: "no-store" }),
        ]);
        const providerData = await providerRes.json();
        const sessionData = await sessionRes.json().catch(() => ({}));
        const list: ProviderInfo[] = Array.isArray(providerData?.connectors) ? providerData.connectors : [];
        setProviders(list);
        const initial = PRIMARY_IDS.filter((id) => list.some((p) => p.id === id && p.available));
        setSelected(initial.length ? initial : list.filter((p) => p.available).slice(0, 1).map((p) => p.id));
        setTestAccess(Boolean(sessionData?.active));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Australia V2 준비에 실패했습니다.");
      }
    })();
  }, []);

  async function enterTestRoom() {
    if (accessBusy) return;
    setAccessBusy(true);
    setError("");
    try {
      const response = await fetch("/api/au-v2/enter", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "시험용 입장에 실패했습니다.");
      setTestAccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "시험용 입장에 실패했습니다.");
    } finally {
      setAccessBusy(false);
    }
  }

  function toggleProvider(id: string, closeWarehouse = false) {
    const provider = providers.find((p) => p.id === id);
    if (!provider?.available) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setError("");
    if (closeWarehouse) setWarehouseOpen(false);
  }

  function handleSynthesisButton() {
    setWarehouseOpen(false);
    if (!testAccess) {
      setError("먼저 ‘Australia V2 시험 입장’을 눌러 주세요.");
      return;
    }
    if (busy) {
      setError("현재 AI 작업이 끝난 뒤 통합할 수 있습니다.");
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
    if (!testAccess) {
      setError("먼저 ‘Australia V2 시험 입장’을 눌러 주세요.");
      return;
    }
    const active = selected.filter((id) => available.some((p) => p.id === id)).slice(0, 4);
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
      const response = await fetch("/api/au-v2/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, providers: active }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setTestAccess(false);
        throw new Error("시험 세션이 끝났습니다. 다시 시험 입장해 주세요.");
      }
      if (!response.ok) throw new Error(data?.error || "AI 실행에 실패했습니다.");
      setAnswers(Array.isArray(data?.responses) ? data.responses : []);
      setPrompt("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI 실행에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function synthesize(providerId: string) {
    if (!testAccess || goodAnswers.length < 2 || !lastPrompt || busy) return;
    setSynthOpen(false);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/au-v2/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalPrompt: lastPrompt,
          synthesizer: providerId,
          responses: goodAnswers,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setTestAccess(false);
        throw new Error("시험 세션이 끝났습니다. 다시 시험 입장해 주세요.");
      }
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
          <button onClick={handleSynthesisButton} className={`rounded-md border px-4 py-2 text-sm font-semibold ${goodAnswers.length >= 2 && testAccess && !busy ? "border-[#FFD700] bg-[#7A0C2E] text-[#FFF3D6]" : "border-white/15 bg-[#2d3642] text-white/45"}`}>통합 답변 ▾</button>
          {synthOpen && (
            <div className="absolute left-0 top-12 z-30 w-52 rounded-xl border border-[#d7b64d]/50 bg-[#081321] p-2 shadow-2xl">
              {available.slice(0, 25).map((p) => <button key={p.id} onClick={() => void synthesize(p.id)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">{p.name}</button>)}
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
        {!testAccess && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#35d07f]/40 bg-[#0e2118] p-4 text-sm">
            <span>기존 Royal Command 로그인 없이 이 시험 화면만 사용할 수 있습니다.</span>
            <button onClick={() => void enterTestRoom()} disabled={accessBusy} className="rounded-lg border border-[#35d07f] bg-[#126b3a] px-4 py-2 font-semibold text-white disabled:opacity-50">
              {accessBusy ? "입장 중…" : "Australia V2 시험 입장"}
            </button>
          </div>
        )}
        {testAccess && <div className="mb-4 rounded-xl border border-[#35d07f]/30 bg-[#0e2118] p-3 text-sm text-[#a8f0c8]">Australia V2 시험 세션 활성화 ✓ — 기존 RC Room 권한과 분리되어 있습니다.</div>}
        {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

        <div className="rounded-2xl border border-[#d7b64d]/30 bg-[#0b1524] p-4">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={2000} placeholder="질문을 입력하세요…" className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-[#07101d] p-4 text-base outline-none" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-white/55">선택 AI: {selected.map((id) => providers.find((p) => p.id === id)?.name || id).join(" + ") || "없음"}</div>
            <button onClick={() => void send()} disabled={!prompt.trim() || busy || !testAccess} className="rounded-xl bg-[#d7b64d] px-6 py-3 font-semibold text-[#111827] disabled:opacity-40">{busy ? "실행 중…" : "Send"}</button>
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
