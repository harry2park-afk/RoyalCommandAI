"use client";

import { useEffect, useState } from "react";

type FactoryRoom = {
  roomId: string;
  name: string;
  templateId: string;
  countryCode: string;
  languageTag: string;
  factoryVersion: string;
};

export default function RoomFactoryResumePage() {
  const [rooms, setRooms] = useState<FactoryRoom[]>([]);
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRooms() {
      try {
        const response = await fetch("/api/room-factory/rooms", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        const nextRooms = response.ok && Array.isArray(payload?.rooms) ? payload.rooms as FactoryRoom[] : [];
        setRooms(nextRooms);
        if (nextRooms.length) setRoomId(nextRooms[0].roomId);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRooms();
    return () => { cancelled = true; };
  }, []);

  async function refresh() {
    if (!roomId || checking) return;
    setChecking(true);
    try {
      const response = await fetch(`/api/room-factory/work-status?roomId=${encodeURIComponent(roomId)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      setStatus({ httpStatus: response.status, ...payload });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (roomId) void refresh();
    // refresh is intentionally triggered by room selection only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const data = status && typeof status === "object" ? status as Record<string, any> : {};
  const lanes = Array.isArray(data.lanes) ? data.lanes : [];
  const resume = data.resume && typeof data.resume === "object" ? data.resume : {};

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-[var(--gold)]/35 bg-black/25 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">Room Factory V1 · Durable Resume Status</p>
        <h1 className="mt-2 text-3xl font-semibold">Persistent Work / Lane / Lock Status</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Read-only Host view. It reconstructs progress from the database, so you can close the browser and later see the latest persisted Factory Work state. This screen performs no AI execution, code write, merge or deployment.</p>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold">Factory-created Room</label>
            <select className="rc-input" value={roomId} onChange={(event) => setRoomId(event.target.value)} disabled={loading || checking}>
              {!rooms.length && <option value="">{loading ? "Loading…" : "No Factory-created Rooms found"}</option>}
              {rooms.map((room) => <option key={room.roomId} value={room.roomId}>{room.name} · {room.countryCode} · {room.templateId}</option>)}
            </select>
          </div>
          <button type="button" className="rc-btn rc-btn-primary" onClick={refresh} disabled={!roomId || checking}>{checking ? "Refreshing…" : "Refresh Host Status"}</button>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs uppercase tracking-wider text-white/50">Overall</div>
            <div className="mt-2 text-xl font-semibold">{String(resume.overallStatus || "UNKNOWN")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs uppercase tracking-wider text-white/50">Next Action</div>
            <div className="mt-2 text-sm font-semibold">{String(resume.nextAction || "UNKNOWN")}</div>
            <div className="mt-1 text-xs text-white/50">Lane: {String(resume.nextLaneId ?? "none")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs uppercase tracking-wider text-white/50">Latest Work</div>
            <div className="mt-2 break-all text-sm font-semibold">{String(data.latestWork?.work_id || "Not started")}</div>
            <div className="mt-1 text-xs text-white/50">Active locks: {Array.isArray(data.activeLocks) ? data.activeLocks.length : 0}</div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="mb-3 text-sm font-semibold text-[var(--gold-soft)]">Work Lanes</div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {lanes.map((lane: any) => (
              <div key={String(lane.lane_id)} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-xs font-semibold uppercase">{String(lane.lane_id)}</div>
                <div className="mt-2 text-sm">{String(lane.status)}</div>
                <div className="mt-1 text-[11px] text-white/50">Rework: {Number(lane.rework_round || 0)}</div>
                <div className="text-[11px] text-white/50">Evidence: {lane.evidence && Object.keys(lane.evidence).length ? "YES" : "NO"}</div>
              </div>
            ))}
            {!lanes.length && <div className="text-xs text-white/50">No Factory Work Lanes yet.</div>}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="mb-2 text-sm font-semibold text-[var(--gold-soft)]">Authoritative Host Snapshot</div>
          <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/70">{status ? JSON.stringify(status, null, 2) : "No status loaded."}</pre>
        </section>
      </div>
    </main>
  );
}
