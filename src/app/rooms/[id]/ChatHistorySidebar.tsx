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
  created_at?: string;
  createdAt?: string;
};
type HistoryBox = { ids: string[]; title: string; preview: string; date: string };

const MIN_WIDTH = 12;
const DEFAULT_WIDTH = 240;
const MAX_WIDTH = 420;
const SESSION_GAP_MS = 60 * 60 * 1000;

export default function ChatHistorySidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentId = pathname.split("/").filter(Boolean).pop() || "";
  const [rooms, setRooms] = useState<Room[]>([]);
  const [historyBoxes, setHistoryBoxes] = useState<HistoryBox[]>([]);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const dragging = useRef(false);
  const previousExpandedWidth = useRef(DEFAULT_WIDTH);
  const messageOrderRef = useRef<string[]>([]);
  const messageTypesRef = useRef<string[]>([]);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function historyCacheKey() { return `royalcommand:room:${currentId}:history-boxes-v2`; }
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

  function getMessageTime(message: Message): number | null {
    const raw = message.created_at || message.createdAt;
    if (!raw) return null;
    const value = new Date(raw).getTime();
    return Number.isFinite(value) ? value : null;
  }

  function formatHistoryDate(time: number | null) {
    const date = time ? new Date(time) : new Date();
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function buildHistory(messages: Message[]) {
    messageOrderRef.current = messages.map((m) => m.id);
    messageTypesRef.current = messages.map((m) => m.authorType || m.author_type || "");

    const boxes: HistoryBox[] = [];
    let current: HistoryBox | null = null;
    let lastMessageTime: number | null = null;

    for (const message of messages) {
      const type = message.authorType || message.author_type || "";
      const messageTime = getMessageTime(message);
      const hasLongGap =
        current &&
        lastMessageTime !== null &&
        messageTime !== null &&
        messageTime - lastMessageTime > SESSION_GAP_MS;

      if (hasLongGap && current) {
        boxes.push(current);
        current = null;
      }

      if (type === "user") {
        const clean = message.content.replace(/\s+/g, " ").trim();

        if (!current) {
          current = {
            ids: [message.id],
            title: clean.slice(0, 34) || "지난 대화",
            preview: clean.slice(0, 90),
            date: formatHistoryDate(messageTime),
          };
        } else {
          current.ids.push(message.id);
          current.preview = clean.slice(0, 90) || current.preview;
        }
      } else if (current) {
        current.ids.push(message.id);
      }

      if (messageTime !== null) lastMessageTime = messageTime;
    }

    if (current) boxes.push(current);
    return boxes.reverse();
  }

  function getMessageContainer(): HTMLElement | null {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>("main div"));
    return candidates.find((el) => typeof el.className === "string" && el.className.includes("space-y-4") && el.className.includes("overflow-y-auto")) || null;
  }
  function applyMainView(ids: string[] | null) {
    const container = getMessageContainer();
    if (!container) return;
    const order = messageOrderRef.current;
    const types = messageTypesRef.current;
    const children = Array.from(container.children) as HTMLElement[];
    const wanted = ids ? new Set(ids) : null;
    let latestUserIndex = -1;
    if (!wanted) {
      for (let i = types.length - 1; i >= 0; i -= 1) if (types[i] === "user") { latestUserIndex = i; break; }
    }
    children.forEach((child, index) => {
      if (index >= order.length) { child.style.display = ""; return; }
      const visible = wanted ? wanted.has(order[index]) : latestUserIndex < 0 || index >= latestUserIndex;
      child.style.display = visible ? "" : "none";
    });
  }
  function openHistoryBox(box: HistoryBox) { setSelectedBoxId(box.ids[0] || null); applyMainView(box.ids); }
  function showLatestConversation() { setSelectedBoxId(null); applyMainView(null); }

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
      setHistoryBoxes(next);
      saveHistoryCache(next);
      setHistoryLoaded(true);
      window.setTimeout(() => {
        if (selectedBoxId) {
          const selected = next.find((box) => box.ids[0] === selectedBoxId);
          if (selected) applyMainView(selected.ids); else showLatestConversation();
        } else applyMainView(null);
      }, 60);
    } catch {}
  }

  useEffect(() => {
    void loadRooms();
    const cached = readHistoryCache();
    setHistoryBoxes(cached);
    setHistoryLoaded(cached.length > 0);
    void refreshHistory();
    return () => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); };
  }, [currentId]);

  useEffect(() => {
    const observer = new MutationObserver(() => window.setTimeout(() => {
      if (selectedBoxId) {
        const selected = historyBoxes.find((box) => box.ids[0] === selectedBoxId);
        if (selected) applyMainView(selected.ids);
      } else applyMainView(null);
    }, 0));
    const main = document.querySelector("main");
    if (main) observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selectedBoxId, historyBoxes]);

  useEffect(() => {
    try {
      const savedWidth = Number(window.localStorage.getItem("royalcommand:chat-sidebar-width"));
      const savedCollapsed = window.localStorage.getItem("royalcommand:chat-sidebar-collapsed") === "1";
      if (Number.isFinite(savedWidth) && savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH) {
        setWidth(savedWidth); if (savedWidth > 80) previousExpandedWidth.current = savedWidth;
      }
      setCollapsed(savedCollapsed);
    } catch {}
  }, []);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX));
      setCollapsed(false); setWidth(next); if (next > 80) previousExpandedWidth.current = next;
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false; document.body.style.cursor = ""; document.body.style.userSelect = "";
      try { window.localStorage.setItem("royalcommand:chat-sidebar-width", String(width)); } catch {}
    }
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [width]);

  function startResize(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault(); dragging.current = true; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
  }
  function toggleCollapsed() {
    const nextCollapsed = !collapsed;
    if (nextCollapsed) { if (width > 80) previousExpandedWidth.current = width; setCollapsed(true); }
    else { setCollapsed(false); setWidth(Math.max(180, previousExpandedWidth.current)); }
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
    const nextLocal = historyBoxes.filter((item) => item.ids[0] !== box.ids[0]);
    setHistoryBoxes(nextLocal);
    saveHistoryCache(nextLocal);
    if (selectedBoxId === box.ids[0]) showLatestConversation();

    try {
      const res = await fetch(`/api/rooms/${currentId}/messages`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: box.ids }),
      });
      if (!res.ok) {
        setHistoryBoxes(historyBoxes);
        saveHistoryCache(historyBoxes);
        return;
      }
      saveHistoryCache(nextLocal);
      window.location.reload();
    } catch {
      setHistoryBoxes(historyBoxes);
      saveHistoryCache(historyBoxes);
    }
  }

  function handleBoxClick(box: HistoryBox) {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => { openHistoryBox(box); clickTimerRef.current = null; }, 320);
  }
  function handleBoxDoubleClick(event: React.MouseEvent, box: HistoryBox) {
    event.preventDefault(); event.stopPropagation();
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
    void removeHistoryBox(box);
  }

  if (collapsed) return (
    <button type="button" onClick={toggleCollapsed} className="fixed left-0 top-1/2 z-50 flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10" title="왼쪽 채팅 목록 열기"><ChevronRight size={22} /></button>
  );

  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 self-start overflow-visible border-r border-white/10 bg-black/20 lg:flex lg:flex-col" style={{ width }}>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div className="space-y-1">
          {historyBoxes.map((box, index) => (
            <div key={`${box.ids[0]}-${index}`} onClick={() => handleBoxClick(box)} onDoubleClick={(event) => handleBoxDoubleClick(event, box)} className={`flex h-9 cursor-pointer items-center gap-1 rounded-lg border px-2 ${selectedBoxId === box.ids[0] ? "border-[var(--gold)]/70 bg-[var(--gold)]/10" : "border-white/10 bg-black/20"}`} title={`${box.date} · ${box.title} · 한 번 클릭: 보기 · 더블클릭: 즉시 삭제`}>
              <div className="min-w-0 flex flex-1 items-center gap-1.5 text-left">
                <span className="shrink-0 text-[9px] font-medium text-[var(--muted)]">{box.date}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--gold-soft)]">{box.title}</span>
              </div>
              <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void removeHistoryBox(box); }} onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation(); }} className="shrink-0 rounded-md p-1 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300" title="즉시 삭제"><Trash2 size={13} /></button>
            </div>
          ))}
          {historyLoaded && historyBoxes.length === 0 ? <p className="p-2 text-xs text-[var(--muted)]">아직 저장된 지난 대화가 없습니다.</p> : null}
          {!historyLoaded ? <p className="p-2 text-xs text-[var(--muted)]">지난 대화를 불러오는 중…</p> : null}
        </div>
        <div className="my-3 border-t border-white/10" />
        <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">채팅방</div>
        <div className="space-y-1">{rooms.map((room) => <div key={room.id} className={`group flex items-center rounded-lg border ${room.id === currentId ? "border-[var(--gold)]/60 bg-[var(--gold)]/10" : "border-transparent hover:bg-white/[0.03]"}`}><Link href={`/rooms/${room.id}`} className="min-w-0 flex-1 truncate px-3 py-2 text-sm">{room.name}</Link><button type="button" onClick={() => void removeRoom(room.id)} className="mr-1 rounded-md p-1.5 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300"><Trash2 size={14} /></button></div>)}</div>
      </div>
      <button type="button" onMouseDown={startResize} onDoubleClick={toggleCollapsed} className="absolute right-0 top-0 z-30 flex h-full w-3 translate-x-1/2 cursor-col-resize items-center justify-center"><GripVertical size={14} className="text-white/35" /></button>
      <button type="button" onClick={toggleCollapsed} className="fixed left-0 top-1/2 z-[100] flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-white/20 bg-black/90 text-[var(--gold-soft)] shadow-lg hover:bg-white/10" title="왼쪽 채팅 목록 닫기"><ChevronLeft size={22} /></button>
    </aside>
  );
}
