"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { WorkState } from "@/lib/website-studio/contract";
import type { Design } from "@/lib/website-studio/executor";

export type StudioWorkHandle = { start: (order: string) => Promise<void> };
type Props = { roomId: string; userId: string; slots: string[]; language: string; connection: (id: string) => string };
type LocalWork = { requestKey: string; order: string; state?: WorkState; design?: Design; stopped?: boolean };
const workers = [
  { id: "astra", name: "Astra Light", role: "Design · Read-only", stages: ["design"] },
  { id: "codex", name: "Codex", role: "Sole Writer", stages: ["write"] },
  { id: "github", name: "GitHub", role: "Host Tool", stages: ["diff", "publish"] },
  { id: "vercel", name: "Vercel", role: "Preview Tool", stages: ["preview"] },
];

export default forwardRef<StudioWorkHandle, Props>(function StudioWorkPanels({ roomId, userId, slots, language, connection }, ref) {
  const [work, setWork] = useState<LocalWork | null>(null);
  const [error, setError] = useState("");
  const executing = useRef(false);
  const alive = useRef(true);
  const key = `royalcommand:user:${userId}:room:${roomId}:studio-work-v1`;
  const ko = language.toLowerCase().startsWith("ko");
  const save = (value: LocalWork) => { localStorage.setItem(key, JSON.stringify(value)); setWork(value); };

  async function run(initial: LocalWork) {
    if (executing.current) return;
    executing.current = true; setError("");
    let current = initial;
    try {
      while (alive.current && (!current.state || current.state.status === "waiting")) {
        const response = await fetch("/api/website-studio/work", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, requestKey: current.requestKey, order: current.order, workId: current.state?.workId, designVersion: current.state?.designVersion, baseSha: current.state?.baseSha, design: current.design }),
        });
        const result = await response.json().catch(() => ({ error: `HOST_HTTP_${response.status}` }));
        if (!response.ok) throw new Error(result.error || "WORK_FAILED");
        current = { ...current, state: result.state, design: result.design || current.design }; save(current);
        if (current.state?.stage === "preview" && current.state.status === "waiting") await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "WORK_FAILED");
      save({ ...current, stopped: true });
      const response = await fetch(`/api/website-studio/work?roomId=${roomId}`).catch(() => null);
      const result = response?.ok ? await response.json().catch(() => null) : null;
      if (result?.state) save({ ...current, stopped: true, state: result.state });
    } finally { executing.current = false; }
  }
  useImperativeHandle(ref, () => ({ async start(order) {
    if (executing.current) throw new Error(ko ? "작업이 진행 중입니다." : "A work is already running.");
    if (!["astra", "codex", "github"].every((id) => slots.includes(id))) throw new Error(ko ? "AI Warehouse에서 Codex, Astra Light, GitHub를 추가하세요." : "Add Codex, Astra Light and GitHub in AI Warehouse.");
    const next = { requestKey: crypto.randomUUID(), order }; save(next); await run(next);
  } }));
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    void (async () => {
      const stored = localStorage.getItem(key);
      let local: LocalWork | null = null;
      try { local = stored ? JSON.parse(stored) as LocalWork : null; } catch { /* An invalid local cache never changes server authority. */ }
      const response = await fetch(`/api/website-studio/work?roomId=${roomId}`).catch(() => null);
      const result = response?.ok ? await response.json() : null;
      if (cancelled) return;
      if (local && result?.state?.workId === local.state?.workId) {
        local = { ...local, state: result.state }; save(local);
        if (local.state?.status === "waiting") void run(local);
      } else if (result?.state) setWork({ requestKey: "", order: "", state: result.state });
    })();
    return () => { cancelled = true; alive.current = false; };
    // Work ownership and persistence are scoped to the authenticated user/Room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, roomId]);
  useEffect(() => {
    let cancelled = false;
    let checking = false;
    const timer = setInterval(async () => {
      if (checking) return;
      const stored = localStorage.getItem(key);
      let local: LocalWork | null = null;
      try { local = stored ? JSON.parse(stored) as LocalWork : null; } catch { return; }
      if (!local || local.stopped || local.state?.status === "passed" || local.state?.status === "failed") return;
      checking = true;
      try {
        const response = await fetch(`/api/website-studio/work?roomId=${roomId}`);
        if (!response.ok || cancelled) return;
        const result = await response.json();
        if (!result.state || (local.state && local.state.workId !== result.state.workId)) return;
        setWork({ ...local, state: result.state });
        if (!executing.current && result.state.status === "waiting") void run({ ...local, state: result.state });
      } finally { checking = false; }
    }, 2000);
    return () => { cancelled = true; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, roomId]);
  const state = work?.state;
  return <section aria-label={ko ? "Website Studio 작업자" : "Website Studio specialists"} className="my-4 grid grid-cols-1 gap-3 md:grid-cols-2">
    {workers.map((worker) => {
      const passed = worker.stages.every((stage) => state?.passed.includes(stage as WorkState["stage"]));
      const active = worker.stages.includes(state?.stage || "");
      const status = passed ? (ko ? "통과" : "Passed") : active && state?.status === "failed" ? (ko ? "실패" : "Failed") : active && state?.status === "running" ? (ko ? "작업 중" : "Working") : (ko ? "대기" : "Waiting");
      return <details key={worker.id} data-studio-worker={worker.id} open={slots.includes(worker.id)} className="rounded-xl border border-yellow-500/30 bg-slate-950/60 p-3">
        <summary className="cursor-pointer font-semibold text-yellow-100">{worker.name} <span className="text-sm font-normal text-slate-300">{status}</span></summary>
        <div className="mt-2 text-sm text-slate-300">{worker.role}</div>
        <div className="text-xs text-slate-400">{ko ? "등록됨" : "Registered"} · {connection(worker.id)} · {ko ? "창 열림" : "Window open"}</div>
        {worker.id === "astra" && work?.design && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{work.design.summary}</p>}
        {worker.id === "github" && state?.commitSha && <code className="mt-2 block break-all text-xs text-slate-300">{state.commitSha}</code>}
        {worker.id === "vercel" && state?.previewUrl && <a className="text-sm text-yellow-200 underline" href={state.previewUrl} target="_blank" rel="noreferrer">Preview</a>}
      </details>;
    })}
    {(error || state?.errorCode) && <p role="alert" className="text-sm text-red-300">{error || state?.errorCode}</p>}
    {state && <p className="break-all text-xs text-slate-400">{state.workId} · v{state.designVersion}</p>}
  </section>;
});
