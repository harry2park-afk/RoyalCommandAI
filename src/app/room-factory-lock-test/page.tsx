"use client";

import { useState } from "react";

type LockEvidence = {
  lock_token?: string;
  resource_key?: string;
  owner_provider?: string;
  lease_expires_at?: string;
};

type LockResult = {
  action?: string;
  locks?: LockEvidence[];
  lockCount?: number;
  releasedCount?: number;
  executionStarted?: boolean;
  error?: unknown;
};

export default function RoomFactoryLockTestPage() {
  const [roomId, setRoomId] = useState("");
  const [workRecordId, setWorkRecordId] = useState("");
  const [laneId, setLaneId] = useState("core");
  const [working, setWorking] = useState(false);
  const [tokens, setTokens] = useState<string[]>([]);
  const [result, setResult] = useState<LockResult | null>(null);

  async function acquire() {
    if (!roomId.trim() || !workRecordId.trim() || !laneId.trim() || working) return;
    setWorking(true);
    setResult(null);
    try {
      const response = await fetch("/api/room-factory/locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "acquire",
          roomId: roomId.trim(),
          workRecordId: workRecordId.trim(),
          laneId: laneId.trim(),
          leaseSeconds: 900,
        }),
      });
      const payload = await response.json().catch(() => ({ error: "Invalid server response" }));
      setResult(payload);
      const nextTokens = Array.isArray(payload?.locks)
        ? payload.locks.map((lock: LockEvidence) => lock.lock_token).filter(Boolean) as string[]
        : [];
      setTokens(nextTokens);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Acquire failed" });
    } finally {
      setWorking(false);
    }
  }

  async function release() {
    if (!roomId.trim() || !workRecordId.trim() || !laneId.trim() || !tokens.length || working) return;
    setWorking(true);
    setResult(null);
    try {
      const response = await fetch("/api/room-factory/locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "release",
          roomId: roomId.trim(),
          workRecordId: workRecordId.trim(),
          laneId: laneId.trim(),
          lockTokens: tokens,
        }),
      });
      const payload = await response.json().catch(() => ({ error: "Invalid server response" }));
      setResult(payload);
      if (Number(payload?.releasedCount || 0) > 0) setTokens([]);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Release failed" });
    } finally {
      setWorking(false);
    }
  }

  const acquired = Boolean(result?.locks?.length) && result?.executionStarted === false;
  const released = Number(result?.releasedCount || 0) > 0 && result?.executionStarted === false;

  return (
    <main className="min-h-screen bg-[#07101d] px-4 py-8 text-[#f4f0e7] md:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="rounded-3xl border border-[#d7b64d]/35 bg-black/25 p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f1d889]">Royal Command · Persistent Resource Lock Test</p>
          <h1 className="mt-2 text-3xl font-semibold">Acquire / Release — Execution OFF</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">Use a Work Record ID created by the Persistent Plan test. Acquiring a lease proves Single Write Authority at the database level. No AI, code, tool or deployment execution is triggered.</p>
        </header>

        <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="grid gap-4">
            <Field label="Room ID" value={roomId} setValue={setRoomId} placeholder="Room UUID" />
            <Field label="Work Record ID" value={workRecordId} setValue={setWorkRecordId} placeholder="Prepared Work Record UUID" />
            <Field label="Lane ID" value={laneId} setValue={setLaneId} placeholder="core" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={acquire} disabled={working || !roomId.trim() || !workRecordId.trim()} className="min-h-12 rounded-xl bg-[#d7b64d] px-4 py-3 font-bold text-black disabled:opacity-40">{working ? "Working..." : "Acquire 15-Minute Lease"}</button>
            <button type="button" onClick={release} disabled={working || !tokens.length} className="min-h-12 rounded-xl border border-emerald-400/50 px-4 py-3 font-bold text-emerald-200 disabled:opacity-40">Release with Lock Token</button>
          </div>

          <p className="mt-3 text-xs leading-5 text-white/45">To test collision protection later, prepare a second Work for the same Room and try to acquire the same `core` resource while the first lease is active. The second acquisition must be rejected.</p>
        </section>

        {result ? (
          <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-[#f1d889]">Host Lock Evidence</h2>
              <span className={`rounded-full border px-3 py-1 text-xs ${acquired || released ? "border-emerald-400/40 text-emerald-200" : "border-amber-400/40 text-amber-200"}`}>{acquired ? "ACTIVE LEASE ACQUIRED" : released ? "LEASE RELEASED" : "CHECK RESULT"}</span>
            </div>
            {tokens.length ? <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-xs text-emerald-100">Lock token evidence captured for release: {tokens.length}</div> : null}
            <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-white/70">{JSON.stringify(result, null, 2)}</pre>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Field({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (value: string) => void; placeholder: string }) {
  return <label className="block text-sm font-semibold">{label}<input className="rc-input mt-2" value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} /></label>;
}
