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

export default function RoomFactoryPrepareTestPage() {
  const [roomId, setRoomId] = useState("");
  const [providers, setProviders] = useState<AIProviderId[]>(["openai", "anthropic"]);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  function toggle(provider: AIProviderId) {
    setProviders((current) => current.includes(provider)
      ? current.filter((item) => item !== provider)
      : [...current, provider]);
  }

  async function prepare() {
    if (!roomId.trim() || providers.length < 2 || working) return;
    setWorking(true);
    setResult(null);
    try {
      const response = await fetch("/api/room-factory/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: roomId.trim(), providers }),
      });
      const payload = await response.json().catch(() => ({ error: "Invalid server response" }));
      setResult(payload);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Preparation request failed" });
    } finally {
      setWorking(false);
    }
  }

  const preparation = result?.preparation as Record<string, unknown> | undefined;
  const prepared = Boolean(preparation?.work_record_id)
    && Number(preparation?.lane_count) === 5
    && result?.executionStarted === false
    && result?.activeLocksAcquired === false;

  return (
    <main className="min-h-screen bg-[#07101d] px-4 py-8 text-[#f4f0e7] md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-[#d7b64d]/35 bg-black/25 p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f1d889]">Royal Command · Persistent Plan Test</p>
          <h1 className="mt-2 text-3xl font-semibold">Prepare Work Lanes — No Execution</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">This stores a Host-validated Work record, five Work Lanes and planned Resource Locks. It does not acquire active Writer locks and does not run code, tools or deployment.</p>
        </header>

        <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
          <label className="block text-sm font-semibold">Factory-created Room ID
            <input className="rc-input mt-2" value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="Room UUID" />
          </label>

          <div className="mt-5">
            <div className="text-sm font-semibold">Selected AI — first connected AI becomes Writer</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-5">
              {PROVIDERS.map((provider) => {
                const active = providers.includes(provider.id);
                return <button key={provider.id} type="button" onClick={() => toggle(provider.id)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${active ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-black/15 text-white/55"}`}>{provider.label}{active ? " ✓" : ""}</button>;
              })}
            </div>
            <p className="mt-2 text-xs text-white/45">At least two selected and connected AIs are required: one Writer plus one independent Reviewer.</p>
          </div>

          <button type="button" onClick={prepare} disabled={!roomId.trim() || providers.length < 2 || working} className="mt-5 min-h-12 w-full rounded-xl bg-[#d7b64d] px-4 py-3 font-bold text-black disabled:opacity-40">
            {working ? "Preparing Host Records..." : "Prepare Persistent Work Plan"}
          </button>
        </section>

        {result ? (
          <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-[#f1d889]">Host Evidence</h2>
              <span className={`rounded-full border px-3 py-1 text-xs ${prepared ? "border-emerald-400/40 text-emerald-200" : "border-amber-400/40 text-amber-200"}`}>{prepared ? "PLAN PERSISTED — EXECUTION OFF" : "NOT PREPARED"}</span>
            </div>
            {prepared ? (
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <Evidence label="Work Record ID" value={String(preparation?.work_record_id || "")} />
                <Evidence label="Work ID" value={String(preparation?.work_id || "")} />
                <Evidence label="Work Lanes" value={String(preparation?.lane_count || "")} />
                <Evidence label="Planned Resource Locks" value={String(preparation?.planned_lock_count || "")} />
                <Evidence label="Execution Started" value="No" />
                <Evidence label="Active Locks Acquired" value="No" />
              </div>
            ) : null}
            <pre className="mt-4 max-h-[620px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-white/70">{JSON.stringify(result, null, 2)}</pre>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 p-3"><div className="text-[10px] uppercase tracking-wide text-white/45">{label}</div><div className="mt-1 break-all font-semibold">{value}</div></div>;
}
