"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";

const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 220;
const MAX_WIDTH = 520;

export default function RightWorkSidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const previousWidth = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    try {
      const savedWidth = Number(window.localStorage.getItem("royalcommand:right-panel-width") || DEFAULT_WIDTH);
      const savedCollapsed = window.localStorage.getItem("royalcommand:right-panel-collapsed") === "1";
      if (Number.isFinite(savedWidth)) {
        const safe = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, savedWidth));
        setWidth(safe);
        previousWidth.current = safe;
      }
      setCollapsed(savedCollapsed);
    } catch {}
  }, []);

  useEffect(() => {
    function move(event: MouseEvent) {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - event.clientX));
      setWidth(next);
      previousWidth.current = next;
    }

    function up() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        window.localStorage.setItem("royalcommand:right-panel-width", String(previousWidth.current));
      } catch {}
    }

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  function startResize(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem("royalcommand:right-panel-collapsed", next ? "1" : "0");
    } catch {}
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="fixed right-0 top-1/2 z-[100] flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-white/20 bg-[#07111f] text-[var(--gold-soft)] shadow-xl"
        title="오른쪽 작업 패널 열기"
        aria-label="오른쪽 작업 패널 열기"
      >
        <ChevronLeft size={22} />
      </button>
    );
  }

  return (
    <aside
      className="relative z-40 flex min-h-screen shrink-0 flex-col border-l border-white/10 bg-[#07111f]"
      style={{ width }}
    >
      <button
        type="button"
        onMouseDown={startResize}
        className="absolute left-0 top-0 z-50 flex h-full w-4 -translate-x-1/2 cursor-col-resize items-center justify-center"
        title="좌우로 끌어서 폭 조절"
        aria-label="오른쪽 작업 패널 폭 조절"
      >
        <GripVertical size={15} className="text-white/40" />
      </button>

      <button
        type="button"
        onClick={toggle}
        className="absolute left-0 top-1/2 z-50 flex h-16 w-9 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-white/20 bg-[#07111f] text-[var(--gold-soft)] shadow-xl"
        title="오른쪽 작업 패널 닫기"
        aria-label="오른쪽 작업 패널 닫기"
      >
        <ChevronRight size={22} />
      </button>

      <div className="border-b border-white/10 px-4 py-4">
        <div className="text-sm font-semibold text-[var(--gold-soft)]">작업 패널</div>
        <div className="mt-1 text-xs text-[var(--muted)]">필요할 때 열고, 안 쓸 때 닫으세요.</div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        <button type="button" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left text-sm hover:bg-white/5">AI Agents</button>
        <button type="button" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left text-sm hover:bg-white/5">Files</button>
        <button type="button" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left text-sm hover:bg-white/5">Tasks</button>
        <button type="button" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left text-sm hover:bg-white/5">Automation</button>
        <button type="button" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left text-sm hover:bg-white/5">Approval</button>
      </div>
    </aside>
  );
}
