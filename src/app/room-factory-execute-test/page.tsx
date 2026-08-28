"use client";

import { useState } from "react";

const PROVIDERS = ["openai", "anthropic", "google", "xai", "codex"] as const;

export default function RoomFactoryExecuteTestPage() {
  const [roomId, setRoomId] = useState("");
  const [providers, setProviders] = useState<string[]>([...PROVIDERS]);
  const [instruction, setInstruction] = useState("For this Core Work Lane, make one minimal, safe, clearly visible test-only improvement that demonstrates the Room Factory Host execution path. Preserve all existing features. Do not merge or deploy to Production.");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  function toggle(provider: string) {
    setProviders((current) => current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider]);
  }

  async function run() {
    if (!roomId.trim() || providers.length < 2 || working) return;
    setWorking(true);
    setResult(null);
    try {
      const prepareResponse = await fetch("/api/room-factory/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: roomId.trim(), providers }),
      });
      const preparation = await prepareResponse.json().catch(() => ({}));
      if (!prepareResponse.ok) {
        setResult({ stage: "prepare", ...preparation });
        return;
      }

      const workRecordId = preparation?.preparation?.work_record_id;
      if (!workRecordId) {
        setResult({ stage: "prepare", error: "Work Record ID was not returned.", preparation });
        return;
      }

      const executeResponse = await fetch("/api/room-factory/execute-lane", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: roomId.trim(),
          workRecordId,
          laneId: "core",
          instruction,
          leaseSeconds: 1800,
        }),
      });
      const execution = await executeResponse.json().catch(() => ({}));
      setResult({
        stage: "execute-core",
        prepareStatus: prepareResponse.status,
        executeStatus: executeResponse.status,
        preparation,
        execution,
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-[var(--gold)]/35 bg-black/25 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">Room Factory V1 · Host Execution Test</p>
        <h1 className="mt-2 text-3xl font-semibold">Prepared Lane → Lock → Relay → Commit Evidence → Review</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">This test creates a new Factory Work for an existing Factory-created Room, then executes only the Core lane on a safe Work-ID branch. Production merge/deploy remains off.</p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold">Factory-created Room ID</label>
            <input className="rc-input" value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold">Selected Connected Developer AIs · first selected = Writer</div>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((provider) => (
                <button key={provider} type="button" onClick={() => toggle(provider)} className={`rounded-xl border px-3 py-2 text-sm ${providers.includes(provider) ? "border-[var(--gold)] bg-[var(--gold)]/15" : "border-white/15 opacity-50"}`}>
                  {provider}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">At least 2 connected AIs are required: one Writer and one or more independent Reviewers.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Core Lane Test Instruction</label>
            <textarea className="rc-input min-h-32" value={instruction} onChange={(event) => setInstruction(event.target.value)} />
          </div>

          <button type="button" onClick={run} disabled={working || !roomId.trim() || providers.length < 2} className="rc-btn rc-btn-primary">
            {working ? "Running guarded execution…" : "Prepare & Execute Core Lane"}
          </button>
        </div>

        <section className="mt-7 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="mb-2 text-sm font-semibold text-[var(--gold-soft)]">Host Result</div>
          <pre className="max-h-[700px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/80">{result ? JSON.stringify(result, null, 2) : "No execution started yet."}</pre>
        </section>
      </div>
    </main>
  );
}
