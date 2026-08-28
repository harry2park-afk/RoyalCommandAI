"use client";

import { useEffect, useState } from "react";

const PROVIDERS = ["openai", "anthropic", "google", "xai", "codex"] as const;
const BUILD_LANES = ["core", "domain", "country", "integrations"] as const;

type FactoryRoom = {
  roomId: string;
  manifestId: string;
  name: string;
  templateId: string;
  countryCode: string;
  languageTag: string;
  factoryVersion: string;
};

type ProgressItem = {
  stage: string;
  status: string;
  detail?: unknown;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function RoomFactoryFullTestPage() {
  const [rooms, setRooms] = useState<FactoryRoom[]>([]);
  const [roomId, setRoomId] = useState("");
  const [providers, setProviders] = useState<string[]>([...PROVIDERS]);
  const [goal, setGoal] = useState("Complete and verify this Factory-created Room baseline according to its Host-stored Room Factory manifest. Preserve all existing working features, tenant/customer isolation, Host-owned secrets, and safe-branch-only development. Make only genuinely necessary changes for the current Work Lane. Never merge or deploy generated Work to Production.");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [finalResult, setFinalResult] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRooms() {
      setLoadingRooms(true);
      try {
        const response = await fetch("/api/room-factory/rooms", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setProgress([{ stage: "load-rooms", status: "ERROR", detail: payload }]);
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

  function addProgress(item: ProgressItem) {
    setProgress((current) => [...current, item]);
  }

  function toggle(provider: string) {
    if (working) return;
    setProviders((current) => current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider]);
  }

  async function runBuildLane(workRecordId: string, laneId: (typeof BUILD_LANES)[number]) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      addProgress({ stage: laneId, status: attempt === 0 ? "RUNNING" : `REWORK_${attempt}` });
      const response = await fetch("/api/room-factory/run-lane", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, workRecordId, laneId, goal, leaseSeconds: 1800 }),
      });
      const payload = await response.json().catch(() => ({}));
      const execution = payload?.execution || {};
      const status = String(execution?.status || (response.ok ? "UNKNOWN" : "ERROR"));
      addProgress({ stage: laneId, status, detail: payload });

      if (response.ok && status === "PASS") return { ok: true, payload };
      if (response.ok && status === "FIX_REQUIRED" && attempt < 2) continue;
      return { ok: false, payload };
    }
    return { ok: false, payload: { error: "Rework limit reached." } };
  }

  async function waitForQa(workRecordId: string) {
    for (let poll = 1; poll <= 90; poll += 1) {
      const response = await fetch("/api/room-factory/qa-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, workRecordId, leaseSeconds: 900 }),
      });
      const payload = await response.json().catch(() => ({}));
      const status = String(payload?.status || (response.ok ? "UNKNOWN" : "ERROR"));

      if (response.ok && status === "PASS") {
        addProgress({ stage: "qa", status: "PASS", detail: payload });
        return { ok: true, payload };
      }
      if (response.ok && (status === "FIX_REQUIRED" || status === "BLOCKED")) {
        addProgress({ stage: "qa", status, detail: payload });
        return { ok: false, payload };
      }

      const waitable = [
        "WAITING_FOR_LANES",
        "WAITING_FOR_SAFE_BRANCH",
        "WAITING_FOR_PR",
        "WAITING_FOR_MERGEABILITY",
        "WAITING_FOR_QA_EVIDENCE",
      ].includes(status);
      if (response.status === 409 && waitable) {
        if (poll === 1 || poll % 3 === 0) addProgress({ stage: "qa", status: `${status} (${poll}/90)`, detail: payload });
        await sleep(10000);
        continue;
      }

      addProgress({ stage: "qa", status: "ERROR", detail: payload });
      return { ok: false, payload };
    }
    const timeout = { status: "QA_TIMEOUT", error: "QA evidence did not become ready within 15 minutes." };
    addProgress({ stage: "qa", status: "QA_TIMEOUT", detail: timeout });
    return { ok: false, payload: timeout };
  }

  async function runFullFactory() {
    if (!roomId || providers.length < 2 || working) return;
    setWorking(true);
    setProgress([]);
    setFinalResult(null);
    try {
      addProgress({ stage: "prepare", status: "RUNNING" });
      const prepareResponse = await fetch("/api/room-factory/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, providers }),
      });
      const preparation = await prepareResponse.json().catch(() => ({}));
      if (!prepareResponse.ok) {
        addProgress({ stage: "prepare", status: "ERROR", detail: preparation });
        setFinalResult({ status: "FAILED_AT_PREPARE", preparation });
        return;
      }
      const workRecordId = String(preparation?.preparation?.work_record_id || "");
      if (!workRecordId) {
        const error = { error: "Host did not return a Work Record ID.", preparation };
        addProgress({ stage: "prepare", status: "ERROR", detail: error });
        setFinalResult({ status: "FAILED_AT_PREPARE", ...error });
        return;
      }
      addProgress({ stage: "prepare", status: "PASS", detail: preparation });

      for (const laneId of BUILD_LANES) {
        const result = await runBuildLane(workRecordId, laneId);
        if (!result.ok) {
          setFinalResult({ status: `FAILED_AT_${laneId.toUpperCase()}`, workRecordId, result: result.payload, productionMergePerformed: false });
          return;
        }
      }

      addProgress({ stage: "qa", status: "WAITING_FOR_PR_CI_PREVIEW" });
      const qa = await waitForQa(workRecordId);
      setFinalResult({
        status: qa.ok ? "ROOM_FACTORY_FULL_TEST_PASS" : "ROOM_FACTORY_FULL_TEST_NOT_PASSED",
        roomId,
        workRecordId,
        qa: qa.payload,
        productionMergePerformed: false,
      });
    } finally {
      setWorking(false);
    }
  }

  const selectedRoom = rooms.find((room) => room.roomId === roomId);

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-[var(--gold)]/35 bg-black/25 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">Room Factory V1 · Full Host Runner</p>
        <h1 className="mt-2 text-3xl font-semibold">Prepare → 4 Build Lanes → PR/CI/Preview → Read-only QA</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">One click runs separate Host requests for each stage. A lane must PASS before the next lane starts. Generated work stays on the rc-work safe branch; this screen never merges or deploys it to Production.</p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">Factory-created Room</label>
              <select className="rc-input" value={roomId} onChange={(event) => setRoomId(event.target.value)} disabled={working || loadingRooms}>
                {!rooms.length && <option value="">{loadingRooms ? "Loading Factory Rooms…" : "No Factory-created Rooms found"}</option>}
                {rooms.map((room) => <option key={room.roomId} value={room.roomId}>{room.name} · {room.countryCode} · {room.templateId}</option>)}
              </select>
              {selectedRoom && <p className="mt-2 text-xs text-[var(--muted)]">{selectedRoom.roomId} · {selectedRoom.factoryVersion} · {selectedRoom.languageTag}</p>}
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">Developer AIs · first selected = sole Writer</div>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((provider) => (
                  <button key={provider} type="button" onClick={() => toggle(provider)} disabled={working} className={`rounded-xl border px-3 py-2 text-sm ${providers.includes(provider) ? "border-[var(--gold)] bg-[var(--gold)]/15" : "border-white/15 opacity-50"}`}>{provider}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Overall Factory Goal</label>
              <textarea className="rc-input min-h-44" value={goal} onChange={(event) => setGoal(event.target.value)} disabled={working} />
            </div>

            <button type="button" className="rc-btn rc-btn-primary" onClick={runFullFactory} disabled={working || !roomId || providers.length < 2 || goal.trim().length < 3}>
              {working ? "Room Factory running…" : "Run Full Factory Test"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="mb-3 text-sm font-semibold text-[var(--gold-soft)]">Host Progress</div>
            <div className="max-h-[560px] space-y-2 overflow-auto">
              {!progress.length && <p className="text-xs text-white/55">No Work started yet.</p>}
              {progress.map((item, index) => (
                <details key={`${item.stage}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3" open={index === progress.length - 1}>
                  <summary className="cursor-pointer text-xs font-semibold">{index + 1}. {item.stage.toUpperCase()} — {item.status}</summary>
                  {item.detail !== undefined && <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-white/65">{JSON.stringify(item.detail, null, 2)}</pre>}
                </details>
              ))}
            </div>
          </div>
        </div>

        <section className="mt-7 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="mb-2 text-sm font-semibold text-[var(--gold-soft)]">Final Host Result</div>
          <pre className="max-h-[700px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/80">{finalResult ? JSON.stringify(finalResult, null, 2) : "Not finished yet."}</pre>
        </section>
      </div>
    </main>
  );
}
