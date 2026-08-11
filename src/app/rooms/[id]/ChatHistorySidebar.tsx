"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, Trash2 } from "lucide-react";

type Room = { id: string; name: string };

const MIN_WIDTH = 56;
const DEFAULT_WIDTH = 240;
const MAX_WIDTH = 420;

export default function ChatHistorySidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentId = pathname.split("/").filter(Boolean).pop() || "";
  const [rooms, setRooms] = useState<Room[]>([]);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const previousExpandedWidth = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rooms", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && Array.isArray(data.rooms)) setRooms(data.rooms);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const savedWidth = Number(window.localStorage.getItem("royalcommand:chat-sidebar-width"));
      const savedCollapsed = window.localStorage.getItem("royalcommand:chat-sidebar-collapsed") === "1";
      if (Number.isFinite(savedWidth) && savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH) {
        setWidth(savedWidth);
        if (savedWidth > MIN_WIDTH) previousExpandedWidth.current = savedWidth;
      }
      setCollapsed(savedCollapsed);
    } catch {
      // Keep defaults if browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX));
      setCollapsed(false);
      setWidth(next);
      if (next > MIN_WIDTH + 20) previousExpandedWidth.current = next;
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        window.localStorage.setItem("royalcommand:chat-sidebar-width", String(width));
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
    const nextCollapsed = !collapsed;
    if (nextCollapsed) {
      if (width > MIN_WIDTH + 20) previousExpandedWidth.current = width;
      setCollapsed(true);
    } else {
      setCollapsed(false);
      setWidth(Math.max(180, previousExpandedWidth.current));
    }
    try {
      window.localStorage.setItem("royalcommand:chat-sidebar-collapsed", nextCollapsed ? "1" : "0");
    } catch {
      // Ignore storage failure.
    }
  }

  async function removeRoom(id: string) {
    if (!window.confirm("이 채팅을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setRooms((prev) => prev.filter((room) => room.id !== id));
    if (id === currentId) router.push("/dashboard");
  }

  const actualWidth = collapsed ? 28 : width;

  return (
    <aside
      className="relative hidden shrink-0 border-r border-white/10 bg-black/20 lg:flex lg:min-h-screen lg:flex-col"
      style={{ width: actualWidth }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-2 py-2">
        {!collapsed ? <div className="text-sm font-semibold text-[var(--gold-soft)]">채팅 목록</div> : null}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="ml-auto rounded-md p-1.5 text-[var(--muted)] hover:bg-white/5 hover:text-[var(--gold-soft)]"
          title={collapsed ? "채팅 목록 열기" : "채팅 목록 숨기기"}
          aria-label={collapsed ? "채팅 목록 열기" : "채팅 목록 숨기기"}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {!collapsed ? (
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`group flex items-center rounded-lg border ${room.id === currentId ? "border-[var(--gold)]/60 bg-[var(--gold)]/10" : "border-transparent hover:bg-white/[0.03]"}`}
            >
              <Link
                href={`/rooms/${room.id}`}
                className="min-w-0 flex-1 truncate px-3 py-2 text-sm"
                title={room.name}
              >
                {room.name}
              </Link>
              <button
                type="button"
                onClick={() => void removeRoom(room.id)}
                className="mr-1 rounded-md p-1.5 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300"
                title="채팅 삭제"
                aria-label={`${room.name} 삭제`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {!collapsed ? (
        <button
          type="button"
          onMouseDown={startResize}
          className="absolute right-0 top-0 z-20 flex h-full w-3 translate-x-1/2 cursor-col-resize items-center justify-center"
          title="좌우로 끌어서 채팅 목록 폭 조절"
          aria-label="채팅 목록 폭 조절"
        >
          <GripVertical size={14} className="text-white/30" />
        </button>
      ) : null}
    </aside>
  );
}
