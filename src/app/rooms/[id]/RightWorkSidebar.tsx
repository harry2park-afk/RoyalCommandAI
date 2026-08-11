"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react";

type Task = { id: string; text: string; done: boolean };

const MIN_WIDTH = 12;
const DEFAULT_WIDTH = 300;
const MAX_WIDTH = 520;

export default function RightWorkSidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [text, setText] = useState("");
  const dragging = useRef(false);
  const previousExpandedWidth = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    try {
      const savedWidth = Number(window.localStorage.getItem("royalcommand:right-sidebar-width"));
      const savedCollapsed = window.localStorage.getItem("royalcommand:right-sidebar-collapsed") === "1";
      const savedTasks = window.localStorage.getItem("royalcommand:right-sidebar-tasks");
      if (Number.isFinite(savedWidth) && savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH) {
        setWidth(savedWidth);
        if (savedWidth > 80) previousExpandedWidth.current = savedWidth;
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
    function onMove(event: MouseEvent) {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - event.clientX));
      setCollapsed(false);
      setWidth(next);
      if (next > 80) previousExpandedWidth.current = next;
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
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

  function startResize(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function toggleCollapsed() {
    const next = !collapsed;
    if (next) {
      if (width > 80) previousExpandedWidth.current = width;
      setCollapsed(true);
    } else {
      setCollapsed(false);
      setWidth(Math.max(180, previousExpandedWidth.current));
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

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggleCollapsed}
        className="fixed right-0 top-1/2 z-40 flex h-12 w-5 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-white/10 bg-black/80 text-[var(--muted)] hover:text-[var(--gold-soft)]"
        title="할 일 보드 열기"
        aria-label="할 일 보드 열기"
      >
        <ChevronLeft size={13} />
      </button>
    );
  }

  return (
    <aside
      className="relative hidden shrink-0 border-l border-white/10 bg-black/20 lg:flex lg:min-h-screen lg:flex-col"
      style={{ width }}
    >
      <button
        type="button"
        onMouseDown={startResize}
        onDoubleClick={toggleCollapsed}
        className="absolute left-0 top-0 z-20 flex h-full w-3 -translate-x-1/2 cursor-col-resize items-center justify-center"
        title="좌우로 끌어서 폭 조절 · 더블클릭하면 숨김"
        aria-label="할 일 보드 폭 조절"
      >
        <GripVertical size={14} className="text-white/30" />
      </button>

      <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
        <div className="text-sm font-semibold text-[var(--gold-soft)]">할 일 · 지시 보드</div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="rounded-md p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-[var(--gold-soft)]"
          title="오른쪽 보드 숨기기"
          aria-label="오른쪽 보드 숨기기"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <form onSubmit={addTask} className="border-b border-white/10 p-2">
        <div className="flex gap-1.5">
          <input
            className="rc-input min-w-0 flex-1 !py-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="할 일 또는 지시 입력"
          />
          <button type="submit" className="rounded-lg border border-white/10 px-2 text-[var(--gold-soft)]" title="추가">
            <Plus size={16} />
          </button>
        </div>
      </form>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))}
              className="mt-1"
            />
            <div className={`min-w-0 flex-1 break-words text-sm ${task.done ? "line-through opacity-50" : ""}`}>{task.text}</div>
            <button
              type="button"
              onClick={() => setTasks((prev) => prev.filter((item) => item.id !== task.id))}
              className="rounded-md p-1 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300"
              title="삭제"
              aria-label="할 일 삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {tasks.length === 0 ? <p className="p-2 text-xs text-[var(--muted)]">여기에 할 일과 지시사항을 계속 적어둘 수 있습니다.</p> : null}
      </div>
    </aside>
  );
}
