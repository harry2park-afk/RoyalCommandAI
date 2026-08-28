"use client";

import { useState } from "react";
import type { AIProviderId } from "@/lib/ai/types";

const PROVIDERS: Array<{ id: AIProviderId; label: string }> = [
  { id: "openai", label: "ChatGPT" },
  { id: "anthropic", label: "Claude" },
  { id: "google", label: "Gemini" },
  { id: "xai", label: "Grok" },
  { id: "codex", label: "Codex" },
];

export default function RoomFactoryPlanTestPage() {
  const [roomId, setRoomId] = useState("");
  const [providers, setProviders] = useState<AIProviderId[]>(["openai", "anthropic"]);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  function toggle(provider: AIProviderId) {
    setProviders((current) => current.includes(provider)
      ? current.filter((item) => item !== provider)
      : [...current, provider]);
  }

  async function plan() {
    if (!roomId.trim() || !providers.length || working) return;
    setWorking(true);
    setResult(null);
    try {
      const response = await fetch("/api/room-factory/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: roomId.trim(), providers }),
      });
      const payload = await response.json().catch(() => ({ error: "Invalid server response" }));
      setResult(payload);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Planning request failed" });
    } finally {
      setWorking(false);
    }
  }

  const controlPlan = result?.controlPlan as Record<string, unknown> | undefined;
  const ready = controlPlan?.readyForExecutionPreparation === true;

  return (
    <main className="min-h-screen bg-[#07101d] px-4 py-8 text-[#f4f0e7] md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-[#d7b64d]/35 bg-black/25 p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f1d889]">Royal Command · RCA V2 Control Plan Test</p>
          <h1 className="mt-2 text-3xl font-semibold">Factory Manifest → Work Lanes</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">Enter a Room ID created by Room Factory. Only selected providers that are actually connected are eligible. The first eligible AI is Writer; the rest are Reviewers. This screen plans only and performs no code or production write.</p>
        </header>

        <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
          <label className="block text-sm font-semibold">Room ID
            <input className="rc-input mt-2" value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="Factory-created Room UUID" />
          </label>

          <div className="mt-5">
            <div className="text-sm font-semibold">Selected AI</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-5">
              {PROVIDERS.map((provider) => {
                const active = providers.includes(provider.id);
                return <button key={provider.id} type="button" onClick={() => toggle(provider.id)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${active ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-black/15 text-white/55"}`}>{provider.label}{active ? " ✓" : ""}</button>;
              })}
            </div>
          </div>

          <button type="button" onClick={plan} disabled={!roomId.trim() || !providers.length || working} className="mt-5 min-h-12 w-full rounded-xl bg-[#d7b64d] px-4 py-3 font-bold text-black disabled:opacity-40">
            {working ? "Validating..." : "Validate RCA V2 Control Plan"}
          </button>
        </section>

        {result ? (
          <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-[#f1d889]">Host Result</h2>
              <span className={`rounded-full border px-3 py-1 text-xs ${ready ? "border-emerald-400/40 text-emerald-200" : "border-amber-400/40 text-amber-200"}`}>{ready ? "READY FOR EXECUTION PREPARATION" : "NOT READY"}</span>
            </div>
            <pre className="mt-4 max-h-[620px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-white/75">{JSON.stringify(result, null, 2)}</pre>
          </section>
        ) : null}
      </div>
    </main>
  );
}
