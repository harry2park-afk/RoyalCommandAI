"use client";

import { useEffect, useState } from "react";

const PROVIDERS = ["openai", "anthropic", "google", "xai", "codex"] as const;

type FactoryRoom = {
  roomId: string;
  manifestId: string;
  name: string;
  status: string;
  factoryVersion: string;
  templateId: string;
  countryCode: string;
  languageTag: string;
  countryProfileStatus: string;
  createdAt: string;
};

export default function RoomFactoryExecuteTestPage() {
  const [rooms, setRooms] = useState<FactoryRoom[]>([]);
  const [roomId, setRoomId] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [providers, setProviders] = useState<string[]>([...PROVIDERS]);
  const [instruction, setInstruction] = useState("For this Core Work Lane, make one minimal, safe, clearly visible test-only improvement that demonstrates the Room Factory Host execution path. Preserve all existing features. Do not merge or deploy to Production.");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRooms() {
      setLoadingRooms(true);
      try {
        const response = await fetch("/api/room-factory/rooms", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setResult({ stage: "load-rooms", ...payload });
          return;
        }
        const nextRooms = Array.isArray(payload?.rooms) ? payload.rooms as FactoryRoom[] : [];
        setRooms(nextRooms);
        if (nextRooms.length) setRoomId((current) => current || nextRooms[0].roomId);
      } finally {
        if (!cancelled) setLoadingRooms(false);
      }
    }
    void loadRooms();
    return () => { cancelled = true; };
  }, []);

  function toggle(provider: string) {
    setProviders((current) => current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider]);
  }

  async function run() {
    if (!roomId || providers.length < 2 || working) return;
    setWorking(true);
    setResult({ stage: "starting", message: "Calling Host Factory APIs directly. RCA Room chat is not used." });
    try {
      const prepareResponse = await fetch("/api/room-factory/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, providers }),
      });
      const preparation = await prepareResponse.json().catch(() => ({}));
      if (!prepareResponse.ok) {
        setResult({ stage: "prepare", prepareStatus: prepareResponse.status, preparation });
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
          roomId,
          workRecordId,
          laneId: "core",
          instruction,
          leaseSeconds: 1800,
        }),
      });
      const execution = await executeResponse.json().catch(() => ({}));
      setResult({
        stage: "execute-core",
        hostRoute: "/api/room-factory/execute-lane",
        roomId,
        prepareStatus: prepareResponse.status,
        executeStatus: executeResponse.status,
        preparation,
        execution,
      });
    } finally {
      setWorking(false);
    }
  }

  const selectedRoom = rooms.find((room) => room.roomId === roomId);

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-[var(--gold)]/35 bg-black/25 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">Room Factory V1 · Direct Host Execution Test</p>
        <h1 className="mt-2 text-3xl font-semibold">Factory Room → Prepare → Lock → Writer → Commit Evidence → Review</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">This screen calls the Room Factory Host APIs directly. Do not copy the instruction into RCA Room chat. The result below is returned by the Host execution route, not generated as a normal AI chat answer.</p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold">Factory-created Room</label>
            <select className="rc-input" value={roomId} onChange={(event) => setRoomId(event.target.value)} disabled={loadingRooms || working}>
              {!rooms.length && <option value="">{loadingRooms ? "Loading Factory Rooms…" : "No Factory-created Rooms found"}</option>}
              {rooms.map((room) => (
                <option key={room.roomId} value={room.roomId}>{room.name} · {room.countryCode} · {room.templateId}</option>
              ))}
            </select>
            {selectedRoom && (
              <div className="mt-2 text-xs text-[var(--muted)]">
                Room ID: {selectedRoom.roomId} · Manifest: {selectedRoom.manifestId} · {selectedRoom.factoryVersion} · {selectedRoom.languageTag}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold">Selected Connected Developer AIs · first selected = Writer</div>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((provider) => (
                <button key={provider} type="button" onClick={() => toggle(provider)} disabled={working} className={`rounded-xl border px-3 py-2 text-sm ${providers.includes(provider) ? "border-[var(--gold)] bg-[var(--gold)]/15" : "border-white/15 opacity-50"}`}>
                  {provider}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">At least 2 connected AIs are required. The first selected provider is the only Writer; all others are independent Reviewers.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Core Lane Test Instruction</label>
            <textarea className="rc-input min-h-32" value={instruction} onChange={(event) => setInstruction(event.target.value)} disabled={working} />
          </div>

          <button type="button" onClick={run} disabled={working || !roomId || providers.length < 2} className="rc-btn rc-btn-primary">
            {working ? "Running Real Host Execution…" : "Run Real Host Core Test"}
          </button>
        </div>

        <section className="mt-7 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="mb-2 text-sm font-semibold text-[var(--gold-soft)]">Host Result — authoritative</div>
          <pre className="max-h-[700px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/80">{result ? JSON.stringify(result, null, 2) : "No Host execution started yet."}</pre>
        </section>
      </div>
    </main>
  );
}
