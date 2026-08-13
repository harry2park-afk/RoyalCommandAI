"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Code2, GripVertical, Plus, Trash2 } from "lucide-react";

type Task = { id: string; text: string; done: boolean };
type DevAction = {
  path: string;
  operation: "create" | "update" | "delete";
  content?: string;
  reason?: string;
};
type DevStatus = {
  developer: boolean;
  geminiConfigured: boolean;
  githubConfigured: boolean;
  developerAccessConfigured: boolean;
  repo?: string;
  branch?: string;
};

const MIN_WIDTH = 0;
const DEFAULT_WIDTH = 320;
const MAX_WIDTH = 560;
const AUTO_COLLAPSE_AT = 64;

export default function RightWorkSidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [text, setText] = useState("");
  const [devInstruction, setDevInstruction] = useState("");
  const [devSummary, setDevSummary] = useState("");
  const [devActions, setDevActions] = useState<DevAction[]>([]);
  const [devBusy, setDevBusy] = useState(false);
  const [devError, setDevError] = useState("");
  const [devStatus, setDevStatus] = useState<DevStatus | null>(null);
  const dragging = useRef(false);
  const previousExpandedWidth = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    try {
      const savedWidth = Number(window.localStorage.getItem("royalcommand:right-sidebar-width"));
      const savedCollapsed = window.localStorage.getItem("royalcommand:right-sidebar-collapsed") === "1";
      const savedTasks = window.localStorage.getItem("royalcommand:right-sidebar-tasks");
      if (Number.isFinite(savedWidth) && savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH) {
        setWidth(savedWidth);
        if (savedWidth > 100) previousExpandedWidth.current = savedWidth;
      }
      setCollapsed(savedCollapsed);
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        if (Array.isArray(parsed)) setTasks(parsed);
      }
    } catch {
      // Keep safe defaults if browser storage is unavailable or invalid.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("royalcommand:right-sidebar-tasks", JSON.stringify(tasks));
    } catch {
      // Ignore storage failure.
    }
  }, [tasks]);

  useEffect(() => {
    void loadDevStatus();
  }, []);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - event.clientX));
      setWidth(next);
      if (next > 100) previousExpandedWidth.current = next;
    }

    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (width <= AUTO_COLLAPSE_AT) {
        setCollapsed(true);
        try {
          window.localStorage.setItem("royalcommand:right-sidebar-collapsed", "1");
        } catch {
          // Ignore storage failure.
        }
        return;
      }

      try {
        window.localStorage.setItem("royalcommand:right-sidebar-width", String(width));
      } catch {
        // Ignore storage failure.
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [width]);

  async function loadDevStatus() {
    try {
      const res = await fetch("/api/dev/gemini", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setDevStatus(data);
    } catch {
      // The status card will simply remain unavailable.
    }
  }

  function startResize(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function toggleCollapsed() {
    const next = !collapsed;
    if (next) {
      if (width > 100) previousExpandedWidth.current = width;
      setCollapsed(true);
    } else {
      setCollapsed(false);
      setWidth(Math.max(240, previousExpandedWidth.current));
    }
    try {
      window.localStorage.setItem("royalcommand:right-sidebar-collapsed", next ? "1" : "0");
    } catch {
      // Ignore storage failure.
    }
  }

  function addTask(e: FormEvent) {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    setTasks((prev) => [{ id: `${Date.now()}`, text: clean, done: false }, ...prev]);
    setText("");
  }

  async function askGeminiDev() {
    const instruction = devInstruction.trim();
    if (!instruction || devBusy) return;
    setDevBusy(true);
    setDevError("");
    setDevSummary("");
    setDevActions([]);
    try {
      const res = await fetch("/api/dev/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gemini development review failed");
      setDevSummary(data.summary || "변경안을 준비했습니다.");
      setDevActions(Array.isArray(data.actions) ? data.actions : []);
      void loadDevStatus();
    } catch (error) {
      setDevError(error instanceof Error ? error.message : "Gemini development review failed");
    } finally {
      setDevBusy(false);
    }
  }

  async function executeGeminiDev() {
    if (!devActions.length || !devInstruction.trim() || devBusy) return;
    setDevBusy(true);
    setDevError("");
    try {
      const res = await fetch("/api/dev/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: devInstruction.trim(), execute: true, actions: devActions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gemini development execution failed");
      const ids = Array.isArray(data.commits)
        ? data.commits.map((commit: { commit?: string }) => commit.commit?.slice(0, 8)).filter(Boolean).join(", ")
        : "";
      setDevSummary(`Gemini 수정 및 GitHub Commit 완료${ids ? ` · ${ids}` : ""}`);
      setDevActions([]);
      void loadDevStatus();
    } catch (error) {
      setDevError(error instanceof Error ? error.message : "Gemini development execution failed");
    } finally {
      setDevBusy(false);
    }
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggleCollapsed}
        className="fixed right-0 top-1/2 z-50 flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10"
        title="할 일 보드 열기"
        aria-label="할 일 보드 열기"
      >
        <ChevronLeft size={22} />
      </button>
    );
  }

  const compact = width < 150;

  return (
    <aside
      className="relative hidden shrink-0 overflow-hidden border-l border-white/10 bg-black/20 lg:flex lg:min-h-screen lg:flex-col"
      style={{ width }}
    >
      <button
        type="button"
        onMouseDown={startResize}
        onDoubleClick={toggleCollapsed}
        className="absolute left-0 top-0 z-20 flex h-full w-3 -translate-x-1/2 cursor-col-resize items-center justify-center"
        title="좌우로 끌어서 폭 조절 · 아주 좁히면 자동으로 숨김"
        aria-label="할 일 보드 폭 조절"
      >
        <GripVertical size={14} className="text-white/30" />
      </button>

      <button
        type="button"
        onClick={toggleCollapsed}
        className="absolute left-0 top-1/2 z-40 flex h-16 w-9 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10"
        title="오른쪽 보드 완전히 숨기기"
        aria-label="오른쪽 보드 완전히 숨기기"
      >
        <ChevronRight size={22} />
      </button>

      {!compact ? (
        <>
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
            <div className="truncate text-sm font-semibold text-[var(--gold-soft)]">할 일 · 지시 보드</div>
          </div>

          <form onSubmit={addTask} className="border-b border-white/10 p-2">
            <div className="flex min-w-0 gap-1.5">
              <input
                className="rc-input min-w-0 flex-1 !py-2 text-sm"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="할 일 또는 지시 입력"
              />
              <button type="submit" className="shrink-0 rounded-lg border border-white/10 px-2 text-[var(--gold-soft)]" title="추가">
                <Plus size={16} />
              </button>
            </div>
          </form>

          <div className="max-h-[32vh] flex-1 space-y-2 overflow-y-auto p-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex min-w-0 items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))}
                  className="mt-1 shrink-0"
                />
                <div className={`min-w-0 flex-1 break-words text-sm ${task.done ? "line-through opacity-50" : ""}`}>{task.text}</div>
                <button
                  type="button"
                  onClick={() => setTasks((prev) => prev.filter((item) => item.id !== task.id))}
                  className="shrink-0 rounded-md p-1 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300"
                  title="삭제"
                  aria-label="할 일 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {tasks.length === 0 ? <p className="p-2 text-xs text-[var(--muted)]">여기에 할 일과 지시사항을 계속 적어둘 수 있습니다.</p> : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/10 p-2">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--gold-soft)]">
              <Code2 size={16} /> Gemini 개발 Agent
            </div>

            {devStatus ? (
              <div className="mb-2 rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] leading-5 text-[var(--muted)]">
                <div>Gemini API: <span className={devStatus.geminiConfigured ? "text-emerald-300" : "text-red-300"}>{devStatus.geminiConfigured ? "연결" : "미연결"}</span></div>
                <div>GitHub 실행: <span className={devStatus.githubConfigured ? "text-emerald-300" : "text-red-300"}>{devStatus.githubConfigured ? "연결" : "GITHUB_TOKEN 필요"}</span></div>
                <div>개발자 권한: <span className={devStatus.developer ? "text-emerald-300" : "text-amber-300"}>{devStatus.developer ? "허용" : "ROYAL_COMMAND_DEV_EMAILS 확인 필요"}</span></div>
                {devStatus.repo ? <div className="truncate">저장소: {devStatus.repo} · {devStatus.branch}</div> : null}
              </div>
            ) : null}

            <textarea
              value={devInstruction}
              onChange={(e) => setDevInstruction(e.target.value)}
              rows={4}
              placeholder="예: 화면을 점검해서 문제를 직접 수정하고 필요한 파일도 만들어줘"
              className="rc-input w-full resize-y !py-2 text-xs"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={askGeminiDev}
                disabled={devBusy || !devInstruction.trim()}
                className="flex-1 rounded-lg border border-white/10 px-2 py-2 text-xs font-semibold disabled:opacity-40"
              >
                {devBusy ? "작업 중…" : "Gemini 작업 준비"}
              </button>
              <button
                type="button"
                onClick={executeGeminiDev}
                disabled={devBusy || !devActions.length}
                className="flex-1 rounded-lg bg-[var(--gold-soft)] px-2 py-2 text-xs font-semibold text-black disabled:opacity-40"
              >
                승인 실행
              </button>
            </div>

            {devSummary ? <p className="mt-2 whitespace-pre-wrap text-xs text-emerald-300">{devSummary}</p> : null}
            {devActions.length ? (
              <div className="mt-2 space-y-1 rounded-lg border border-white/10 p-2 text-[11px] text-[var(--muted)]">
                {devActions.map((action, index) => (
                  <div key={`${action.path}-${index}`} className="break-words">
                    <span className="font-semibold text-white/80">{action.operation.toUpperCase()}</span> · {action.path}
                    {action.reason ? <span> — {action.reason}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
            {devError ? <p className="mt-2 whitespace-pre-wrap text-xs text-red-300">{devError}</p> : null}
          </div>
        </>
      ) : null}
    </aside>
  );
}
