"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, Trash2 } from "lucide-react";

type Room = { id: string; name: string };
type Message = {
  id: string;
  content: string;
  authorType?: string;
  author_type?: string;
};
type HistoryBox = { ids: string[]; title: string; preview: string };

const MIN_WIDTH = 12;
const DEFAULT_WIDTH = 240;
const MAX_WIDTH = 420;

export default function ChatHistorySidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentId = pathname.split("/").filter(Boolean).pop() || "";
  const [rooms, setRooms] = useState<Room[]>([]);
  const [historyBoxes, setHistoryBoxes] = useState<HistoryBox[]>([]);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const dragging = useRef(false);
  const previousExpandedWidth = useRef(DEFAULT_WIDTH);

  function historyCacheKey() {
    return `royalcommand:room:${currentId}:history-boxes`;
  }

  function saveHistoryCache(boxes: HistoryBox[]) {
    if (!currentId) return;
    try { window.localStorage.setItem(historyCacheKey(), JSON.stringify(boxes)); } catch {}
  }

  function readHistoryCache(): HistoryBox[] {
    if (!currentId) return [];
    try {
      const raw = window.localStorage.getItem(historyCacheKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function buildHistory(messages: Message[]) {
    const boxes: HistoryBox[] = [];
    let current: HistoryBox | null = null;
    for (const message of messages) {
      const type = message.authorType || message.author_type || "";
      if (type === "user") {
        if (current) boxes.push(current);
        const clean = message.content.replace(/\s+/g, " ").trim();
        current = { ids: [message.id], title: clean.slice(0, 34) || "지난 대화", preview: clean.slice(0, 90) };
      } else if (current) {
        current.ids.push(message.id);
      }
    }
    if (current) boxes.push(current);
    return boxes.reverse();
  }

  async function loadRooms() {
    try {
      const res = await fetch("/api/rooms", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.rooms)) setRooms(data.rooms);
    } catch {}
  }

  async function refreshHistory() {
    if (!currentId) return;
    try {
      const res = await fetch(`/api/rooms/${currentId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const messages: Message[] = Array.isArray(data.messages) ? data.messages : [];
      const next = buildHistory(messages);
      if (next.length > 0) {
        setHistoryBoxes(next);
        saveHistoryCache(next);
      }
      setHistoryLoaded(true);
    } catch {}
  }

  useEffect(() => {
    void loadRooms();
    const cached = readHistoryCache();
    if (cached.length > 0) {
      setHistoryBoxes(cached);
      setHistoryLoaded(true);
    } else {
      setHistoryBoxes([]);
      setHistoryLoaded(false);
      void refreshHistory();
    }

    const onChanged = () => void refreshHistory();
    window.addEventListener("royalcommand:history-changed", onChanged);
    return () => window.removeEventListener("royalcommand:history-changed", onChanged);
  }, [currentId]);

  useEffect(() => {
    try {
      const savedWidth = Number(window.localStorage.getItem("royalcommand:chat-sidebar-width"));
      const savedCollapsed = window.localStorage.getItem("royalcommand:chat-sidebar-collapsed") === "1";
      if (Number.isFinite(savedWidth) && savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH) {
        setWidth(savedWidth);
        if (savedWidth > 80) previousExpandedWidth.current = savedWidth;
      }
      setCollapsed(savedCollapsed);
    } catch {}
  }, []);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX));
      setCollapsed(false);
      setWidth(next);
      if (next > 80) previousExpandedWidth.current = next;
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try { window.localStorage.setItem("royalcommand:chat-sidebar-width", String(width)); } catch {}
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
      if (width > 80) previousExpandedWidth.current = width;
      setCollapsed(true);
    } else {
      setCollapsed(false);
      setWidth(Math.max(180, previousExpandedWidth.current));
      const cached = readHistoryCache();
      if (cached.length > 0) setHistoryBoxes(cached);
    }
    try { window.localStorage.setItem("royalcommand:chat-sidebar-collapsed", nextCollapsed ? "1" : "0"); } catch {}
  }

  async function removeRoom(id: string) {
    if (!window.confirm("이 채팅방을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setRooms((prev) => prev.filter((room) => room.id !== id));
    if (id === currentId) router.push("/dashboard");
  }

  async function removeHistoryBox(box: HistoryBox) {
    if (!window.confirm("이 지난 대화를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/rooms/${currentId}/messages`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: box.ids }),
    });
    if (!res.ok) return;
    setHistoryBoxes((prev) => {
      const next = prev.filter((item) => item !== box);
      saveHistoryCache(next);
      return next;
    });
  }

  if (collapsed) {
    return (
      <button type="button" onClick={toggleCollapsed} className="fixed left-0 top-1/2 z-50 flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10" title="왼쪽 채팅 목록 열기">
        <ChevronRight size={22} />
      </button>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 self-start overflow-visible border-r border-white/10 bg-black/20 lg:flex lg:flex-col" style={{ width }}>
      <div className="shrink-0 border-b border-white/10 px-3 py-3"><div className="text-sm font-semibold text-[var(--gold-soft)]">지난 대화</div></div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div className="space-y-2">
          {historyBoxes.map((box, index) => (
            <div key={`${box.ids[0]}-${index}`} className="flex items-start gap-1 rounded-xl border border-white/10 bg-black/20 p-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--gold-soft)]" title={box.title}>{box.title}</div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--muted)]">{box.preview}</div>
              </div>
              <button type="button" onClick={() => void removeHistoryBox(box)} className="shrink-0 rounded-md p-1.5 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300" title="지난 대화 삭제"><Trash2 size={14} /></button>
            </div>
          ))}
          {historyLoaded && historyBoxes.length === 0 ? <p className="p-2 text-xs text-[var(--muted)]">아직 저장된 지난 대화가 없습니다.</p> : null}
          {!historyLoaded ? <p className="p-2 text-xs text-[var(--muted)]">지난 대화를 불러오는 중…</p> : null}
        </div>
        <div className="my-3 border-t border-white/10" />
        <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">채팅방</div>
        <div className="space-y-1">
          {rooms.map((room) => (
            <div key={room.id} className={`group flex items-center rounded-lg border ${room.id === currentId ? "border-[var(--gold)]/60 bg-[var(--gold)]/10" : "border-transparent hover:bg-white/[0.03]"}`}>
              <Link href={`/rooms/${room.id}`} className="min-w-0 flex-1 truncate px-3 py-2 text-sm" title={room.name}>{room.name}</Link>
              <button type="button" onClick={() => void removeRoom(room.id)} className="mr-1 rounded-md p-1.5 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300" title="채팅방 삭제"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      <button type="button" onMouseDown={startResize} onDoubleClick={toggleCollapsed} className="absolute right-0 top-0 z-30 flex h-full w-3 translate-x-1/2 cursor-col-resize items-center justify-center" title="끌어서 폭 조절 · 더블클릭하면 숨기기"><GripVertical size={14} className="text-white/35" /></button>
      <button type="button" onClick={toggleCollapsed} className="absolute right-0 top-1/2 z-50 flex h-16 w-9 translate-x-full -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10" title="왼쪽 채팅 목록 완전히 숨기기">
        <ChevronLeft size={22} />
      </button>
    </aside>
  );
}
